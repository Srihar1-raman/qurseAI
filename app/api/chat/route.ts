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
 * Helper: Handle conversation creation and validation
 * Ensures conversation exists and belongs to the user
 */
async function handleConversationCreation(
  user: { id: string },
  conversationId: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Array<any>,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  let convId = conversationId;
  
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
  
  const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
  
  if (convId) {
    // Check if conversation exists
    const { data: existingConv, error: checkError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', convId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking conversation:', checkError);
    }
    
    if (!existingConv || existingConv.user_id !== user.id) {
      // Create new conversation
      const { error: convError } = await supabase
        .from('conversations')
        .insert({ id: convId, user_id: user.id, title })
        .select()
        .maybeSingle();
      
      if (convError && convError.code !== '23505') {
        throw new Error('Failed to create conversation');
      }
      
      // If duplicate key (race condition), verify ownership
      if (convError && convError.code === '23505') {
        const { data: verifyConv } = await supabase
          .from('conversations')
          .select('user_id')
          .eq('id', convId)
          .maybeSingle();
        
        if (!verifyConv || verifyConv.user_id !== user.id) {
          throw new Error('Failed to create conversation - ownership conflict');
        }
      }
    }
  } else {
    // No conversationId provided, create new one
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title })
      .select()
      .single();
    
    if (convError) {
      throw new Error('Failed to create conversation');
    }
    
    convId = conversation.id;
  }
  
  // Save user message
  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: convId,
      content: userMessage,
      role: 'user',
    });
  
  if (msgError) {
    console.error('Error saving user message:', msgError);
    // Don't throw - conversation already created, can continue
  }
  
  return convId!; // convId is guaranteed to be set by this point
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
    // Stage 4: Conversation management (only if user authenticated)
    // ============================================
    let convId = conversationId;
    if (user) {
      convId = await handleConversationCreation(user, conversationId, messages, supabase);
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
              // Save assistant message to database
              void supabase
                .from('messages')
                .insert({ 
                  conversation_id: convId, 
                  content: text, 
                  role: 'assistant' 
                })
                .then(({ error }) => {
                  if (error) console.error('❌ Message save failed:', error);
                  else console.log('✅ Message saved to DB');
                });
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
        'X-Conversation-ID': convId || '',
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
