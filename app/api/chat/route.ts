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
 * Helper: Ensure conversation exists (creates if needed)
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

  // Try to create conversation
  const { error: insertError } = await supabase
    .from('conversations')
    .insert({
      id: conversationId,
      user_id: user.id,
      title: title,
    });

  if (insertError) {
    // Handle race condition (duplicate key)
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
 */
async function saveUserMessage(
  conversationId: string,
  messageText: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  if (!conversationId || conversationId.startsWith('temp-') || !messageText.trim()) {
    return;
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
    
    logger.debug('Starting stream', { duration: `${Date.now() - requestStartTime}ms` });
    
    // ============================================
    // Stage 5: Stream AI response (UI stream with reasoning)
    // ============================================
    const tools = getToolsByIds(modeConfig.enabledTools);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // ============================================
        // CONVERSATION CREATION AND USER MESSAGE SAVE
        // (critical for history, must be synchronous before streaming)
        // ============================================
        let convId = conversationId;
        let userMessageText = '';

        if (uiMessages.length > 0) {
          const lastMessage = uiMessages[uiMessages.length - 1];
          
          // Verify last message is a user message (critical for data integrity)
          if (lastMessage.role !== 'user') {
            logger.warn('Last message is not a user message', { 
              role: lastMessage.role,
              conversationId 
            });
          } else {
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

        // Save user message BEFORE streaming (critical for conversation history)
        // This matches Scira's pattern - synchronous save before streamText()
        if (user && conversationId && !conversationId.startsWith('temp-') && userMessageText.trim().length > 0) {
          try {
            const title = userMessageText.slice(0, 50) + (userMessageText.length > 50 ? '...' : '');
            
            // Ensure conversation exists (creates if needed)
            convId = await ensureConversation(user, conversationId, title, supabase);
            
            // Save user message (synchronous - critical for history)
            await saveUserMessage(convId, userMessageText, supabase);
            
            logger.debug('Conversation validated and user message saved', { conversationId: convId });
          } catch (error) {
            logger.error('Error ensuring conversation or saving user message', error, { conversationId });
            // Don't throw - streaming can continue even if save fails
            // Error is logged for monitoring
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
