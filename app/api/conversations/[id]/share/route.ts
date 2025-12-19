import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { checkConversationAccess } from '@/lib/db/conversations.server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import type { ShareConversationResponse } from '@/lib/types';
import { randomUUID } from 'crypto';

const logger = createScopedLogger('api/conversations/[id]/share');

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
      logger.warn('Unauthorized share attempt', { conversationId, userId: lightweightUser.userId });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get current message count
    const supabase = await createClient();
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (countError) {
      const userMessage = handleDbError(countError, 'api/conversations/[id]/share');
      logger.error('Error counting messages', countError, { conversationId });
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

    const messageCount = count || 0;

    // Generate share token (UUID v4)
    const shareToken = randomUUID();

    // Update conversation with share data
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        share_token: shareToken,
        shared_at: new Date().toISOString(),
        is_shared: true,
        shared_message_count: messageCount,
      })
      .eq('id', conversationId)
      .eq('user_id', lightweightUser.userId);

    if (updateError) {
      const userMessage = handleDbError(updateError, 'api/conversations/[id]/share');
      logger.error('Error updating conversation share status', updateError, { conversationId, shareToken });
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

    // Construct share URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const shareUrl = `${baseUrl}/shared/${shareToken}`;

    const response: ShareConversationResponse = {
      shareToken,
      shareUrl,
    };

    logger.info('Conversation shared', { conversationId, shareToken, messageCount });
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error sharing conversation', error);
    return NextResponse.json(
      { error: 'Failed to share conversation' },
      { status: 500 }
    );
  }
}

