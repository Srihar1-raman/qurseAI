'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';
import { isValidSession } from '@/lib/utils/session-validation';
import { useLinkedProviders } from '@/hooks/use-linked-providers';
import { useProStatus } from '@/hooks/use-pro-status';

const logger = createScopedLogger('auth/context');

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProUser: boolean;
  isLoadingProStatus: boolean;
  linkedProviders: string[];
  isLoadingProviders: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  // Ref to track current session for callbacks (prevents stale closure issues)
  const sessionRef = useRef<Session | null>(null);

  // Use extracted hooks for Pro status and linked providers
  const { isProUser, isLoadingProStatus } = useProStatus({
    session,
    sessionRef,
    userId: user?.id || null,
    user: user?.id ? { id: user.id } : null,
  });

  const { linkedProviders, isLoadingProviders } = useLinkedProviders({
    session,
    sessionRef,
    userId: user?.id || null,
  });

  // Check if Supabase env vars are available
  const hasSupabaseConfig = 
    typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = hasSupabaseConfig ? createClient() : null;

  useEffect(() => {
    // Skip auth if Supabase is not configured
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        // Get initial session
        // getSession() returns the current session from cookies
        // getSession() automatically refreshes expired sessions if refresh token is valid
        // If it returns null, it means either:
        // 1. No session exists (user never logged in) - treat as guest
        // 2. Refresh token expired - user needs to sign in again (but don't sign out, just clear state)
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        // Handle session errors
        // Only sign out if it's a corruption error, not a normal expiration
        if (sessionError) {
          const isCorruptionError = 
            sessionError.message?.includes('oauth_client_id') ||
            sessionError.message?.includes('missing destination');
          
          const isRefreshTokenExpired = 
            sessionError.message?.includes('refresh_token') ||
            sessionError.message?.includes('refresh token') ||
            sessionError.name === 'AuthSessionMissingError';
          
          // Note: "JWT expired" usually means access token expired, which is normal
          // and should auto-refresh. Only treat as refresh token expired if explicitly stated.
          
          if (isCorruptionError) {
            // Session is corrupted - sign out to clear corrupted cookies
            logger.debug('Session corruption detected - clearing', { error: sessionError.message });
            if (supabase) {
              try {
                await supabase.auth.signOut();
              } catch (signOutError) {
                // Ignore sign out errors
              }
            }
          } else if (isRefreshTokenExpired) {
            // Refresh token expired - normal case, user needs to sign in again
            // Don't sign out - just clear state (cookies are already invalid)
            logger.debug('Refresh token expired - user needs to sign in', { error: sessionError.message });
          } else {
            // Other error (network, etc.) - log but don't sign out
            logger.debug('Session error (non-critical)', { error: sessionError.message });
          }
          
          // Clear state for any error (user will be treated as guest)
          setSession(null);
          sessionRef.current = null;
          setUser(null);
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        // If no session and no error, user is guest (never logged in)
        if (!initialSession) {
          setSession(null);
          sessionRef.current = null;
          setUser(null);
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        // Validate session integrity before using it
        // This prevents using corrupted sessions that cause "missing destination name oauth_client_id" errors
        if (!isValidSession(initialSession)) {
          logger.debug('Session invalid or corrupted on init - clearing', {
            hasSession: !!initialSession,
            hasAccessToken: !!initialSession?.access_token,
            hasUser: !!initialSession?.user,
          });
          // Only sign out if it's actually corrupted, not just expired
          if (supabase && initialSession) {
            // Session exists but is invalid - likely corrupted
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              // Ignore sign out errors
            }
          }
          setSession(null);
          sessionRef.current = null;
          setUser(null);
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        // Test the session by actually using it
        // A session can pass structure validation but still be corrupted internally
        // Calling getUser() will reveal if the session is actually usable
        const { data: { user: testUser }, error: testError } = await supabase.auth.getUser();
        
        if (testError) {
          // Session failed when actually used - it's corrupted
          const isCorruptionError = 
            testError.message?.includes('oauth_client_id') ||
            testError.message?.includes('missing destination');
          
          if (isCorruptionError) {
            logger.debug('Session corruption detected when testing - clearing', {
              error: testError.message,
              errorName: testError.name,
            });
            // Sign out to clear corrupted cookies
            if (supabase) {
              try {
                await supabase.auth.signOut();
              } catch (signOutError) {
                // Ignore sign out errors
              }
            }
          } else {
            logger.debug('Session test failed (non-corruption error)', {
              error: testError.message,
              errorName: testError.name,
            });
          }
          
          // Clear state for any error
          setSession(null);
          sessionRef.current = null;
          setUser(null);
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        if (!testUser) {
          // No user from session - treat as guest
          setSession(null);
          sessionRef.current = null;
          setUser(null);
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        // Session passed both structure validation AND actual usage test
        // It's safe to use
        setSession(initialSession);
        sessionRef.current = initialSession; // Update ref for callbacks

        // Use the tested user (from getUser() call) - it's guaranteed to be valid
        if (testUser) {
          const userData = {
            id: testUser.id,
            email: testUser.email!,
            name: testUser.user_metadata?.full_name || testUser.user_metadata?.name,
            avatar_url: testUser.user_metadata?.avatar_url,
            created_at: testUser.created_at,
          };
          setUser(userData);
          
          // Reset user tracking if user changed
          if (lastUserIdRef.current !== userData.id) {
            lastUserIdRef.current = userData.id;
          }
        }
      } catch (error) {
        logger.error('Auth initialization error', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to auth state changes (prevents race conditions)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        logger.debug('Auth state changed', { event, hasSession: !!newSession });
        
        // Handle session expiration and sign-out events FIRST
        // SIGNED_OUT: User explicitly signed out
        // TOKEN_REFRESHED with null session: Token refresh failed (refresh token expired)
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !newSession)) {
          setUser(null);
          setSession(null);
          sessionRef.current = null; // Clear ref
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }

        // Validate session before setting it (for all other events)
        // If session is corrupted, clear it immediately to prevent "missing destination name oauth_client_id" errors
        if (newSession && !isValidSession(newSession)) {
          logger.debug('Corrupted session detected in auth state change - clearing', {
            event,
            hasAccessToken: !!newSession?.access_token,
            hasUser: !!newSession?.user,
          });
          // Clear corrupted session - sign out to remove corrupted cookies
          if (supabase) {
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              // Ignore sign out errors
            }
          }
          setSession(null);
          sessionRef.current = null; // Clear ref
          setUser(null);
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        // Session is valid (or null) - set it
        // This handles: SIGNED_IN, TOKEN_REFRESHED (with valid session), USER_UPDATED
        setSession(newSession);
        sessionRef.current = newSession; // Update ref for callbacks

        if (newSession?.user) {
          // Use session metadata directly (no DB fetch needed)
          const userData = {
            id: newSession.user.id,
            email: newSession.user.email!,
            name: newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name,
            avatar_url: newSession.user.user_metadata?.avatar_url,
            created_at: newSession.user.created_at,
          };
          setUser(userData);
          
          // Reset user tracking if user changed (handles user switch scenario)
          if (lastUserIdRef.current !== userData.id) {
            lastUserIdRef.current = userData.id;
          }
        } else {
          setUser(null);
          lastUserIdRef.current = null;
        }

        // Set loading to false after auth state change is processed
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    if (!supabase) return;
    
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      sessionRef.current = null; // Clear ref
      lastUserIdRef.current = null;
    } catch (error) {
      logger.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session,
        isLoading,
        isAuthenticated: !!user,
        isProUser,
        isLoadingProStatus,
        linkedProviders,
        isLoadingProviders,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

