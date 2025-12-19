import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { forkSharedConversation } from '@/lib/db/conversations.server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('api/shared/[token]/continue');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: shareToken } = await params;

    // Validate token format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(shareToken)) {
      return NextResponse.json(
        { error: 'Invalid share token format' },
        { status: 400 }
      );
    }

    // Get authenticated user (must be authenticated, not guest)
    const { lightweightUser } = await getUserData();
    
    if (!lightweightUser?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required to continue conversation' },
        { status: 401 }
      );
    }

    // Fork shared conversation
    let newConversationId: string;
    try {
      newConversationId = await forkSharedConversation(shareToken, lightweightUser.userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a "not found" error
      if (errorMessage.includes('not found') || errorMessage.includes('Shared conversation')) {
        return NextResponse.json(
          { error: 'Shared conversation not found or no longer available' },
          { status: 404 }
        );
      }

      const userMessage = handleDbError(error, 'api/shared/[token]/continue');
      logger.error('Error forking shared conversation', error, { shareToken, userId: lightweightUser.userId });
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

    logger.info('Shared conversation forked', { shareToken, newConversationId, userId: lightweightUser.userId });
    return NextResponse.json({ conversationId: newConversationId });
  } catch (error) {
    logger.error('Error continuing shared conversation', error);
    return NextResponse.json(
      { error: 'Failed to continue shared conversation' },
      { status: 500 }
    );
  }
}

