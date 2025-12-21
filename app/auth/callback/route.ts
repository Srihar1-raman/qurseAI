/**
 * OAuth Callback Route Handler
 * Handles OAuth redirects from providers (GitHub, Google, Twitter)
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { transferGuestToUser } from '@/lib/db/guest-transfer.server';
import { parseCookie, isValidUUID } from '@/lib/utils/session';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { validateReturnUrl } from '@/lib/utils/validate-return-url';

const logger = createScopedLogger('auth/callback');
const SESSION_COOKIE_NAME = 'session_id';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error('Error exchanging code for session', error);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    if (data.user) {
      const userId = data.user.id;

      // ============================================
      // Step 1: Ensure user profile exists
      // ============================================
      const { error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      // If user doesn't exist, create profile
      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
            avatar_url: data.user.user_metadata?.avatar_url,
          });

        if (insertError) {
          logger.error('Error creating user profile', insertError, { userId });
        } else {
          logger.info('User profile created', { userId });
        }
      } else if (fetchError) {
        logger.error('Error checking user profile', fetchError, { userId });
      }

      // ============================================
      // Step 2: Ensure user preferences exist (independent check)
      // ============================================
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingPrefs) {
        const { error: prefsError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            theme: 'auto',
            language: 'English',
            auto_save_conversations: true,
          });

        if (prefsError) {
          logger.error('Error creating user preferences', prefsError, { userId });
        } else {
          logger.info('User preferences created', { userId });
        }
      }

      // ============================================
      // Step 3: Ensure subscription exists (independent check)
      // ============================================
      // Use database function with SECURITY DEFINER to bypass RLS
      // This is safe because function validates input and only creates free subscriptions
      const { data: subscriptionId, error: subError } = await supabase
        .rpc('ensure_user_subscription', { user_uuid: userId });

      if (subError) {
        logger.error('Error ensuring subscription', subError, { userId });
      } else if (subscriptionId) {
        logger.info('Subscription ensured', { userId, subscriptionId, plan: 'free' });
      }

      // ============================================
      // Step 4: Transfer guest data to user (if session exists)
      // ============================================
      // Get session_id from cookie (server-side)
      const cookieHeader = request.headers.get('cookie') ?? '';
      const sessionId = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
      
      if (sessionId && isValidUUID(sessionId)) {
        try {
          // Derive session_hash from session_id (HMAC)
          const sessionHash = hmacSessionId(sessionId);
          
          // Transfer guest data to user (non-blocking)
          const transferResult = await transferGuestToUser(sessionHash, userId);
          
          if (transferResult.messagesTransferred > 0 || transferResult.conversationsTransferred > 0) {
            logger.info('Guest data transferred to user', {
              userId,
              messages: transferResult.messagesTransferred,
              conversations: transferResult.conversationsTransferred,
              rateLimits: transferResult.rateLimitsTransferred,
            });
          } else {
            logger.debug('No guest data to transfer', { userId, sessionHash });
          }
        } catch (error) {
          // Don't block auth flow if transfer fails
          // User can still sign in, transfer can be retried later
          logger.error('Failed to transfer guest data (non-blocking)', error, { userId });
        }
      }
    }

    // ============================================
    // Step 5: Redirect to return URL (industry standard: query parameter)
    // ============================================
    // Extract callbackUrl from callback URL (preserved through OAuth flow)
    const callbackUrl = requestUrl.searchParams.get('callbackUrl');
    const returnUrl = validateReturnUrl(callbackUrl);
    
    logger.debug('Redirecting after auth', { 
      callbackUrl, 
      returnUrl,
      userId: data.user?.id 
    });
    
    // Redirect to validated return URL (defaults to '/' if invalid)
    return NextResponse.redirect(`${origin}${returnUrl}`);
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}

