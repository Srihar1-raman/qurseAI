import { NextResponse } from 'next/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const runtime = 'edge';

const logger = createScopedLogger('api/user/sign-out-all');

/**
 * Sign out user from all devices
 * POST /api/user/sign-out-all
 *
 * Uses Supabase Admin API to revoke all sessions for the user
 * This forces sign out on all devices by deleting all sessions for the user
 */
export async function POST() {
  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user's JWT token from their current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.access_token) {
      logger.error('No active session found');
      return NextResponse.json(
        { error: 'No active session' },
        { status: 400 }
      );
    }

    // Use admin client to sign out from all devices
    // Pass the JWT token and specify 'global' scope to revoke all sessions
    const adminClient = await createAdminClient();

    const { error: signOutError } = await adminClient.auth.admin.signOut(
      session.access_token,  // JWT token
      'global'              // Revoke all sessions across all devices
    );

    if (signOutError) {
      logger.error('Failed to sign out from all devices', signOutError);
      return NextResponse.json(
        { error: 'Failed to sign out from all devices' },
        { status: 500 }
      );
    }

    logger.info('Successfully revoked all sessions for user', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Successfully signed out from all devices',
    });

  } catch (error) {
    logger.error('Unexpected error in sign-out-all API', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
