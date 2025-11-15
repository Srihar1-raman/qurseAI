'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserLinkedProviders } from '@/lib/db/queries';
import type { User } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('auth/context');

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  linkedProviders: string[];
  isLoadingProviders: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const providersFetchInitiatedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

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
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);

        if (initialSession?.user) {
          // Use session metadata directly (no DB fetch needed)
          const userData = {
            id: initialSession.user.id,
            email: initialSession.user.email!,
            name: initialSession.user.user_metadata?.full_name || initialSession.user.user_metadata?.name,
            avatar_url: initialSession.user.user_metadata?.avatar_url,
            created_at: initialSession.user.created_at,
          };
          setUser(userData);
          
          // Reset providers fetch if user changed
          if (lastUserIdRef.current !== userData.id) {
            providersFetchInitiatedRef.current = false;
            lastUserIdRef.current = userData.id;
          }
          
          // Fetch linked providers once when user loads (cached across navigations)
          if (!providersFetchInitiatedRef.current) {
            providersFetchInitiatedRef.current = true;
            setIsLoadingProviders(true);
            getUserLinkedProviders()
              .then(providers => {
                setLinkedProviders(providers);
                setIsLoadingProviders(false);
              })
              .catch(error => {
                logger.error('Failed to load linked providers', error);
                setIsLoadingProviders(false);
                providersFetchInitiatedRef.current = false; // Allow retry
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
        logger.debug('Auth state changed', { event });
        setSession(newSession);

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
          
          // Reset providers fetch if user changed (handles user switch scenario)
          if (lastUserIdRef.current !== userData.id) {
            providersFetchInitiatedRef.current = false;
            setLinkedProviders([]); // Clear old user's providers
            lastUserIdRef.current = userData.id;
          }
          
          // Fetch linked providers if not already loaded (user changed)
          if (!providersFetchInitiatedRef.current) {
            providersFetchInitiatedRef.current = true;
            setIsLoadingProviders(true);
            getUserLinkedProviders()
              .then(providers => {
                setLinkedProviders(providers);
                setIsLoadingProviders(false);
              })
              .catch(error => {
                logger.error('Failed to load linked providers', error);
                setIsLoadingProviders(false);
                providersFetchInitiatedRef.current = false; // Allow retry
              });
          }
        } else {
          setUser(null);
          setLinkedProviders([]);
          providersFetchInitiatedRef.current = false;
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
      setLinkedProviders([]);
      providersFetchInitiatedRef.current = false;
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

