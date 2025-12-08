/**
 * Authentication Utilities
 * Optimized user fetching - single getUser() call for both lightweight and full data
 */

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { isProUser } from '@/lib/services/subscription';
import type { SupabaseUserMetadata } from '@/lib/types';

const logger = createScopedLogger('supabase/auth-utils');

/**
 * Lightweight user data for fast auth checks
 * Only contains essential fields needed for access control
 */
export interface LightweightUser {
  userId: string;
  email: string;
  isProUser: boolean;
}

/**
 * Cached getUser() call
 * Uses React cache() to deduplicate getUser() calls within the same React render pass
 * NOTE: Middleware runs outside React context, so it cannot use this cache.
 * This cache only works for server components within the same request.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    logger.error('Error in getCachedUser', error);
    return { user: null, error };
  }
  
  return { user, error: null };
});

/**
 * Get user data (single call optimization)
 * Fetches user once and returns both lightweight and full user data
 * This avoids making duplicate getUser() calls
 * 
 * @param supabase - Optional Supabase client (creates one if not provided)
 * @returns Object with lightweight user and full user, or both null if guest
 */
export async function getUserData(supabase?: Awaited<ReturnType<typeof createClient>>): Promise<{
  lightweightUser: LightweightUser | null;
  fullUser: { id: string; email?: string; user_metadata?: SupabaseUserMetadata } | null;
  supabaseClient: Awaited<ReturnType<typeof createClient>>;
}> {
  try {
    // Reuse provided client or create new one
    const client = supabase || await createClient();
    
    // CRITICAL: Check session validity before calling getUser()
    // This prevents calling getUser() with expired/corrupted sessions that cause "missing destination name oauth_client_id" errors
    const { data: { session } } = await client.auth.getSession();
    
    // If session is invalid or expired, return null (don't call getUser() with corrupted session)
    if (!session?.access_token || !session?.user) {
      logger.debug('No valid session for getUserData - returning null');
      return {
        lightweightUser: null,
        fullUser: null,
        supabaseClient: client,
      };
    }
    
    // Note: We don't check expires_at here because:
    // 1. Supabase automatically refreshes expired sessions if refresh token is valid
    // 2. If refresh token is expired, getUser() will return an error, which we handle below
    // 3. Checking expires_at here would prevent valid refresh attempts
    
    // Session is valid - call getUser()
    // Single getUser() call - use result for both lightweight and full
    const { data: { user }, error } = await client.auth.getUser();
    
    // CRITICAL: If getUser() fails with session-related error, log it but don't sign out
    // Server-side signOut() clears cookies, but client-side AuthContext will handle sign-out
    // when it detects the session is invalid. This prevents race conditions.
    if (error) {
      // Check if it's a session corruption error
      if (error.message.includes('oauth_client_id') || 
          error.message.includes('missing destination') ||
          error.message.includes('JWT') ||
          error.message.includes('session')) {
        logger.debug('Session corruption detected in getUserData', { error: error.message });
        // Don't sign out here - let client-side AuthContext handle it
        // Server-side signOut() can cause issues if called from multiple places
      }
      
      // No user (guest mode or session error) - not an error
      return {
        lightweightUser: null,
        fullUser: null,
        supabaseClient: client,
      };
    }
    
    if (!user) {
      // No user (guest mode) - not an error
      return {
        lightweightUser: null,
        fullUser: null,
        supabaseClient: client,
      };
    }
    
    // Check Pro status (async, but we'll await it)
    const proStatus = await isProUser(user.id);
    
    // Derive lightweight user from full user (no extra API call)
    const lightweightUser: LightweightUser = {
      userId: user.id,
      email: user.email || '',
      isProUser: proStatus,
    };
    
    return {
      lightweightUser,
      fullUser: user,
      supabaseClient: client,
    };
  } catch (error) {
    logger.error('Error fetching user data', error);
    // Return null on error (treat as guest)
    const client = supabase || await createClient();
    return {
      lightweightUser: null,
      fullUser: null,
      supabaseClient: client,
    };
  }
}

