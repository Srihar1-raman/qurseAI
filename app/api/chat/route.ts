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
import { ModelAccessError, ChatModeError, StreamingError, ProviderError } from '@/lib/errors';

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
  
  console.log('🔍 validateAndSaveMessage - conversationId:', conversationId);
  
  // Validate conversation exists and belongs to user
  const { data: conversation, error: checkError } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', conversationId)
    .maybeSingle();
  
  if (checkError) {
    console.error('Error checking conversation:', checkError);
    throw new Error('Failed to validate conversation');
  }
  
  if (!conversation) {
    throw new Error('Conversation not found');
  }
  
  if (conversation.user_id !== user.id) {
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
    console.error('Error saving user message:', msgError);
    throw new Error('Failed to save user message');
  }
  
  console.log('✅ User message saved to conversation:', conversationId);
  
  return conversationId;
}

/**
 * POST /api/chat
 * Stream AI responses with authentication, access control, and database persistence
 */
export async function POST(req: Request) {
  const requestStartTime = Date.now();
  console.log('⏱️  Request started');
  
  try {
    // ============================================
    // Stage 1: Fast authentication check
    // ============================================
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // ============================================
    // Stage 2: Parse request body
    // ============================================
    const body = await req.json();
    const {
      messages,
      conversationId,
      model = 'openai/gpt-oss-120b',
      chatMode = 'chat',
    } = body;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }
    
    // ============================================
    // Stage 3: Parallel data fetching (critical path)
    // ============================================
    const [accessCheck, modeConfig] = await Promise.all([
      // Access control check
      (async () => {
        const isPro = false; // TODO: Get from subscription
        return canUseModel(model, user, isPro);
      })(),
      // Chat mode config
      getChatMode(chatMode),
    ]);
    
    console.log(`⏱️  Setup complete: ${Date.now() - requestStartTime}ms`);
    
    // Check access
    if (!accessCheck.canUse) {
      const statusCode = accessCheck.reason === 'Authentication required' ? 401 : 403;
      throw new ModelAccessError(accessCheck.reason || 'Access denied', statusCode);
    }
    
    if (!modeConfig) {
      throw new ChatModeError(`Chat mode '${chatMode}' not found`);
    }
    
    // ============================================
    // Stage 4: Message validation and persistence (only if user authenticated)
    // ============================================
    let convId = conversationId;
    console.log('📝 Received conversationId:', conversationId);
    if (user) {
      convId = await validateAndSaveMessage(user, conversationId, messages, supabase);
      console.log('✅ Validated conversation and saved message:', convId);
    }
    
    console.log(`⏱️  Time to stream: ${Date.now() - requestStartTime}ms`);
    
    // ============================================
    // Stage 5: Stream AI response (UI stream with reasoning)
    // ============================================
    const tools = getToolsByIds(modeConfig.enabledTools);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: qurse.languageModel(model),
          messages: convertToModelMessages(messages),
          system: modeConfig.systemPrompt,
          maxRetries: 5,
          ...getModelParameters(model),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          providerOptions: getProviderOptions(model) as any,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          onError: (err) => {
            console.error('Stream error:', err);
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
              // Save assistant message to database (RLS policy checks conversation ownership)
              const { error: assistantMsgError } = await supabase
                .from('messages')
                .insert({ 
                  conversation_id: convId, 
                  content: text, 
                  role: 'assistant',
                });
              
              if (assistantMsgError) {
                console.error('❌ Assistant message save failed:', assistantMsgError);
              } else {
                console.log('✅ Assistant message saved to DB');
              }
            }

            const processingTime = (Date.now() - requestStartTime) / 1000;
            console.log(`✅ Request completed: ${processingTime.toFixed(2)}s`);
            if (reasoning) console.log(`🧠 Reasoning extracted (${reasoning.length} chars)`);
            if (usage) console.log(`📊 Tokens: ${usage.totalTokens || 0}`);
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
    console.error('Chat API Error:', error);
    
    // Handle custom errors
    if (error instanceof ModelAccessError || 
        error instanceof ChatModeError ||
        error instanceof StreamingError ||
        error instanceof ProviderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    // Handle specific error types
    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
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
