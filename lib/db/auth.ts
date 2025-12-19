/**
 * Client-Side Auth Queries
 * Authentication-related database operations for client-side use
 */

import { createClient } from '@/lib/supabase/client';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('db/auth');

/**
 * Get user's linked OAuth providers from Supabase auth identities
 * Includes retry logic to handle race conditions when session is being established
 */
export async function getUserLinkedProviders(retryCount = 0): Promise<string[]> {
  const supabase = createClient();
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 500; // 500ms delay between retries
  
  try {
    // Check if we have a valid session first (avoid unnecessary API calls)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // No valid session - return empty array (not an error, user might be guest)
      return [];
    }
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Check if it's a retryable error (network/auth errors that might resolve on retry)
      const isRetryableError = 
        error.name === 'AuthRetryableFetchError' ||
        error.name === 'AuthApiError' ||
        (error instanceof Error && (
          error.message.includes('Load failed') ||
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('Failed to fetch')
        ));
      
      // Retry on network/auth errors (session might not be fully ready)
      if (retryCount < MAX_RETRIES && isRetryableError) {
        logger.debug(`Retrying getUserLinkedProviders (attempt ${retryCount + 1}/${MAX_RETRIES})`, { 
          errorName: error.name,
          errorMessage: error.message 
        });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return getUserLinkedProviders(retryCount + 1);
      }
      
      // Don't log as error if it's just a missing user (guest mode) or session error
      const isSessionError = 
        error.message.includes('JWT') ||
        error.message.includes('session') ||
        error.message.includes('token') ||
        error.name === 'AuthSessionMissingError';
      
      if (isSessionError) {
        logger.debug('No valid session for getUserLinkedProviders', { error: error.message });
      } else {
      logger.error('Error fetching user identities', error);
      }
      return [];
    }
    
    if (!user) {
      // No user (guest mode) - not an error
      return [];
    }
    
    // user.identities contains all linked OAuth providers
    // Each identity has: { provider: 'google' | 'github' | 'twitter', ... }
    return user.identities?.map(identity => identity.provider) || [];
  } catch (error) {
    // Check if it's a retryable network error
    const isRetryableNetworkError = 
      error instanceof Error && (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('Load failed') ||
        error.name === 'TypeError' // "Load failed" often throws TypeError
      );
    
    // Retry on network errors
    if (retryCount < MAX_RETRIES && isRetryableNetworkError) {
      logger.debug(`Retrying getUserLinkedProviders after error (attempt ${retryCount + 1}/${MAX_RETRIES})`, {
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return getUserLinkedProviders(retryCount + 1);
    }
    
    logger.error('Error getting linked providers', error);
    return [];
  }
}

