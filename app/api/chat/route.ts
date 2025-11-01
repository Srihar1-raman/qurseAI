/**
 * Chat API Route
 * Main endpoint for AI streaming responses with reasoning support
 */

import { streamText, createUIMessageStream, JsonToSseTransformStream, convertToModelMessages } from 'ai';
import { NextResponse } from 'next/server';
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

const logger = createScopedLogger('api/chat');

/**
 * Helper: Validate conversation and save user message
 * Assumes conversation exists in DB (created by client)
 * Validates ownership and saves the user message
 */
async function validateAndSaveMessage(
  user: { id: string },
  conversationId: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Array<any>,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  
  // Extract user message content from UIMessage parts structure
  const lastMessage = messages[messages.length - 1];
  let userMessage = '';
  
  if (lastMessage?.parts && Array.isArray(lastMessage.parts)) {
    // UIMessage format with parts
    userMessage = lastMessage.parts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.type === 'text')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.text)
      .join('');
  } else if (lastMessage?.content) {
    // Fallback: ModelMessage format with content
    userMessage = lastMessage.content;
  }
  
  // Validate conversation exists and belongs to user
  const { data: conversation, error: checkError } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', conversationId)
    .maybeSingle();
  
  if (checkError) {
    logger.error('Failed to validate conversation', checkError, { conversationId });
    throw new Error('Failed to validate conversation');
  }
  
  if (!conversation) {
    logger.warn('Conversation not found', { conversationId });
    throw new Error('Conversation not found');
  }
  
  if (conversation.user_id !== user.id) {
    logger.warn('Unauthorized conversation access attempt', { conversationId, userId: user.id, ownerId: conversation.user_id });
    throw new Error('Unauthorized: conversation belongs to another user');
  }
  
  // Save user message (RLS policy checks conversation ownership)
  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content: userMessage,
      role: 'user',
    });
  
  if (msgError) {
    logger.error('Failed to save user message', msgError, { conversationId });
    throw new Error('Failed to save user message');
  }
  
  logger.debug('User message saved', { conversationId });
  
  return conversationId;
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
    // Stage 4: Message validation and persistence (only if user authenticated)
    // ============================================
    let convId = conversationId;
    if (user) {
      convId = await validateAndSaveMessage(user, conversationId, messages, supabase);
      logger.debug('Conversation validated and message saved', { conversationId: convId });
    }
    
    logger.debug('Starting stream', { duration: `${Date.now() - requestStartTime}ms` });
    
    // ============================================
    // Stage 5: Stream AI response (UI stream with reasoning)
    // ============================================
    const tools = getToolsByIds(modeConfig.enabledTools);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: qurse.languageModel(model),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: convertToModelMessages(messages as any),
          system: modeConfig.systemPrompt,
          maxRetries: 5,
          ...getModelParameters(model),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          providerOptions: getProviderOptions(model) as any,
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
            if (user && convId) {
              // Save assistant message - store reasoning in content with delimiter
              let fullContent = text;
              if (reasoning) {
                // Serialize reasoning (could be string or object) properly
                const reasoningText = typeof reasoning === 'string' 
                  ? reasoning 
                  : JSON.stringify(reasoning);
                fullContent = `${text}|||REASONING|||${reasoningText}`;
              }
              
              // Only use guaranteed columns: conversation_id, content, role
              const { error: assistantMsgError } = await supabase
                .from('messages')
                .insert({ 
                  conversation_id: convId, 
                  content: fullContent, 
                  role: 'assistant',
                });
              
              if (assistantMsgError) {
                logger.error('Assistant message save failed', assistantMsgError, { conversationId: convId });
              } else {
                logger.info('Assistant message saved', {
                  conversationId: convId,
                  hasReasoning: !!reasoning,
                  tokens: usage?.totalTokens,
                  model,
                });
              }
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
