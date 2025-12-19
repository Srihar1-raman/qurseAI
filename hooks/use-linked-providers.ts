'use client';

import { useState, useEffect, useRef } from 'react';
import { getUserLinkedProviders } from '@/lib/db/queries';
import { isValidSession } from '@/lib/utils/session-validation';
import { createScopedLogger } from '@/lib/utils/logger';
import type { Session } from '@supabase/supabase-js';

const logger = createScopedLogger('hooks/use-linked-providers');

interface UseLinkedProvidersProps {
  session: Session | null;
  sessionRef: React.MutableRefObject<Session | null>;
  userId: string | null;
}

interface UseLinkedProvidersReturn {
  linkedProviders: string[];
  isLoadingProviders: boolean;
}

/**
 * Hook to manage linked OAuth providers
 * Fetches providers once when user loads and caches the result
 */
export function useLinkedProviders({
  session,
  sessionRef,
  userId,
}: UseLinkedProvidersProps): UseLinkedProvidersReturn {
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const providersFetchInitiatedRef = useRef(false);

  useEffect(() => {
    // Only fetch if we have a valid session and user ID
    if (!session || !isValidSession(session) || !userId) {
      setLinkedProviders([]);
      setIsLoadingProviders(false);
      providersFetchInitiatedRef.current = false;
      return;
    }

    // Fetch linked providers once when user loads (cached across navigations)
    // Only fetch if session is still valid (might have expired between checks)
    if (!providersFetchInitiatedRef.current && isValidSession(session)) {
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
  }, [session, userId, sessionRef]);

  // Reset when user changes
  useEffect(() => {
    providersFetchInitiatedRef.current = false;
    setLinkedProviders([]);
  }, [userId]);

  return {
    linkedProviders,
    isLoadingProviders,
  };
}

