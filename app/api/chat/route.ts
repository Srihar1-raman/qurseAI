/**
 * Chat API Route
 * Main endpoint for AI streaming responses
 */

import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { qurse } from '@/ai/providers';
import { canUseModel, getModelParameters } from '@/ai/models';
import { getChatMode } from '@/ai/config';
import { getToolsByIds } from '@/lib/tools';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/chat
 * Stream AI responses with authentication, access control, and database persistence
 */
export async function POST(req: Request) {
  try {
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // ============================================
    // 2. PARSE REQUEST
    // ============================================
    const {
      messages,
      conversationId,
      model = 'openai/gpt-oss-120b',
      chatMode = 'chat',
    } = await req.json();
    
    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }
    
    // ============================================
    // 3. ACCESS CONTROL
    // ============================================
    
    // TODO: Get actual Pro status from user subscription
    const isPro = false;
    
    const accessCheck = canUseModel(model, user, isPro);
    if (!accessCheck.canUse) {
      const statusCode = accessCheck.reason === 'Authentication required' ? 401 : 403;
      return NextResponse.json(
        { error: accessCheck.reason },
        { status: statusCode }
      );
    }
    
    // ============================================
    // 4. CONVERSATION MANAGEMENT
    // ============================================
    let convId = conversationId;
    
    // Create new conversation if needed (only for authenticated users)
    if (!convId && user) {
      const userMessage = messages[messages.length - 1]?.content || '';
      const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
      
      // Insert conversation using the server client (which has user's session)
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
        })
        .select()
        .single();
      
      if (convError) {
        console.error('Error creating conversation:', convError);
        throw new Error('Failed to create conversation');
      }
      
      convId = conversation.id;
    }
    
    // ============================================
    // 5. SAVE USER MESSAGE
    // ============================================
    if (user && convId) {
      const userMessage = messages[messages.length - 1];
      
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          content: userMessage.content,
          role: 'user',
        });
      
      if (msgError) {
        console.error('Error saving user message:', msgError);
        // Don't throw - conversation already created, can continue
      }
    }
    
    // ============================================
    // 6. GET CHAT MODE CONFIGURATION
    // ============================================
    const modeConfig = getChatMode(chatMode);
    if (!modeConfig) {
      return NextResponse.json(
        { error: `Chat mode '${chatMode}' not found` },
        { status: 400 }
      );
    }
    
    // Get tools for this chat mode
    const tools = getToolsByIds(modeConfig.enabledTools);
    
    // ============================================
    // 7. STREAM AI RESPONSE
    // ============================================
    const result = streamText({
      model: qurse.languageModel(model),
      messages,
      system: modeConfig.systemPrompt,
      ...getModelParameters(model),
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      
      // Note: Reasoning streaming depends on the specific model/provider
      // Grok models may show reasoning, others may not
      
      // Save assistant message when streaming completes
      onFinish: async ({ text }) => {
        if (user && convId) {
          try {
            const { error: msgError } = await supabase
              .from('messages')
              .insert({
                conversation_id: convId,
                content: text,
                role: 'assistant',
              });
            
            if (msgError) {
              console.error('Error saving assistant message:', msgError);
            }
          } catch (error) {
            console.error('Failed to save assistant message:', error);
            // Don't throw - message was already sent to user
          }
        }
      },
    });
    
    // ============================================
    // 8. RETURN STREAMING RESPONSE
    // ============================================
    return result.toTextStreamResponse({
      headers: {
        'X-Conversation-ID': convId || '',
      },
    });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    
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
    version: '1.0.0',
    endpoints: {
      POST: 'Stream AI chat responses',
    },
  });
}

