/**
 * Next.js Middleware
 * Handles Supabase session refresh for all requests
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  // getUser() automatically refreshes the session if it's expired but refresh token is valid
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Handle auth errors gracefully (expired refresh token, invalid session, etc.)
  // Don't block the request - let the app handle auth state on client side
  // This prevents middleware from breaking the app when session expires
  // Client-side AuthContext will detect the expired session and handle sign-out
  if (authError && process.env.NODE_ENV === 'development') {
    // Only log in development to avoid noise in production
    // Common errors: expired refresh token, invalid session cookie
    console.debug('[middleware] Auth error (non-blocking):', authError.message);
  }

  // Redirect logged-in users away from auth pages
  if (user && (
    request.nextUrl.pathname === '/login' || 
    request.nextUrl.pathname === '/signup'
  )) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Optionally: Redirect to login if user is not authenticated and trying to access protected routes
  // Uncomment the following lines if you want to protect routes
  // /*
  // if (
  //   !user &&
  //   !request.nextUrl.pathname.startsWith('/login') &&
  //   !request.nextUrl.pathname.startsWith('/signup') &&
  //   !request.nextUrl.pathname.startsWith('/auth')
  // ) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = '/';
  //   return NextResponse.redirect(url);
  // }
  // */

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

