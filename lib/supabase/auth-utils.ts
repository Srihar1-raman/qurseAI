/**
 * Authentication Utilities
 * Optimized user fetching - single getUser() call for both lightweight and full data
 */

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';

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
  fullUser: { id: string; email?: string; user_metadata?: any } | null;
  supabaseClient: Awaited<ReturnType<typeof createClient>>;
}> {
  try {
    // Reuse provided client or create new one
    const client = supabase || await createClient();
    
    // Single getUser() call - use result for both lightweight and full
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error || !user) {
      // No user (guest mode) - not an error
      return {
        lightweightUser: null,
        fullUser: null,
        supabaseClient: client,
      };
    }
    
    // Derive lightweight user from full user (no extra API call)
    const lightweightUser: LightweightUser = {
      userId: user.id,
      email: user.email || '',
      isProUser: false, // TODO: Get from subscription when implemented
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

