import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('api/conversations/pin');

/**
 * PATCH /api/conversations/[id]/pin
 * Toggle pin status for a conversation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current pin status
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, pinned, user_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (fetchError) {
      const userMessage = handleDbError(fetchError, 'api/conversations/pin');
      logger.error('Error fetching conversation', fetchError, { conversationId, userId: user.id });
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
    if (conversation.user_id !== user.id) {
      logger.warn('Unauthorized pin attempt', { conversationId, userId: user.id, ownerId: conversation.user_id });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Toggle pin status
    const newPinnedStatus = !conversation.pinned;

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ pinned: newPinnedStatus })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (updateError) {
      const userMessage = handleDbError(updateError, 'api/conversations/pin');
      logger.error('Error updating pin status', updateError, { conversationId, userId: user.id });
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

    logger.debug('Pin status toggled', { conversationId, userId: user.id, pinned: newPinnedStatus });

    return NextResponse.json({
      success: true,
      pinned: newPinnedStatus,
    });
  } catch (error) {
    logger.error('Unexpected error in pin endpoint', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

