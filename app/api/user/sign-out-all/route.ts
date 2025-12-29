import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

const logger = createScopedLogger('api/user/sign-out-all');

/**
 * Sign out user from all devices
 * POST /api/user/sign-out-all
 *
 * Uses Supabase Admin API to revoke all sessions for the user
 * This forces sign out on all devices by invalidating all refresh tokens
 */
export async function POST(request: NextRequest) {
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

    // Get the user's session to extract the JWT
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      logger.error('Error getting session', sessionError);
      return NextResponse.json(
        { error: 'Failed to get session' },
        { status: 500 }
      );
    }

    // Use Supabase Management API to revoke all sessions
    // We need to use the admin client which requires service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Supabase service role credentials not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Call Supabase Management API to revoke all sessions
    // This invalidates all refresh tokens for the user
    const adminResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
      },
    });

    if (!adminResponse.ok) {
      const errorData = await adminResponse.json().catch(() => ({}));
      logger.error('Failed to revoke all sessions', {
        status: adminResponse.status,
        error: errorData,
      });
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
