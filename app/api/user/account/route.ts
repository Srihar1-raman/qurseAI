/**
 * Account Management API Route
 * DELETE /api/user/account: Delete account
 * DELETE /api/user/conversations: Clear all conversations
 */

import { NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import {
  deleteUserAccount,
  clearAllConversations,
} from '@/lib/services/account-management';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('api/user/account');

/**
 * DELETE /api/user/account
 * Delete user account and all related data
 */
export async function DELETE(req: Request) {
  try {
    const { lightweightUser } = await getUserData();

    if (!lightweightUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check for confirmation in request body
    const body = await req.json().catch(() => ({}));
    if (body.confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { "confirmation": "DELETE" } in request body.' },
        { status: 400 }
      );
    }

    await deleteUserAccount(lightweightUser.userId);

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    const sanitizedMessage = handleApiError(error, 'api/user/account');
    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}

