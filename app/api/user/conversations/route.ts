/**
 * Conversations Management API Route
 * DELETE /api/user/conversations: Clear all conversations
 */

import { NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { clearAllConversations } from '@/lib/services/account-management';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('api/user/conversations');

/**
 * DELETE /api/user/conversations
 * Clear all conversations for current user
 */
export async function DELETE() {
  try {
    const { lightweightUser } = await getUserData();

    if (!lightweightUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await clearAllConversations(lightweightUser.userId);

    return NextResponse.json({ success: true, message: 'All conversations cleared successfully' });
  } catch (error) {
    const sanitizedMessage = handleApiError(error, 'api/user/conversations');
    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}

