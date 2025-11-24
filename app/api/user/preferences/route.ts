/**
 * User Preferences API Route
 * GET: Get current user's preferences
 * PUT: Update preferences
 */

import { NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { getUserPreferences, updateUserPreferences } from '@/lib/services/user-preferences';
import { ValidationError } from '@/lib/errors';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/error-handler';
import { z } from 'zod';

const logger = createScopedLogger('api/user/preferences');

/**
 * Preferences update schema
 */
const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().min(1).optional(),
  auto_save_conversations: z.boolean().optional(), // Boolean validation (Zod boolean already strict by default)
});

/**
 * GET /api/user/preferences
 * Get current user's preferences
 */
export async function GET() {
  try {
    const { lightweightUser } = await getUserData();

    if (!lightweightUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const preferences = await getUserPreferences(lightweightUser.userId);

    return NextResponse.json(preferences);
  } catch (error) {
    const sanitizedMessage = handleApiError(error, 'api/user/preferences');
    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/preferences
 * Update current user's preferences
 */
export async function PUT(req: Request) {
  try {
    const { lightweightUser } = await getUserData();

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
    const validationResult = updatePreferencesSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Invalid preferences data', errors);
    }

    const updatedPreferences = await updateUserPreferences(
      lightweightUser.userId,
      validationResult.data
    );

    return NextResponse.json(updatedPreferences);
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

    const sanitizedMessage = handleApiError(error, 'api/user/preferences');
    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}

