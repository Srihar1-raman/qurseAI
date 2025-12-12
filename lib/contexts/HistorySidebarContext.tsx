/**
 * History Sidebar Context
 * Manages global sidebar state to persist across page navigations
 * Prevents reloading conversations when navigating between pages
 */

'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { getConversations, getConversationCount, getGuestConversations } from '@/lib/db/queries';
import { createScopedLogger } from '@/lib/utils/logger';
import { useAuth } from './AuthContext';
import type { Conversation } from '@/lib/types';

const logger = createScopedLogger('history-sidebar/context');

interface HistorySidebarContextValue {
  // State
  chatHistory: Conversation[];
  hasLoaded: boolean;
  totalConversationCount: number | null;
  searchResults: Conversation[];
  isLoading: boolean;
  error: string | null;
  conversationsOffset: number;
  hasMoreConversations: boolean;
  isLoadingMore: boolean;

  // Actions
  loadConversations: (forceRefresh?: boolean) => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  setChatHistory: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setTotalConversationCount: React.Dispatch<React.SetStateAction<number | null>>;
  setSearchResults: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setHasMoreConversations: React.Dispatch<React.SetStateAction<boolean>>;
  setConversationsOffset: React.Dispatch<React.SetStateAction<number>>;
  setIsLoadingMore: React.Dispatch<React.SetStateAction<boolean>>;
  resetState: () => void;
}

const HistorySidebarContext = createContext<HistorySidebarContextValue | null>(null);

interface HistorySidebarProviderProps {
  children: ReactNode;
}

/**
 * HistorySidebarProvider
 * Manages global sidebar state that persists across page navigations
 * State is keyed by user.id - resets when user changes
 */
export function HistorySidebarProvider({ children }: HistorySidebarProviderProps) {
  const { user } = useAuth();

  // State
  const [chatHistory, setChatHistory] = useState<Conversation[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [totalConversationCount, setTotalConversationCount] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationsOffset, setConversationsOffset] = useState(0);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const countFetchInitiatedRef = useRef(false);

  // Reset all state to initial values
  const resetState = useCallback(() => {
    setChatHistory([]);
    setHasLoaded(false);
    setTotalConversationCount(null);
    setSearchResults([]);
    setIsLoading(false);
    setError(null);
    setConversationsOffset(0);
    setHasMoreConversations(true);
    setIsLoadingMore(false);
    countFetchInitiatedRef.current = false;
    logger.debug('State reset');
  }, []);

  // Reset state when user changes (logout/login)
  useEffect(() => {
    if (!user) {
      resetState();
    }
  }, [user, resetState]);

  // Load conversations (initial load or force refresh)
  const loadConversations = useCallback(async (forceRefresh = false) => {
    // If force refresh, reset hasLoaded to allow reload
    if (forceRefresh) {
      setHasLoaded(false);
    }

    setIsLoading(true);
    setError(null);

    try {
      if (user && user.id) {
        // Auth user: existing logic
      const { conversations, hasMore } = await getConversations(user.id, { limit: 50 });
      setChatHistory(conversations || []);
      setHasLoaded(true);
      // Set offset to actual count loaded (in case we got fewer than 50)
      setConversationsOffset(conversations.length);
      setHasMoreConversations(hasMore);

      // Fetch total count if not already loaded (use ref to avoid dependency)
      if (!countFetchInitiatedRef.current && user.id) {
        countFetchInitiatedRef.current = true;
        // Fetch count asynchronously (don't await - non-blocking)
        getConversationCount(user.id)
          .then((count) => {
            setTotalConversationCount(count);
          })
          .catch((err) => {
            logger.error('Failed to fetch conversation count', err);
            // Don't fail the whole load if count fails
            countFetchInitiatedRef.current = false; // Allow retry on next load
          });
        }
      } else {
        // Guest: Load from guest_conversations via API
        const { conversations, hasMore } = await getGuestConversations({ limit: 50 });
        setChatHistory(conversations || []);
        setHasLoaded(true);
        setConversationsOffset(conversations.length);
        setHasMoreConversations(hasMore);
        // For guests, set total count to conversations length (API doesn't provide separate count)
        setTotalConversationCount(conversations.length);
      }
    } catch (err) {
      setError('Failed to load conversations');
      setChatHistory([]);
      setHasLoaded(false);
      setHasMoreConversations(false);
      logger.error('Error loading conversations', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load more conversations (pagination)
  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMore || !hasMoreConversations) {
      return;
    }

    setIsLoadingMore(true);

    try {
      if (user && user.id) {
        // Auth user: existing logic
      const { conversations: moreConversations, hasMore } = await getConversations(user.id, {
        limit: 50,
        offset: conversationsOffset,
      });

      setHasMoreConversations(hasMore);

      if (moreConversations.length > 0) {
        // Deduplicate conversations by ID to prevent duplicate keys
        setChatHistory((prev) => {
          const existingIds = new Set(prev.map((conv) => conv.id));
          const newConversations = moreConversations.filter((conv) => !existingIds.has(conv.id));
          return [...prev, ...newConversations];
        });
        // Increase offset by actual number returned from DB
        setConversationsOffset((prev) => prev + moreConversations.length);
        }
      } else {
        // Guest: Load more from guest_conversations via API
        const { conversations: moreConversations, hasMore } = await getGuestConversations({
          limit: 50,
          offset: conversationsOffset,
        });

        setHasMoreConversations(hasMore);

        if (moreConversations.length > 0) {
          // Deduplicate conversations by ID to prevent duplicate keys
          setChatHistory((prev) => {
            const existingIds = new Set(prev.map((conv) => conv.id));
            const newConversations = moreConversations.filter((conv) => !existingIds.has(conv.id));
            return [...prev, ...newConversations];
          });
          // Increase offset by actual number returned from API
          setConversationsOffset((prev) => prev + moreConversations.length);
          // Update total count (for guests, approximate from loaded conversations)
          setTotalConversationCount((prev) => (prev ?? 0) + moreConversations.length);
        }
      }
    } catch (err) {
      setHasMoreConversations(false);
      logger.error('Error loading more conversations', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, conversationsOffset, isLoadingMore, hasMoreConversations]);

  return (
    <HistorySidebarContext.Provider
      value={{
        // State
        chatHistory,
        hasLoaded,
        totalConversationCount,
        searchResults,
        isLoading,
        error,
        conversationsOffset,
        hasMoreConversations,
        isLoadingMore,

        // Actions
        loadConversations,
        loadMoreConversations,
        setChatHistory,
        setTotalConversationCount,
        setSearchResults,
        setError,
        setHasMoreConversations,
        setConversationsOffset,
        setIsLoadingMore,
        resetState,
      }}
    >
      {children}
    </HistorySidebarContext.Provider>
  );
}

/**
 * useHistorySidebar Hook
 * Provides access to global sidebar state and actions
 */
export function useHistorySidebar() {
  const context = useContext(HistorySidebarContext);

  if (!context) {
    throw new Error('useHistorySidebar must be used within a HistorySidebarProvider');
  }

  return context;
}

