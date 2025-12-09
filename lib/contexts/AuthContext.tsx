'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserLinkedProviders } from '@/lib/db/queries';
import type { User } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('auth/context');

/**
 * Validate session integrity - check if session is valid and not corrupted
 * CRITICAL: Prevents using corrupted sessions that cause "missing destination name oauth_client_id" errors
 */
function isValidSession(session: Session | null): boolean {
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
  
  // Check if session has valid structure
  // The "missing destination name oauth_client_id" error occurs when session is corrupted
  // We can't directly check oauth_client_id (it's internal), but we can check for required fields
  
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
  const [isProUser, setIsProUser] = useState(false);
  const [isLoadingProStatus, setIsLoadingProStatus] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const providersFetchInitiatedRef = useRef(false);
  const proStatusFetchInitiatedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  // Realtime channel ref - type inferred from Supabase client
  // Using any to avoid complex type inference (channel type is internal to Supabase)
  const subscriptionChannelRef = useRef<any>(null);
  // Guard to prevent recursive cleanup (infinite loop)
  const isCleaningUpChannelRef = useRef(false);
  // Ref to track current session for callbacks (prevents stale closure issues)
  const sessionRef = useRef<Session | null>(null);

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
        // CRITICAL: getSession() automatically refreshes expired sessions if refresh token is valid
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
          setIsProUser(false);
          setLinkedProviders([]);
          providersFetchInitiatedRef.current = false;
          proStatusFetchInitiatedRef.current = false;
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        // If no session and no error, user is guest (never logged in)
        if (!initialSession) {
          setSession(null);
          sessionRef.current = null;
          setUser(null);
          setIsProUser(false);
          setLinkedProviders([]);
          providersFetchInitiatedRef.current = false;
          proStatusFetchInitiatedRef.current = false;
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        // CRITICAL: Validate session integrity before using it
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
          setIsProUser(false);
          setLinkedProviders([]);
          providersFetchInitiatedRef.current = false;
          proStatusFetchInitiatedRef.current = false;
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        // CRITICAL: Test the session by actually using it
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
          setIsProUser(false);
          setLinkedProviders([]);
          providersFetchInitiatedRef.current = false;
          proStatusFetchInitiatedRef.current = false;
          lastUserIdRef.current = null;
          setIsLoading(false);
          return;
        }
        
        if (!testUser) {
          // No user from session - treat as guest
          setSession(null);
          sessionRef.current = null;
          setUser(null);
          setIsProUser(false);
          setLinkedProviders([]);
          providersFetchInitiatedRef.current = false;
          proStatusFetchInitiatedRef.current = false;
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
          
          // Reset providers and Pro status fetch if user changed
          if (lastUserIdRef.current !== userData.id) {
            providersFetchInitiatedRef.current = false;
            proStatusFetchInitiatedRef.current = false;
            lastUserIdRef.current = userData.id;
          }
          
          // Fetch linked providers once when user loads (cached across navigations)
          // CRITICAL: Only fetch if session is still valid (might have expired between checks)
          if (!providersFetchInitiatedRef.current && isValidSession(initialSession)) {
            providersFetchInitiatedRef.current = true;
            setIsLoadingProviders(true);
            getUserLinkedProviders()
              .then(providers => {
                // Verify session is still valid before setting providers (use ref to avoid stale closure)
                if (isValidSession(sessionRef.current)) {
                setLinkedProviders(providers);
                setIsLoadingProviders(false);
                } else {
                  logger.debug('Session expired during provider fetch - skipping');
                  setIsLoadingProviders(false);
                  providersFetchInitiatedRef.current = false;
                }
              })
              .catch(error => {
                logger.error('Failed to load linked providers', error);
                setIsLoadingProviders(false);
                providersFetchInitiatedRef.current = false; // Allow retry
              });
          }
          
          // Fetch Pro status once when user loads (cached across navigations)
          // CRITICAL: Only fetch if session is still valid (might have expired between checks)
          if (!proStatusFetchInitiatedRef.current && isValidSession(initialSession)) {
            proStatusFetchInitiatedRef.current = true;
            setIsLoadingProStatus(true);
            fetch('/api/user/subscription')
              .then(res => {
                // Check if response indicates session error
                if (!res.ok && res.status === 401) {
                  throw new Error('Session expired');
                }
                return res.json();
              })
              .then(data => {
                // Verify session is still valid before setting Pro status (use ref to avoid stale closure)
                if (isValidSession(sessionRef.current)) {
                  setIsProUser(data.isPro ?? false);
                  setIsLoadingProStatus(false);
                } else {
                  logger.debug('Session expired during Pro status fetch - skipping');
                  setIsProUser(false);
                  setIsLoadingProStatus(false);
                  proStatusFetchInitiatedRef.current = false;
                }
              })
              .catch(error => {
                logger.error('Failed to load Pro status', error);
                setIsProUser(false);
                setIsLoadingProStatus(false);
                proStatusFetchInitiatedRef.current = false; // Allow retry
              });
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
          setIsProUser(false);
          setLinkedProviders([]);
          providersFetchInitiatedRef.current = false;
          proStatusFetchInitiatedRef.current = false;
          lastUserIdRef.current = null;
          // Clean up subscription realtime channel
          if (subscriptionChannelRef.current && supabase && !isCleaningUpChannelRef.current) {
            isCleaningUpChannelRef.current = true;
            try {
              supabase.removeChannel(subscriptionChannelRef.current);
              subscriptionChannelRef.current = null;
            } finally {
              setTimeout(() => {
                isCleaningUpChannelRef.current = false;
              }, 100);
            }
          }
          setIsLoading(false);
          return;
        }

        // CRITICAL: Validate session before setting it (for all other events)
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
          setIsProUser(false);
          setLinkedProviders([]);
          providersFetchInitiatedRef.current = false;
          proStatusFetchInitiatedRef.current = false;
          lastUserIdRef.current = null;
          // Clean up subscription realtime channel
          if (subscriptionChannelRef.current && supabase && !isCleaningUpChannelRef.current) {
            isCleaningUpChannelRef.current = true;
            try {
              supabase.removeChannel(subscriptionChannelRef.current);
              subscriptionChannelRef.current = null;
            } finally {
              setTimeout(() => {
                isCleaningUpChannelRef.current = false;
              }, 100);
            }
          }
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
          
          // Reset providers and Pro status fetch if user changed (handles user switch scenario)
          if (lastUserIdRef.current !== userData.id) {
            providersFetchInitiatedRef.current = false;
            proStatusFetchInitiatedRef.current = false;
            setLinkedProviders([]); // Clear old user's providers
            setIsProUser(false); // Clear old user's Pro status
            lastUserIdRef.current = userData.id;
          }
          
          // Fetch linked providers if not already loaded (user changed)
          // CRITICAL: Only fetch if session is still valid
          if (!providersFetchInitiatedRef.current && isValidSession(newSession)) {
            providersFetchInitiatedRef.current = true;
            setIsLoadingProviders(true);
            getUserLinkedProviders()
              .then(providers => {
                // Verify session is still valid before setting providers (use ref to avoid stale closure)
                if (isValidSession(sessionRef.current)) {
                setLinkedProviders(providers);
                setIsLoadingProviders(false);
                } else {
                  logger.debug('Session expired during provider fetch - skipping');
                  setIsLoadingProviders(false);
                  providersFetchInitiatedRef.current = false;
                }
              })
              .catch(error => {
                logger.error('Failed to load linked providers', error);
                setIsLoadingProviders(false);
                providersFetchInitiatedRef.current = false; // Allow retry
              });
          }
          
          // Fetch Pro status if not already loaded (user changed)
          // CRITICAL: Only fetch if session is still valid
          if (!proStatusFetchInitiatedRef.current && isValidSession(newSession)) {
            proStatusFetchInitiatedRef.current = true;
            setIsLoadingProStatus(true);
            fetch('/api/user/subscription')
              .then(res => {
                // Check if response indicates session error
                if (!res.ok && res.status === 401) {
                  throw new Error('Session expired');
                }
                return res.json();
              })
              .then(data => {
                // Verify session is still valid before setting Pro status (use ref to avoid stale closure)
                if (isValidSession(sessionRef.current)) {
                  setIsProUser(data.isPro ?? false);
                  setIsLoadingProStatus(false);
                } else {
                  logger.debug('Session expired during Pro status fetch - skipping');
                  setIsProUser(false);
                  setIsLoadingProStatus(false);
                  proStatusFetchInitiatedRef.current = false;
                }
              })
              .catch(error => {
                logger.error('Failed to load Pro status', error);
                setIsProUser(false);
                setIsLoadingProStatus(false);
                proStatusFetchInitiatedRef.current = false; // Allow retry
              });
          }
        } else {
          setUser(null);
          setIsProUser(false);
          setLinkedProviders([]);
          providersFetchInitiatedRef.current = false;
          proStatusFetchInitiatedRef.current = false;
          lastUserIdRef.current = null;
          // Clean up subscription realtime channel when user is cleared
          if (subscriptionChannelRef.current && supabase && !isCleaningUpChannelRef.current) {
            isCleaningUpChannelRef.current = true;
            try {
              supabase.removeChannel(subscriptionChannelRef.current);
              subscriptionChannelRef.current = null;
            } finally {
              setTimeout(() => {
                isCleaningUpChannelRef.current = false;
              }, 100);
            }
          }
        }

        // Set loading to false after auth state change is processed
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      // Clean up subscription realtime channel if it exists
      if (subscriptionChannelRef.current && supabase && !isCleaningUpChannelRef.current) {
        isCleaningUpChannelRef.current = true;
        try {
          supabase.removeChannel(subscriptionChannelRef.current);
          subscriptionChannelRef.current = null;
        } finally {
          setTimeout(() => {
            isCleaningUpChannelRef.current = false;
          }, 100);
        }
      }
    };
  }, [supabase]);

  // Real-time subscription: Listen for subscription changes (UPDATE)
  // This ensures Pro status updates immediately when subscription changes in DB
  // (e.g., user upgrades, admin changes plan, webhook updates subscription)
  // CRITICAL: Only subscribe when session is valid - expired sessions cause connection errors
  useEffect(() => {
    // Don't subscribe if no supabase client, no user, or no valid session
    // CRITICAL: Validate session integrity - corrupted sessions cause "missing destination name oauth_client_id" errors
    if (!supabase || !user?.id || !session || !isValidSession(session)) {
          // Clean up any existing subscription if session is invalid
          if (!session && subscriptionChannelRef.current && supabase && !isCleaningUpChannelRef.current) {
            isCleaningUpChannelRef.current = true;
            try {
              supabase.removeChannel(subscriptionChannelRef.current);
              subscriptionChannelRef.current = null;
              logger.debug('Cleaned up subscription channel due to missing session');
            } finally {
              setTimeout(() => {
                isCleaningUpChannelRef.current = false;
              }, 100);
            }
          }
      return;
    }

    try {
      // Use unique channel name per user to avoid conflicts
      const channelName = `subscription-${user.id}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            logger.debug('Subscription updated in database', { 
              userId: user.id,
              newPlan: (payload.new as { plan?: string })?.plan,
              newStatus: (payload.new as { status?: string })?.status,
            });
            
            // Refresh Pro status immediately when subscription changes
            // CRITICAL: Only fetch if session is still valid (use ref to avoid stale closure)
            // Don't reset proStatusFetchInitiatedRef - we want to fetch even if already loaded
            if (!isValidSession(sessionRef.current)) {
              logger.debug('Session invalid during subscription update - skipping Pro status fetch');
              return;
            }
            
            setIsLoadingProStatus(true);
            fetch('/api/user/subscription')
              .then(res => {
                if (!res.ok) {
                  if (res.status === 401) {
                    throw new Error('Session expired');
                  }
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
              })
              .then(data => {
                // Verify session is still valid before setting Pro status (use ref to avoid stale closure)
                if (isValidSession(sessionRef.current)) {
                  const newProStatus = data.isPro ?? false;
                  setIsProUser(newProStatus);
                  setIsLoadingProStatus(false);
                  logger.debug('Pro status refreshed from realtime update', { 
                    userId: user.id,
                    isPro: newProStatus,
                  });
                } else {
                  logger.debug('Session expired during Pro status refresh - skipping');
                  setIsLoadingProStatus(false);
                }
              })
              .catch(error => {
                logger.error('Failed to refresh Pro status after subscription update', error);
                setIsLoadingProStatus(false);
                // Don't reset proStatusFetchInitiatedRef - allow retry on next change
              });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug('Subscribed to subscription changes', { userId: user.id });
          } else if (status === 'CHANNEL_ERROR') {
            // CRITICAL: Don't log as error - this happens when session expires
            // Don't call removeChannel() here - it triggers CLOSED event which causes infinite loop
            // The cleanup function (useEffect return) will handle removal
            logger.debug('Subscription channel error (likely expired session)', { userId: user.id });
            // Mark for cleanup - but don't remove here to avoid recursion
            subscriptionChannelRef.current = null;
          } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
            // Connection closed/timed out - don't call removeChannel() here (causes infinite loop)
            // Just log and mark for cleanup
            logger.debug('Subscription channel closed', { userId: user.id, status });
            subscriptionChannelRef.current = null;
          }
        });

      subscriptionChannelRef.current = channel;

      return () => {
        // Guard against recursive cleanup
        if (isCleaningUpChannelRef.current) {
          return;
        }
        
        if (channel && supabase) {
          isCleaningUpChannelRef.current = true;
          try {
            // Use removeChannel for proper cleanup (matches HistorySidebar pattern)
            supabase.removeChannel(channel);
            subscriptionChannelRef.current = null;
            logger.debug('Subscription realtime channel cleaned up', { userId: user?.id });
          } finally {
            // Reset guard after a delay to allow cleanup to complete
            setTimeout(() => {
              isCleaningUpChannelRef.current = false;
            }, 100);
          }
        }
      };
    } catch (error) {
      logger.error('Error setting up subscription realtime listener', error, { userId: user.id });
    }
  }, [supabase, user?.id, session]); // Added session to dependencies

  const signOut = async () => {
    if (!supabase) return;
    
    try {
      // Clean up subscription realtime channel before signing out
      if (subscriptionChannelRef.current && supabase && !isCleaningUpChannelRef.current) {
        isCleaningUpChannelRef.current = true;
        try {
          supabase.removeChannel(subscriptionChannelRef.current);
          subscriptionChannelRef.current = null;
        } finally {
          setTimeout(() => {
            isCleaningUpChannelRef.current = false;
          }, 100);
        }
      }
      
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      sessionRef.current = null; // Clear ref
      setIsProUser(false);
      setLinkedProviders([]);
      providersFetchInitiatedRef.current = false;
      proStatusFetchInitiatedRef.current = false;
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

