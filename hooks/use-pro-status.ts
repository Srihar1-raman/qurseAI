'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isValidSession } from '@/lib/utils/session-validation';
import { createScopedLogger } from '@/lib/utils/logger';
import type { Session } from '@supabase/supabase-js';

const logger = createScopedLogger('hooks/use-pro-status');

interface UseProStatusProps {
  session: Session | null;
  sessionRef: React.MutableRefObject<Session | null>;
  userId: string | null;
  user: { id: string } | null;
}

interface UseProStatusReturn {
  isProUser: boolean;
  isLoadingProStatus: boolean;
}

/**
 * Hook to manage Pro subscription status
 * Fetches Pro status once when user loads and subscribes to realtime updates
 */
export function useProStatus({
  session,
  sessionRef,
  userId,
  user,
}: UseProStatusProps): UseProStatusReturn {
  const [isProUser, setIsProUser] = useState(false);
  const [isLoadingProStatus, setIsLoadingProStatus] = useState(false);
  const proStatusFetchInitiatedRef = useRef(false);
  const subscriptionChannelRef = useRef<any>(null);
  const isCleaningUpChannelRef = useRef(false);

  const supabase = createClient();

  // Fetch Pro status when user loads
  useEffect(() => {
    if (!session || !isValidSession(session) || !userId) {
      setIsProUser(false);
      setIsLoadingProStatus(false);
      proStatusFetchInitiatedRef.current = false;
      return;
    }

    // Fetch Pro status once when user loads (cached across navigations)
    // Only fetch if session is still valid (might have expired between checks)
    if (!proStatusFetchInitiatedRef.current && isValidSession(session)) {
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
  }, [session, userId, sessionRef]);

  // Real-time subscription: Listen for subscription changes (UPDATE)
  // This ensures Pro status updates immediately when subscription changes in DB
  // Only subscribe when session is valid - expired sessions cause connection errors
  useEffect(() => {
    // Don't subscribe if no supabase client, no user, or no valid session
    // Validate session integrity - corrupted sessions cause "missing destination name oauth_client_id" errors
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
            // Only fetch if session is still valid (use ref to avoid stale closure)
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
            // Don't log as error - this happens when session expires
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
  }, [supabase, user?.id, session, sessionRef]);

  // Reset when user changes
  useEffect(() => {
    proStatusFetchInitiatedRef.current = false;
    setIsProUser(false);
  }, [userId]);

  return {
    isProUser,
    isLoadingProStatus,
  };
}

