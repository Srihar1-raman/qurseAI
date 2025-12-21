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
import { createClient as createServiceClient } from '@supabase/supabase-js';

const logger = createScopedLogger('auth/callback');
const SESSION_COOKIE_NAME = 'session_id';

export async function GET(request: Request) {
  // 🔍 AGGRESSIVE LOGGING - Multiple methods to ensure we see it
  console.error('🔍🔍🔍 ERROR LEVEL - AUTH CALLBACK ROUTE CALLED');
  console.warn('🔍🔍🔍 WARN LEVEL - AUTH CALLBACK ROUTE CALLED');
  console.log('🔍🔍🔍 LOG LEVEL - AUTH CALLBACK ROUTE CALLED');
  console.info('🔍🔍🔍 INFO LEVEL - AUTH CALLBACK ROUTE CALLED');
  
  // Also throw a visible error that will definitely show in logs
  // (We'll catch it, but it will appear in error logs)
  try {
    throw new Error('🔍 FORCED ERROR TO VERIFY ROUTE IS CALLED');
  } catch (e) {
    console.error('🔍 Route verification error (expected):', e);
  }
  
  logger.info('🔍 AUTH CALLBACK ROUTE CALLED', {
    url: request.url,
    method: request.method,
    hasCode: !!request.url.includes('code='),
    timestamp: new Date().toISOString(),
  });

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  logger.info('🔍 AUTH CALLBACK - After URL parsing', {
    code: code ? code.substring(0, 10) + '...' : 'NULL',
    origin,
    fullUrl: requestUrl.toString(),
  });

  if (code) {
    logger.info('🔍 AUTH CALLBACK - Code exists, proceeding with auth exchange');
    const supabase = await createClient();
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error('🔍 AUTH CALLBACK - Error exchanging code for session', error, { code: code.substring(0, 10) + '...' });
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    logger.info('🔍 AUTH CALLBACK - Code exchanged successfully', {
      hasUser: !!data.user,
      userId: data.user?.id,
    });

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
      
      // 🔍 DIAGNOSTIC LOGGING - Remove after root cause verification
      logger.info('🔍 AUTH CALLBACK DIAGNOSTIC', {
        userId: data.user?.id,
        cookieHeaderLength: cookieHeader.length,
        cookieHeaderPreview: cookieHeader.substring(0, 200), // First 200 chars
        sessionId: sessionId || 'NULL',
        hasSessionId: !!sessionId,
        isValidUUID: sessionId ? isValidUUID(sessionId) : false,
        allCookieNames: cookieHeader.split(';').map(c => c.trim().split('=')[0]).filter(Boolean),
        hasSessionIdCookie: cookieHeader.includes('session_id'),
        userAgent: request.headers.get('user-agent')?.substring(0, 100),
        referer: request.headers.get('referer'),
        origin: request.headers.get('origin'),
        url: requestUrl.toString(),
      });

      // If no session_id, check if guest conversations exist (helps diagnose)
      if (!sessionId || !isValidUUID(sessionId)) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && serviceKey) {
          const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);
          const { data: recentGuestConvs, error: guestError } = await serviceSupabase
            .from('guest_conversations')
            .select('id, session_hash, created_at, title')
            .order('created_at', { ascending: false })
            .limit(5);
          
          logger.info('🔍 Guest conversations check (no valid session_id)', {
            error: guestError?.message,
            recentCount: recentGuestConvs?.length || 0,
            recentConvs: recentGuestConvs?.map(c => ({ 
              id: c.id, 
              created: c.created_at,
              title: c.title?.substring(0, 30)
            })),
          });
        }
      }
      
      if (sessionId && isValidUUID(sessionId)) {
        try {
          // Derive session_hash from session_id (HMAC)
          const sessionHash = hmacSessionId(sessionId);
          
          logger.info('🔍 Attempting transfer', { 
            sessionId, 
            sessionHash: sessionHash.substring(0, 20) + '...' 
          });
          
          // Transfer guest data to user (non-blocking)
          const transferResult = await transferGuestToUser(sessionHash, userId);
          
          logger.info('🔍 Transfer result', {
            messages: transferResult.messagesTransferred,
            conversations: transferResult.conversationsTransferred,
            rateLimits: transferResult.rateLimitsTransferred,
          });
          
          if (transferResult.messagesTransferred > 0 || transferResult.conversationsTransferred > 0) {
            logger.info('Guest data transferred to user', {
              userId,
              messages: transferResult.messagesTransferred,
              conversations: transferResult.conversationsTransferred,
              rateLimits: transferResult.rateLimitsTransferred,
            });
            
            // Optional: Store transfer result for UI notification
            // Frontend can show: "X messages transferred to your account"
          } else {
            logger.debug('No guest data to transfer', { userId, sessionHash });
          }
        } catch (error) {
          // Don't block auth flow if transfer fails
          // User can still sign in, transfer can be retried later
          logger.error('Failed to transfer guest data (non-blocking)', error, { userId });
        }
      } else {
        logger.warn('🔍 No valid session_id - transfer skipped', { 
          userId,
          sessionId: sessionId || 'null',
          isValid: sessionId ? isValidUUID(sessionId) : false
        });
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
  logger.warn('🔍 AUTH CALLBACK - No code parameter, redirecting to login', {
    url: request.url,
    searchParams: Object.fromEntries(new URL(request.url).searchParams),
  });
  return NextResponse.redirect(`${origin}/login`);
}

