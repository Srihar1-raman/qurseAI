import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { checkConversationAccess } from '@/lib/db/conversations.server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('api/conversations/[id]/unshare');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // Get authenticated user
    const { lightweightUser } = await getUserData();
    
    if (!lightweightUser?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Check conversation access
    const accessCheck = await checkConversationAccess(conversationId, lightweightUser.userId);
    
    if (accessCheck.error) {
      logger.error('Database error during access check', { conversationId, userId: lightweightUser.userId });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (!accessCheck.exists) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (!accessCheck.belongsToUser) {
      logger.warn('Unauthorized unshare attempt', { conversationId, userId: lightweightUser.userId });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update conversation to remove sharing
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        is_shared: false,
        share_token: null,
        shared_at: null,
        shared_message_count: null,
      })
      .eq('id', conversationId)
      .eq('user_id', lightweightUser.userId);

    if (updateError) {
      const userMessage = handleDbError(updateError, 'api/conversations/[id]/unshare');
      logger.error('Error unsharing conversation', updateError, { conversationId });
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

    logger.info('Conversation unshared', { conversationId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error unsharing conversation', error);
    return NextResponse.json(
      { error: 'Failed to unshare conversation' },
      { status: 500 }
    );
  }
}

