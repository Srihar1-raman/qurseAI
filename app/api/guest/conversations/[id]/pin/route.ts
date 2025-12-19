import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getOrCreateSessionId } from '@/lib/utils/session';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('api/guest/conversations/pin');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

/**
 * PATCH /api/guest/conversations/[id]/pin
 * Toggle pin status for a guest conversation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const sessionId = getOrCreateSessionId(request);
    const sessionHash = hmacSessionId(sessionId);

    // Get current pin status
    const { data: conversation, error: fetchError } = await serviceSupabase
      .from('guest_conversations')
      .select('id, pinned, session_hash')
      .eq('id', conversationId)
      .maybeSingle();

    if (fetchError) {
      const userMessage = handleDbError(fetchError, 'api/guest/conversations/pin');
      logger.error('Error fetching guest conversation', fetchError, { conversationId, sessionHash });
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.session_hash !== sessionHash) {
      logger.warn('Unauthorized pin attempt', { conversationId, sessionHash, ownerSessionHash: conversation.session_hash });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Toggle pin status
    const newPinnedStatus = !conversation.pinned;

    const { error: updateError } = await serviceSupabase
      .from('guest_conversations')
      .update({ pinned: newPinnedStatus })
      .eq('id', conversationId)
      .eq('session_hash', sessionHash);

    if (updateError) {
      const userMessage = handleDbError(updateError, 'api/guest/conversations/pin');
      logger.error('Error updating pin status', updateError, { conversationId, sessionHash });
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

    logger.debug('Pin status toggled', { conversationId, sessionHash, pinned: newPinnedStatus });

    return NextResponse.json({
      success: true,
      pinned: newPinnedStatus,
    });
  } catch (error) {
    logger.error('Unexpected error in guest pin endpoint', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

