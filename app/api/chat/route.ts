/**
 * Chat API Route
 * Main endpoint for AI streaming responses with reasoning support
 */

import { streamText, createUIMessageStream, JsonToSseTransformStream, convertToModelMessages, type UIMessage, type UIMessagePart } from 'ai';
import { NextResponse, after } from 'next/server';
import { qurse } from '@/ai/providers';
import { canUseModel, getModelParameters, getProviderOptions, getModelConfig, requiresAuthentication, requiresProSubscription } from '@/ai/models';
import { getChatMode } from '@/ai/config';
import { getToolsByIds } from '@/lib/tools';
import { createClient } from '@/lib/supabase/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { ModelAccessError, ChatModeError, StreamingError, ProviderError, ValidationError } from '@/lib/errors';
import { safeValidateChatRequest } from '@/lib/validation/chat-schema';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/error-handler';
import { sanitizeApiError } from '@/lib/utils/error-sanitizer';
import { toUIMessageFromZod, type StreamTextProviderOptions } from '@/lib/utils/message-adapters';
import { generateTitleFromUserMessage } from '@/lib/utils/convo-title-generation';
import { updateConversationTitle } from '@/lib/db/queries.server';
import { checkRateLimit } from '@/lib/services/rate-limiting';
import { ensureGuestConversation, saveGuestMessage } from '@/lib/db/messages.server';
import { hmacSessionId } from '@/lib/utils/session-hash';
import type { User } from '@/lib/types';

const logger = createScopedLogger('api/chat');

/**
 * region Helper Functions
 * Helper: Ensure conversation exists (creates if needed)
 * Optimized: Check first, then insert (faster than insert-then-select pattern)
 * Handles race conditions (duplicate key errors)
 */
async function ensureConversation(
  user: { id: string },
  conversationId: string,
  title: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  if (!conversationId || conversationId.startsWith('temp-')) {
    return conversationId;
  }

  // Optimized: Check if conversation exists FIRST (fast - single SELECT)
  // This avoids unnecessary INSERT attempts for existing conversations
  const { data: existing, error: checkError } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (checkError) {
    logger.error('Error checking conversation', checkError, { conversationId });
    throw new Error('Failed to check conversation');
  }

  // If conversation exists, verify ownership immediately (no extra query needed)
  if (existing) {
    if (existing.user_id !== user.id) {
      throw new Error('Unauthorized: conversation belongs to another user');
    }
    // Conversation exists and ownership verified - return immediately
    logger.debug('Conversation already exists', { conversationId });
    return conversationId;
  }

  // Conversation doesn't exist - create it
  const { error: insertError } = await supabase
    .from('conversations')
    .insert({
      id: conversationId,
      user_id: user.id,
      title: title,
    });

  if (insertError) {
    // Handle race condition (duplicate key - another request created it between our check and insert)
    if (insertError.code === '23505') {
      // Another request created it - verify ownership
      const { data: verify } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (!verify) {
        // Conversation doesn't exist after duplicate key error - shouldn't happen
        logger.error('Conversation not found after duplicate key error', { conversationId });
        throw new Error('Conversation creation failed');
      }

      if (verify.user_id !== user.id) {
        throw new Error('Unauthorized: conversation belongs to another user');
      }

      // Conversation created by another request - that's OK
      logger.debug('Conversation created by concurrent request', { conversationId });
    } else {
      logger.error('Failed to create conversation', insertError, { conversationId });
      throw insertError;
    }
  } else {
    logger.debug('Conversation created', { conversationId });
  }

  return conversationId;
}

/**
 * Helper: Save user message with parts array
 * Returns true if message was saved, false if skipped (early return)
 */
