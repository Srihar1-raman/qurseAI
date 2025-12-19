/**
 * Session Validation Utilities
 * Validates Supabase session integrity to prevent corrupted session errors
 */

import type { Session } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('utils/session-validation');

/**
 * Validate session integrity - check if session is valid and not corrupted
 * Prevents using corrupted sessions that cause "missing destination name oauth_client_id" errors
 * 
 * @param session - Supabase session to validate
 * @returns true if session is valid, false otherwise
 */
export function isValidSession(session: Session | null): boolean {
  if (!session) return false;
  
  // Must have access token
  if (!session.access_token) {
    logger.debug('Session invalid: missing access_token');
    return false;
  }
  
  // Must have user
  if (!session.user) {
    logger.debug('Session invalid: missing user');
    return false;
  }
  
  // Check if user has valid structure (has id at minimum)
  if (!session.user.id) {
    logger.debug('Session invalid: user missing id');
    return false;
  }
  
  // Check if access_token is a valid string (not empty)
  if (typeof session.access_token !== 'string' || session.access_token.length === 0) {
    logger.debug('Session invalid: invalid access_token');
    return false;
  }
  
  // Note: We don't check expires_at here because:
  // 1. Supabase automatically refreshes expired sessions if refresh token is valid
  // 2. If refresh token is expired, Supabase will return an error, not a corrupted session
  // 3. The corruption happens when refresh fails, which we detect via error handling
  
  return true;
}

