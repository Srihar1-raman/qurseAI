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
import { updateConversationTitle, ensureConversationServerSide } from '@/lib/db/queries.server';
import { checkRateLimit } from '@/lib/services/rate-limiting';
import { saveUserMessageServerSide } from '@/lib/db/messages.server';
import { ensureGuestConversation } from '@/lib/db/guest-conversations.server';
import { saveGuestMessage } from '@/lib/db/guest-messages.server';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { applyRateLimitHeaders, applyConversationIdHeader } from '@/lib/utils/rate-limit-headers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { User } from '@/lib/types';

const logger = createScopedLogger('api/chat');

// Service-role client for guest message checks (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serviceSupabase = supabaseUrl && serviceKey 
  ? createServiceClient(supabaseUrl, serviceKey)
  : null;

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
            resetTime: rateLimitCheck.reset,
            layer: rateLimitCheck.headers['X-RateLimit-Layer'] || 'database',
          },
        },
        { status: 429 }
      );
      applyRateLimitHeaders(denyResponse.headers, rateLimitCheck.headers, setCookieHeader);
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
    // ensureConversation must complete before saveUserMessage
    // User message must be saved BEFORE streaming starts (for conversation history integrity)
    // We chain them to ensure proper order while still parallelizing with other operations
    // Full user already available (no await needed)
    const dbOperationsPromise = (async () => {
      const user = fullUserData;

      // Authenticated flow
      if (user && conversationId && !conversationId.startsWith('temp-') && lastUserMessage) {
        return ensureConversationServerSide(conversationId, user.id, title, supabaseClient)
          .then(() => {
            resolvedConversationId = conversationId;
            if (!conversationId || conversationId.startsWith('temp-') || !lastUserMessage) {
              return { convId: conversationId, saveSuccess: false };
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
                    await updateConversationTitle(conversationId, betterTitle, supabaseClient);
                    logger.debug('Title generated and updated', { conversationId, title: betterTitle });
                  } catch (error) {
                    logger.error('Background title generation failed', error, { conversationId });
                  }
                });
              }
            }
            
            return saveUserMessageServerSide(conversationId, lastUserMessage, supabaseClient)
              .then((saved) => ({ convId: conversationId, saveSuccess: saved }))
              .catch((error) => {
                logger.error('Failed to save user message', error, { conversationId });
                return { convId: conversationId, saveSuccess: false };
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

    // Track abort state outside execute scope so onFinish can access it
    let wasAborted = false;
    const abortController = new AbortController();
    const abortTimestamps: { [key: string]: number } = {};

    // Forward abort signal from request if available
    if (req.signal) {
      const abortHandler = () => {
        wasAborted = true;
        abortTimestamps['reqSignalAbort'] = Date.now();
        abortController.abort();
        abortTimestamps['abortControllerAbort'] = Date.now();
        // Use console.error to ensure it shows in Vercel logs
        console.error('[DIAGNOSTIC] ABORT DETECTED: Request signal aborted', {
          conversationId: resolvedConversationId,
          timestamp: abortTimestamps['reqSignalAbort'],
          wasAborted,
        });
        logger.info('ABORT DETECTED: Request signal aborted', {
          conversationId: resolvedConversationId,
          timestamp: abortTimestamps['reqSignalAbort'],
        });
      };
      req.signal.addEventListener('abort', abortHandler);
      // Also check if already aborted
      if (req.signal.aborted) {
        wasAborted = true;
        abortTimestamps['reqSignalAlreadyAborted'] = Date.now();
        abortController.abort();
        abortTimestamps['abortControllerAbort'] = Date.now();
        // Use console.error to ensure it shows in Vercel logs
        console.error('[DIAGNOSTIC] ABORT DETECTED: Request signal already aborted', {
          conversationId: resolvedConversationId,
          timestamp: abortTimestamps['reqSignalAlreadyAborted'],
          wasAborted,
        });
        logger.info('ABORT DETECTED: Request signal already aborted', {
          conversationId: resolvedConversationId,
          timestamp: abortTimestamps['reqSignalAlreadyAborted'],
        });
      }
    }

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
          abortSignal: abortController.signal,
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
          onAbort: ({ steps }) => {
            wasAborted = true;
            abortTimestamps['streamTextOnAbort'] = Date.now();
            // Use console.error to ensure it shows in Vercel logs
            console.error('[DIAGNOSTIC] ABORT DETECTED: streamText onAbort called', { 
              conversationId: resolvedConversationId,
              stepsCount: steps.length,
              hasSteps: steps.length > 0,
              timestamp: abortTimestamps['streamTextOnAbort'],
              wasAborted,
            });
            logger.info('ABORT DETECTED: streamText onAbort called', { 
              conversationId: resolvedConversationId,
              stepsCount: steps.length,
              hasSteps: steps.length > 0,
              timestamp: abortTimestamps['streamTextOnAbort'],
            });
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
        const onFinishTimestamp = Date.now();
        const abortStateAtFinish = {
          wasAborted,
          reqSignalAborted: req.signal?.aborted ?? false,
          abortControllerAborted: abortController.signal.aborted,
        };

        // Log detailed state for diagnosis - Use console.error to ensure it shows in Vercel logs
        const diagnosticData = {
          conversationId: resolvedConversationId,
          timestamp: onFinishTimestamp,
          messageCount: messages.length,
          abortState: abortStateAtFinish,
          abortTimestamps,
          lastMessageId: messages[messages.length - 1]?.id,
          lastMessageRole: messages[messages.length - 1]?.role,
          lastMessagePartsCount: messages[messages.length - 1]?.parts?.length ?? 0,
          requestStartTime,
          timeSinceRequestStart: onFinishTimestamp - requestStartTime,
        };
        console.error('[DIAGNOSTIC] onFinish CALLED', JSON.stringify(diagnosticData, null, 2));
        logger.info('onFinish CALLED - DIAGNOSTIC LOG', diagnosticData);

        // Check if stream was aborted - don't save if user stopped the stream
        // Check both req.signal and our tracked abort state
        if (wasAborted || req.signal?.aborted || abortController.signal.aborted) {
          const skipData = {
            conversationId: resolvedConversationId,
            messageCount: messages.length,
            abortState: abortStateAtFinish,
            abortTimestamps,
          };
          console.error('[DIAGNOSTIC] onFinish: Stream aborted, skipping message save', JSON.stringify(skipData, null, 2));
          logger.info('onFinish: Stream aborted, skipping message save', skipData);
          return;
        }

        // Save assistant messages in BACKGROUND (non-blocking)
        const user = fullUserData;
        const assistantMessage = messages[messages.length - 1];

        // Additional safety check: If message content contains stop text, don't save
        // This handles cases where abort state isn't detected but client already saved partial message
        if (assistantMessage && assistantMessage.parts) {
          const contentText = assistantMessage.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
            .map((p) => p.text)
            .join('');
          
          if (contentText.includes('*User stopped this message here*')) {
            logger.info('onFinish: Message contains stop text, skipping save (client already saved partial)', {
              conversationId: resolvedConversationId,
              contentLength: contentText.length,
              contentPreview: contentText.substring(0, 100),
            });
            return;
          }
        }

        // Check if a message with stop text already exists for this conversation (defensive check)
        // This prevents duplicate saves in production where timing differs
        if (resolvedConversationId && !resolvedConversationId.startsWith('temp-')) {
          try {
            if (user) {
              const checkSupabase = await createClient();
              const { data: existingStopMessage } = await checkSupabase
                .from('messages')
                .select('id')
                .eq('conversation_id', resolvedConversationId)
                .eq('role', 'assistant')
                .or('content.ilike.%*User stopped this message here*%,parts::text.ilike.%*User stopped this message here*%')
                .limit(1)
                .maybeSingle();

              if (existingStopMessage) {
                logger.info('onFinish: Stop message already exists (auth), skipping save to prevent duplicate', {
                  conversationId: resolvedConversationId,
                  existingMessageId: existingStopMessage.id,
                  checkTimestamp: Date.now(),
                });
                return;
              }
            } else if (serviceSupabase) {
              const { data: existingStopMessage } = await serviceSupabase
                .from('guest_messages')
                .select('id')
                .eq('guest_conversation_id', resolvedConversationId)
                .eq('role', 'assistant')
                .or('content.ilike.%*User stopped this message here*%,parts::text.ilike.%*User stopped this message here*%')
                .limit(1)
                .maybeSingle();

              if (existingStopMessage) {
                logger.info('onFinish: Stop message already exists (guest), skipping save to prevent duplicate', {
                  conversationId: resolvedConversationId,
                  existingMessageId: existingStopMessage.id,
                  checkTimestamp: Date.now(),
                });
                return;
              }
            }
          } catch (checkError) {
            // If check fails, log but continue (don't block save on check failure)
            logger.error('Failed to check for existing stop message', checkError, {
              conversationId: resolvedConversationId,
            });
          }
        }

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
                  const saveData = {
                    conversationId: resolvedConversationId,
                    messageId: assistantMessage.id,
                    partsCount: assistantMessage.parts.length,
                    tokens: totalTokens,
                    model,
                    saveTimestamp: Date.now(),
                    timeSinceOnFinish: Date.now() - onFinishTimestamp,
                  };
                  console.error('[DIAGNOSTIC] onFinish: Assistant message SAVED TO DATABASE', JSON.stringify(saveData, null, 2));
                  logger.info('onFinish: Assistant message SAVED TO DATABASE', saveData);
                }
              }
            } catch (error) {
              logger.error('Background assistant message save error', error, { conversationId: resolvedConversationId });
            }
          });
        }

        // Guest assistant save
        if (!user && sessionHash && resolvedConversationId) {
          // Capture values in local constants for type narrowing
          const guestConversationId = resolvedConversationId;
          const guestSessionHash = sessionHash;
          after(async () => {
            try {
              if (assistantMessage && assistantMessage.role === 'assistant') {
                await saveGuestMessage({
                  conversationId: guestConversationId,
                  message: assistantMessage,
                  role: 'assistant',
                  sessionHash: guestSessionHash,
                });
              }
            } catch (error) {
              logger.error('Guest assistant message save error', error, { conversationId: guestConversationId, sessionHash: guestSessionHash });
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
    applyRateLimitHeaders(sseHeaders, rateLimitCheck.headers, setCookieHeader);
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
