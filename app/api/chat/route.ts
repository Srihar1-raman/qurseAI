/**
 * Chat API Route
 * Main endpoint for AI streaming responses with reasoning support
 */

import { streamText, createUIMessageStream, JsonToSseTransformStream, convertToModelMessages, type UIMessage, type UIMessagePart } from 'ai';
import { NextResponse, after } from 'next/server';
import { qurse } from '@/ai/providers';
import { canUseModel, getModelParameters, getProviderOptions, getModelConfig } from '@/ai/models';
import { getChatMode } from '@/ai/config';
import { getToolsByIds } from '@/lib/tools';
import { createClient } from '@/lib/supabase/server';
import { ModelAccessError, ChatModeError, StreamingError, ProviderError, ValidationError } from '@/lib/errors';
import { safeValidateChatRequest } from '@/lib/validation/chat-schema';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/error-handler';
import { sanitizeApiError } from '@/lib/utils/error-sanitizer';
import { toUIMessageFromZod, type StreamTextProviderOptions } from '@/lib/utils/message-adapters';

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
 * Helper: Save user message
 * Returns true if message was saved, false if skipped (early return)
 */
async function saveUserMessage(
  conversationId: string,
  messageText: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  if (!conversationId || conversationId.startsWith('temp-') || !messageText.trim()) {
    return false;
  }

  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content: messageText.trim(),
      role: 'user',
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
    // Stage 1: Fast authentication check
    // ============================================
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
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
    // Stage 3: Parallel data fetching (critical path)
    // ============================================
    const [accessCheck, modeConfig] = await Promise.all([
      // Access control check
      (async () => {
        const isPro = false; // TODO: Get from subscription
        return canUseModel(model, user, isPro);
      })(),
      // Chat mode config (validation already verified it exists)
      getChatMode(chatMode),
    ]);
    
    logger.debug('Setup complete', { duration: `${Date.now() - requestStartTime}ms` });
    
    // Check access
    if (!accessCheck.canUse) {
      const statusCode = accessCheck.reason === 'Authentication required' ? 401 : 403;
      logger.warn('Model access denied', { model, reason: accessCheck.reason, userId: user?.id });
      throw new ModelAccessError(accessCheck.reason || 'Access denied', statusCode);
    }
    
    // modeConfig is guaranteed to exist (validated by schema)
    if (!modeConfig) {
      throw new ChatModeError(`Chat mode '${chatMode}' not found`);
    }
    
    // ============================================
    // Stage 4: Convert messages to UIMessage[] format
    // ============================================
    // Convert Zod-validated messages to UIMessage[] format
    const uiMessages = toUIMessageFromZod(messages);
    
    // Extract user message text early (enables parallel DB operations)
    let userMessageText = '';
    if (uiMessages.length > 0) {
      const lastMessage = uiMessages[uiMessages.length - 1];
      
      // Verify last message is a user message (critical for data integrity)
      if (lastMessage.role === 'user') {
        // Extract user message text
        if (lastMessage?.parts && Array.isArray(lastMessage.parts)) {
          userMessageText = lastMessage.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
            .map((p) => p.text)
            .join('');
        } else if (lastMessage && 'content' in lastMessage && typeof lastMessage.content === 'string') {
          userMessageText = lastMessage.content;
        }
      }
    }
    
    // Calculate title for conversation creation
    const title = userMessageText.trim().length > 0
      ? userMessageText.slice(0, 50) + (userMessageText.length > 50 ? '...' : '')
      : 'New Chat';
    
    logger.debug('Starting stream', { duration: `${Date.now() - requestStartTime}ms` });
    
    // ============================================
    // Stage 5: Stream AI response (UI stream with reasoning)
    // ============================================
    // Create promises for operations that can run in parallel
    // Create tools promise (modeConfig is already resolved)
    const toolsPromise = Promise.resolve(getToolsByIds(modeConfig.enabledTools));
    
    // Create DB operations promise (runs in parallel with other operations)
    // CRITICAL: ensureConversation must complete before saveUserMessage
    // CRITICAL: User message must be saved BEFORE streaming starts (for conversation history integrity)
    // We chain them to ensure proper order while still parallelizing with other operations
    const dbOperationsPromise = user && conversationId && !conversationId.startsWith('temp-') && userMessageText.trim().length > 0
      ? ensureConversation(user, conversationId, title, supabase)
          .then(convId => {
            // After conversation is ensured, save user message
            // Check conditions again (defensive programming - saveUserMessage has its own checks)
            if (!convId || convId.startsWith('temp-') || !userMessageText.trim()) {
              // Shouldn't happen due to outer check, but handle defensively
              return { convId, saveSuccess: false };
            }
            
            // Return object with convId and saveSuccess flag
            return saveUserMessage(convId, userMessageText, supabase)
              .then((saved) => ({ convId, saveSuccess: saved })) // Return actual save result
              .catch(error => {
                // Log error but still return convId so we can use it
                // This allows streaming to start but logs the failure
                logger.error('Failed to save user message', error, { conversationId: convId });
                return { convId, saveSuccess: false }; // Return failure flag
              });
          })
          .catch(error => {
            logger.error('DB operations failed', error, { conversationId });
            // Return null to allow streaming to continue even if conversation creation fails
            return null;
          })
      : Promise.resolve(null);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // ============================================
        // AWAIT ALL OPERATIONS IN PARALLEL
        // (operations started before execute() - now await together)
        // ============================================
        const [tools, dbResult] = await Promise.all([
          toolsPromise,
          dbOperationsPromise,
        ]);

        // Extract convId from DB result
        // dbResult is { convId: string, saveSuccess: boolean } when successful, null when failed
        let convId = conversationId;
        if (dbResult && typeof dbResult === 'object' && !Array.isArray(dbResult) && 'convId' in dbResult) {
          convId = dbResult.convId;
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
          onFinish: async ({ text, reasoning, usage }) => {
            // Save assistant message in BACKGROUND (non-blocking)
            if (user && convId && !convId.startsWith('temp-')) {
              after(async () => {
                try {
                  let fullContent = text;
                  if (reasoning) {
                    const reasoningText = typeof reasoning === 'string'
                      ? reasoning
                      : JSON.stringify(reasoning);
                    fullContent = `${text}|||REASONING|||${reasoningText}`;
                  }

                  const { error: assistantMsgError } = await supabase
                    .from('messages')
                    .insert({
                      conversation_id: convId,
                      content: fullContent,
                      role: 'assistant',
                    });

                  if (assistantMsgError) {
                    logger.error('Background assistant message save failed', assistantMsgError, { conversationId: convId });
                  } else {
                    logger.info('Assistant message saved', {
                      conversationId: convId,
                      hasReasoning: !!reasoning,
                      tokens: usage?.totalTokens,
                      model,
                    });
                  }
                } catch (error) {
                  logger.error('Background assistant message save error', error, { conversationId: convId });
                }
              });
            }

            const processingTime = (Date.now() - requestStartTime) / 1000;
            logger.info('Request completed', {
              duration: `${processingTime.toFixed(2)}s`,
              hasReasoning: !!reasoning,
              reasoningLength: reasoning?.length,
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
                return { model };
              }
            },
          })
        );
      },
    });

    // Return as SSE
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
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
