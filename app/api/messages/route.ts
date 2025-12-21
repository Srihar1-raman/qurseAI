/**
 * POST /api/messages: Save an assistant message (for stopped streams)
 * Used when user stops a stream and we need to save the partial response
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { createClient } from '@/lib/supabase/server';
import { saveGuestMessage } from '@/lib/db/guest-messages.server';
import { getOrCreateSessionId } from '@/lib/utils/session';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { createScopedLogger } from '@/lib/utils/logger';
import type { UIMessage } from 'ai';

const logger = createScopedLogger('api/messages');

export async function POST(request: NextRequest) {
  try {
    const { lightweightUser } = await getUserData();
    const body = await request.json();
    const { conversationId, message } = body as { conversationId: string; message: UIMessage };

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'Conversation ID and message are required' },
        { status: 400 }
      );
    }

    // Extract text content from parts
    const contentText = message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('') || '';

    if (!contentText.trim() && message.parts.length === 0) {
      return NextResponse.json(
        { error: 'Message has no content' },
        { status: 400 }
      );
    }

    // Authenticated user save
    if (lightweightUser?.userId) {
      const supabase = await createClient();

      // Verify conversation belongs to user
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', lightweightUser.userId)
        .single();

      if (convError || !convData) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      const saveStartTime = Date.now();
      logger.info('SERVER /api/messages: Saving client stop message (auth user)', {
        conversationId,
        messageId: message.id,
        timestamp: saveStartTime,
        contentLength: contentText.length,
        hasStopText: contentText.includes('*User stopped this message here*'),
      });

      // Determine if this is a stop message
      const isStopMessage = contentText.includes('*User stopped this message here*');

      const { error: msgError, data: insertedData } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        parts: message.parts || [{ type: 'text', text: contentText.trim() }],
        content: contentText.trim(),
        model: (message as UIMessage & { metadata?: { model?: string } }).metadata?.model || null,
        is_stopped: isStopMessage,
      }).select('id').single();

      if (msgError) {
        logger.error('SERVER /api/messages: Failed to save stopped message', msgError, { conversationId });
        return NextResponse.json(
          { error: 'Failed to save message' },
          { status: 500 }
        );
      }

      logger.info('SERVER /api/messages: Client stop message saved successfully (auth user)', {
        conversationId,
        messageId: message.id,
        insertedId: insertedData?.id,
        saveDuration: Date.now() - saveStartTime,
      });

      return NextResponse.json({ success: true });
    }

    // Guest user save
    const sessionId = getOrCreateSessionId(request);
    const sessionHash = hmacSessionId(sessionId);
    const saveStartTime = Date.now();

    logger.info('SERVER /api/messages: Saving client stop message (guest)', {
      conversationId,
      messageId: message.id,
      timestamp: saveStartTime,
      contentLength: contentText.length,
      hasStopText: contentText.includes('*User stopped this message here*'),
    });

    // Check if server already saved a message for this conversation (prevents duplicate)
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && serviceKey) {
      const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);
      const { data: existingGuestMessage, error: checkError } = await serviceSupabase
        .from('guest_messages')
        .select('id, created_at, role')
        .eq('guest_conversation_id', conversationId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError) {
        logger.error('SERVER /api/messages: Error checking for existing guest message', checkError, { conversationId });
        // Continue with save even if check fails
      } else if (existingGuestMessage) {
        const messageAge = Date.now() - new Date(existingGuestMessage.created_at).getTime();
        // If a message was saved in the last 20 seconds, assume server already saved
        if (messageAge < 20000) {
          logger.info('SERVER /api/messages: Server already saved guest message, skipping client save to prevent duplicate', {
            conversationId,
            existingMessageId: existingGuestMessage.id,
            messageAgeMs: messageAge,
            timestamp: Date.now(),
          });
          return NextResponse.json({ success: true, skipped: true, reason: 'server_already_saved' });
        }
      }
    }

    // Determine if this is a stop message
    const isStopMessage = contentText.includes('*User stopped this message here*');

    await saveGuestMessage({
      conversationId,
      message,
      role: 'assistant',
      sessionHash,
      isStopped: isStopMessage,
    });

    logger.info('SERVER /api/messages: Client stop message saved successfully (guest)', {
      conversationId,
      messageId: message.id,
      saveDuration: Date.now() - saveStartTime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error saving stopped message', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}

