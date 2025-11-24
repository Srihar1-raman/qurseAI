/**
 * User Profile API Route
 * GET: Get current user's profile
 * PUT: Update profile (name, avatar)
 */

import { NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { updateUserProfile } from '@/lib/services/user-profile';
import { createClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/error-handler';
import { z } from 'zod';

const logger = createScopedLogger('api/user/profile');

/**
 * Profile update schema
 */
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

/**
 * GET /api/user/profile
 * Get current user's profile
 */
export async function GET() {
  try {
    const { fullUser, supabaseClient } = await getUserData();

    if (!fullUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get full user profile from users table
    const { data: userProfile, error } = await supabaseClient
      .from('users')
      .select('id, email, name, avatar_url, created_at, updated_at')
      .eq('id', fullUser.id)
      .single();

    if (error) {
      logger.error('Error fetching user profile', error, { userId: fullUser.id });
      throw new Error('Failed to fetch user profile');
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    const sanitizedMessage = handleApiError(error, 'api/user/profile');
    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Update current user's profile
 */
export async function PUT(req: Request) {
  try {
    const { lightweightUser, supabaseClient } = await getUserData();

    if (!lightweightUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request body
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Invalid profile data', errors);
    }

    // Normalize empty string to undefined for avatar_url
    const updates = { ...validationResult.data };
    if (updates.avatar_url === '') {
      updates.avatar_url = undefined;
    }

    await updateUserProfile(lightweightUser.userId, updates);

    // Return updated profile - reuse supabase client from initial getUserData call
    const { data: userProfile, error: fetchError } = await supabaseClient
      .from('users')
      .select('id, email, name, avatar_url, created_at, updated_at')
      .eq('id', lightweightUser.userId)
      .single();

    if (fetchError) {
      logger.error('Error fetching updated profile', fetchError, { userId: lightweightUser.userId });
      throw new Error('Failed to fetch updated profile');
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          validationErrors: error.validationErrors,
        },
        { status: error.statusCode }
      );
    }

    const sanitizedMessage = handleApiError(error, 'api/user/profile');
    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}

