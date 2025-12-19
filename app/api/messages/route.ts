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

      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        parts: message.parts || [{ type: 'text', text: contentText.trim() }],
        content: contentText.trim(),
        model: (message as UIMessage & { metadata?: { model?: string } }).metadata?.model || null,
      });

      if (msgError) {
        logger.error('Failed to save stopped message', msgError, { conversationId });
        return NextResponse.json(
          { error: 'Failed to save message' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Guest user save
    const sessionId = getOrCreateSessionId(request);
    const sessionHash = hmacSessionId(sessionId);

    await saveGuestMessage({
      conversationId,
      message,
      role: 'assistant',
      sessionHash,
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

