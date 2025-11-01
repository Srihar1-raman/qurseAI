/**
 * OAuth Callback Route Handler
 * Handles OAuth redirects from providers (GitHub, Google, Twitter)
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('auth/callback');

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error('Error exchanging code for session', error, { code: code.substring(0, 10) + '...' });
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    if (data.user) {
      // Check if user profile exists in users table
      const { error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single();

      // If user doesn't exist in users table, create profile
      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
            avatar_url: data.user.user_metadata?.avatar_url,
          });

        if (insertError) {
          logger.error('Error creating user profile', insertError, { userId: data.user.id });
        }
      } else if (fetchError) {
        logger.error('Error checking user profile', fetchError, { userId: data.user.id });
      }
    }

    // Redirect to homepage after successful auth
    return NextResponse.redirect(`${origin}/`);
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}