async function saveUserMessage(
  conversationId: string,
  userMessage: UIMessage,
  userId: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>,
  isProUserOverride?: boolean
): Promise<boolean> {
  if (!conversationId || conversationId.startsWith('temp-') || !userMessage) {
    return false;
  }

  // Extract text from parts for content field (backward compatibility)
  const messageText = userMessage.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('') || '';

  if (!messageText.trim()) {
    return false;
  }

  // Save with parts array (new format) and content (backward compatibility)
  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      parts: userMessage.parts || [{ type: 'text', text: messageText.trim() }],
      content: messageText.trim(), // Keep for backward compatibility
    });

  if (msgError) {
    logger.error('Failed to save user message', msgError, {
      conversationId,
      messageLength: messageText.length
    });
    throw new Error('Failed to save user message');
  }

  return true;
}

/**
 * POST /api/chat
 * Stream AI responses with authentication, access control, and database persistence
 */
export async function POST(req: Request) {
  const requestStartTime = Date.now();
  logger.debug('Request started');
  
  try {
    // ============================================
    // Stage 1: Fast authentication check (single getUser() call)
    // ============================================
    // Single call gets both lightweight and full user data
    // Also returns Supabase client for reuse (avoids creating it 3 times)
    const { lightweightUser, fullUser, supabaseClient } = await getUserData();
    
    // Full user is already available (no promise needed)
    const fullUserData = fullUser;
    
    // ============================================
    // Stage 2: Parse and validate request body
    // ============================================
    const body = await req.json();
    
    // Validate request body using Zod schema
    const validationResult = safeValidateChatRequest(body);
    
    if (!validationResult.success) {
      // Convert Zod errors to ValidationError
      const zodError = validationResult.errors!;
      const validationErrors = zodError.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      
      throw new ValidationError(
        'Request validation failed',
        validationErrors
      );
    }
    
    // Extract validated data
    const {
      messages,
      conversationId,
      model,
      chatMode,
    } = validationResult.data!;
    
    // ============================================
    // Stage 2.5: Early exit checks (before expensive operations)
    // ============================================
    // Check auth requirements immediately to avoid wasted work
    if (requiresAuthentication(model) && !lightweightUser) {
      logger.warn('Early exit: Auth required', { model, userId: null });
      throw new ModelAccessError('Authentication required', 401);
    }
    
    // Check if model requires Pro subscription
    if (requiresProSubscription(model) && (!lightweightUser || !lightweightUser.isProUser)) {
      logger.warn('Early exit: Pro required', { model, userId: lightweightUser?.userId });
      throw new ModelAccessError('Pro subscription required', 403);
    }
    
    // ============================================
    // RATE LIMITING (Hybrid)
    // ============================================
    const rateLimitResponse = new Response();
    const rateLimitCheck = await checkRateLimit({
      userId: lightweightUser?.userId || null,
      isProUser: lightweightUser?.isProUser,
      request: req,
      response: rateLimitResponse,
    });

    const setCookieHeader = rateLimitResponse.headers.get('set-cookie');
    const applyRateLimitHeaders = (headers: Headers) => {
      Object.entries(rateLimitCheck.headers).forEach(([key, value]) => headers.set(key, value));
      if (setCookieHeader) {
        headers.append('Set-Cookie', setCookieHeader);
      }
    };
    const applyConversationIdHeader = (headers: Headers, id?: string | null) => {
      if (id) {
        headers.set('X-Conversation-Id', id);
      }
    };

    if (!rateLimitCheck.allowed) {
      logger.warn('Rate limit exceeded', {
        userId: lightweightUser?.userId || 'guest',
        reason: rateLimitCheck.reason,
      });
      const denyResponse = NextResponse.json(
        {
          error: rateLimitCheck.reason || 'Rate limit exceeded',
          rateLimitInfo: {
            remaining: rateLimitCheck.remaining ?? 0,
          },
        },
        { status: 429 }
      );
      applyRateLimitHeaders(denyResponse.headers);
      applyConversationIdHeader(denyResponse.headers, conversationId);
      return denyResponse;
    }

    const sessionId = rateLimitCheck.sessionId;
    const sessionHash = sessionId ? hmacSessionId(sessionId) : null;
    
    // ============================================
    // Stage 3: Start promises early (parallel execution)
    // ============================================
    // Get modeConfig immediately (synchronous, but start tools loading early)
    const modeConfig = getChatMode(chatMode);
    if (!modeConfig) {
      throw new ChatModeError(`Chat mode '${chatMode}' not found`);
    }
    
    // Tools are loaded synchronously (getToolsByIds is fast, no promise needed)
    // We'll get them when needed in execute block
    
    // Access control check (using lightweight user for fast check)
    const accessCheckPromise = (async () => {
      const isPro = lightweightUser?.isProUser ?? false;
      // Convert lightweight user to User type for canUseModel
      const userForCheck: User | null = lightweightUser ? { 
        id: lightweightUser.userId,
        email: lightweightUser.email,
      } : null;
      return canUseModel(model, userForCheck, isPro);
    })();
    
    // Await access check (needed to determine if we can proceed)
    // Start access check promise early (before execute())
    const accessCheck = await accessCheckPromise;
    
    logger.debug('Setup complete', { duration: `${Date.now() - requestStartTime}ms` });
    
    // Check access (early exit already handled above, but double-check for safety)
    if (!accessCheck.canUse) {
      const statusCode = accessCheck.reason === 'Authentication required' ? 401 : 403;
      logger.warn('Model access denied', { model, reason: accessCheck.reason, userId: lightweightUser?.userId });
      throw new ModelAccessError(accessCheck.reason || 'Access denied', statusCode);
    }
    
    // modeConfig already retrieved above (synchronous operation)
    
    // ============================================
    // Stage 4: Convert messages to UIMessage[] format
    // ============================================
    // Convert Zod-validated messages to UIMessage[] format
    const uiMessages = toUIMessageFromZod(messages);
    
    // Extract user message for saving (enables parallel DB operations)
    let lastUserMessage: UIMessage | null = null;
    if (uiMessages.length > 0) {
      const lastMessage = uiMessages[uiMessages.length - 1];
      
      // Verify last message is a user message (critical for data integrity)
      if (lastMessage.role === 'user') {
        lastUserMessage = lastMessage;
      }
    }
    
    // Extract user message text for title generation
    const userMessageText = lastUserMessage?.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
            .map((p) => p.text)
      .join('') || '';
    
    // Calculate title for conversation creation
    const title = userMessageText.trim().length > 0
      ? userMessageText.slice(0, 50) + (userMessageText.length > 50 ? '...' : '')
      : 'New Chat';

    let resolvedConversationId = conversationId;
    
    logger.debug('Starting stream', { duration: `${Date.now() - requestStartTime}ms` });
    
    // ============================================
    // Stage 5: Stream AI response (UI stream with reasoning)
    // ============================================
    // Supabase client already available from getUserData() (reused, no extra creation)
    // Tools are loaded synchronously when needed (getToolsByIds is fast)
    
    // Create DB operations promise (runs in parallel with other operations)
    // CRITICAL: ensureConversation must complete before saveUserMessage
    // CRITICAL: User message must be saved BEFORE streaming starts (for conversation history integrity)
    // We chain them to ensure proper order while still parallelizing with other operations
    // Full user already available (no await needed)
    const dbOperationsPromise = (async () => {
      const user = fullUserData;

      // Authenticated flow
      if (user && conversationId && !conversationId.startsWith('temp-') && lastUserMessage) {
        return ensureConversation(user, conversationId, title, supabaseClient)
          .then((convId) => {
            resolvedConversationId = convId;
            if (!convId || convId.startsWith('temp-') || !lastUserMessage) {
              return { convId, saveSuccess: false };
            }
            
            const userMessageText = lastUserMessage.parts
              ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
              .map((p) => p.text)
              .join('') || '';
            
            if (userMessageText.trim().length > 50) {
              if (lastUserMessage && lastUserMessage.role === 'user') {
                after(async () => {
                  try {
                    const betterTitle = await generateTitleFromUserMessage({ message: lastUserMessage! });
                    await updateConversationTitle(convId, betterTitle, supabaseClient);
                    logger.debug('Title generated and updated', { conversationId: convId, title: betterTitle });
                  } catch (error) {
                    logger.error('Background title generation failed', error, { conversationId: convId });
                  }
                });
              }
            }
            
            const isPro = lightweightUser?.isProUser ?? false;
            return saveUserMessage(convId, lastUserMessage, user.id, supabaseClient, isPro)
              .then((saved) => ({ convId, saveSuccess: saved }))
              .catch((error) => {
                logger.error('Failed to save user message', error, { conversationId: convId });
                return { convId, saveSuccess: false };
              });
          })
          .catch((error) => {
            logger.error('DB operations failed', error, { conversationId });
            return null;
          });
      }

      // Guest flow
      if (!user && sessionHash && lastUserMessage) {
        try {
          const preferredId = conversationId && !conversationId.startsWith('temp-') ? conversationId : undefined;
          const guestConversationId = await ensureGuestConversation(sessionHash, title, preferredId);
          resolvedConversationId = guestConversationId;
          await saveGuestMessage({
            conversationId: guestConversationId,
            message: lastUserMessage,
            role: 'user',
            sessionHash,
          });
          return { convId: guestConversationId, saveSuccess: true };
        } catch (error) {
          logger.error('Guest DB operations failed', error, { sessionHash, conversationId });
          return null;
        }
      }

      return null;
    })();

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // ============================================
        // AWAIT DB OPERATIONS (tools loaded synchronously)
        // ============================================
        // Load tools synchronously (fast operation, no need for promise)
        const tools = getToolsByIds(modeConfig.enabledTools);
        
        // Await DB operations (user message must be saved before streaming)
        const dbResult = await dbOperationsPromise;

        // Extract convId from DB result
        // dbResult is { convId: string, saveSuccess: boolean } when successful, null when failed
        let convId = conversationId;
        if (dbResult && typeof dbResult === 'object' && !Array.isArray(dbResult) && 'convId' in dbResult) {
          convId = dbResult.convId;
          resolvedConversationId = convId || resolvedConversationId;
          if (dbResult.saveSuccess) {
            logger.debug('Conversation validated and user message saved', { conversationId: convId });
          } else {
            logger.debug('Conversation validated but user message save failed', { conversationId: convId });
          }
        }

        // ============================================
        // START STREAMING (after user message is saved)
        // ============================================
        const result = streamText({
          model: qurse.languageModel(model),
          messages: convertToModelMessages(uiMessages),
          system: modeConfig.systemPrompt,
          maxRetries: 5,
          ...getModelParameters(model),
          providerOptions: getProviderOptions(model) as StreamTextProviderOptions,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          onError: (err) => {
            logger.error('Stream error', err.error, { model });
            const errorMessage = err.error instanceof Error ? err.error.message : String(err.error);
            if (errorMessage.includes('API key')) {
              throw new ProviderError(
                'Provider authentication failed',
                model.split('/')[0] || 'unknown',
                false
              );
            }
          },
          onFinish: async ({ usage }) => {
            // Note: We save messages in createUIMessageStream's onFinish instead
            // This onFinish is kept for logging purposes
            const processingTime = (Date.now() - requestStartTime) / 1000;
            logger.info('Stream completed', {
              duration: `${processingTime.toFixed(2)}s`,
              tokens: usage?.totalTokens || 0,
            });
          },
        });

        // ============================================
        // MERGE STREAM (streaming starts immediately)
        // ============================================
        // Merge normalized UI stream with conditional reasoning
        // Only send reasoning for models that support it
        const modelConfig = getModelConfig(model);
        const shouldSendReasoning = modelConfig?.reasoning || false;
        
        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: shouldSendReasoning,
            messageMetadata: ({ part }) => {
              if (part.type === 'finish') {
                const processingTime = (Date.now() - requestStartTime) / 1000;
                return {
                  model: model,
                  completionTime: processingTime,
                  totalTokens: part.totalUsage?.totalTokens ?? null,
                  inputTokens: part.totalUsage?.inputTokens ?? null,
                  outputTokens: part.totalUsage?.outputTokens ?? null,
                };
              }
            },
          })
        );
      },
      onFinish: async ({ messages }) => {
        // Save assistant messages in BACKGROUND (non-blocking)
        const user = fullUserData;
        const assistantMessage = messages[messages.length - 1];

        // Authenticated assistant save
        if (user && resolvedConversationId && !resolvedConversationId.startsWith('temp-')) {
          after(async () => {
            try {
              if (assistantMessage && assistantMessage.role === 'assistant' && assistantMessage.parts) {
                const contentText = assistantMessage.parts
                  .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
                  .map((p) => p.text)
                  .join('') || '';

                interface MessageWithMetadata extends UIMessage {
                  metadata?: {
                    inputTokens?: number | null;
                    outputTokens?: number | null;
                    totalTokens?: number | null;
                    completionTime?: number;
                    model?: string;
                  };
                }
                const messageWithMetadata = assistantMessage as MessageWithMetadata;
                const metadata = messageWithMetadata.metadata;
                const inputTokens = metadata?.inputTokens ?? null;
                const outputTokens = metadata?.outputTokens ?? null;
                const totalTokens = metadata?.totalTokens ?? null;
                const completionTime = metadata?.completionTime ?? (Date.now() - requestStartTime) / 1000;

                if (!Array.isArray(assistantMessage.parts) || assistantMessage.parts.length === 0) {
                  logger.error('Invalid parts array', { conversationId: resolvedConversationId, parts: assistantMessage.parts });
                  return;
                }

                const { error: assistantMsgError } = await supabaseClient.from('messages').insert({
                  conversation_id: resolvedConversationId,
                    role: 'assistant',
                  parts: assistantMessage.parts,
                  content: contentText || null,
                    model: model,
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    total_tokens: totalTokens,
                    completion_time: completionTime,
                  });

                if (assistantMsgError) {
                  logger.error('Background assistant message save failed', assistantMsgError, { conversationId: resolvedConversationId });
                } else {
                  logger.info('Assistant message saved', {
                    conversationId: resolvedConversationId,
                    partsCount: assistantMessage.parts.length,
                    tokens: totalTokens,
                    model,
                  });
                }
              }
            } catch (error) {
              logger.error('Background assistant message save error', error, { conversationId: resolvedConversationId });
            }
          });
        }

        // Guest assistant save
        if (!user && sessionHash && resolvedConversationId) {
          after(async () => {
            try {
              if (assistantMessage && assistantMessage.role === 'assistant') {
                await saveGuestMessage({
                  conversationId: resolvedConversationId,
                  message: assistantMessage,
                  role: 'assistant',
                  sessionHash,
                });
              }
            } catch (error) {
              logger.error('Guest assistant message save error', error, { conversationId: resolvedConversationId, sessionHash });
            }
          });
        }
      },
    });

    // Return as SSE
    const sseHeaders = new Headers({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
    });
    applyRateLimitHeaders(sseHeaders);
    applyConversationIdHeader(sseHeaders, resolvedConversationId ?? conversationId);

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
      headers: sseHeaders,
    });
    
  } catch (error) {
    // Handle custom errors first (these already have safe messages)
    if (error instanceof ValidationError) {
      logger.error('Chat API validation error', error);
      return NextResponse.json(
        {
          error: error.message,
          validationErrors: error.validationErrors,
        },
        { status: error.statusCode }
      );
    }
    
    if (error instanceof ModelAccessError || 
        error instanceof ChatModeError ||
        error instanceof StreamingError ||
        error instanceof ProviderError) {
      logger.error('Chat API custom error', error);
      // These custom errors already have user-safe messages
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    
    // Handle unknown errors with sanitization
    const sanitizedMessage = handleApiError(error, 'api/chat');
    
    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat
 * Return API information
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '2.0.0',
    features: {
      reasoning: true,
      streaming: true,
      parallelOperations: true,
      providerConfigs: true,
    },
    endpoints: {
      POST: 'Stream AI chat responses with reasoning support',
    },
  });
}
