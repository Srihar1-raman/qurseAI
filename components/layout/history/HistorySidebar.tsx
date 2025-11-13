'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSidebar } from '@/lib/contexts/SidebarContext';
import { createClient } from '@/lib/supabase/client';
import { getConversations, deleteConversation, deleteAllConversations, updateConversation, getConversationCount } from '@/lib/db/queries';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import HistoryHeader from './HistoryHeader';
import HistorySearch from './HistorySearch';
import ConversationList from './ConversationList';
import ClearHistoryModal from './ClearHistoryModal';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { useConversationId } from '@/hooks/use-conversation-id';
import { createScopedLogger } from '@/lib/utils/logger';
import type { Conversation, ConversationGroup, HistorySidebarProps } from '@/lib/types';

const logger = createScopedLogger('history-sidebar');

export default function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const { resolvedTheme, mounted } = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { registerHandler } = useSidebar();
  const conversationId = useConversationId();
  const prevConversationIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [chatHistory, setChatHistory] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [conversationsOffset, setConversationsOffset] = useState(0); // Start at 0, updated after first load
  const [hasMoreConversations, setHasMoreConversations] = useState(true); // Assume more until proven otherwise
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalConversationCount, setTotalConversationCount] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (forceRefresh = false) => {
    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }
    
    // If force refresh, reset hasLoaded to allow reload
    if (forceRefresh) {
      setHasLoaded(false);
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { conversations, hasMore } = await getConversations(user.id, { limit: 50 });
      setChatHistory(conversations || []);
      setHasLoaded(true);
      // Set offset to actual count loaded (in case we got fewer than 50)
      setConversationsOffset(conversations.length);
      setHasMoreConversations(hasMore); // Use DB result, not inferred
    } catch (err) {
      setError('Failed to load conversations');
      setChatHistory([]);
      setHasLoaded(false);
      setHasMoreConversations(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadMoreConversations = useCallback(async () => {
    if (!user || !user.id || isLoadingMore || !hasMoreConversations || searchQuery.trim()) {
      return; // Don't load more if searching (server-side search replaces list)
    }

    setIsLoadingMore(true);

    try {
      const { conversations: moreConversations, hasMore } = await getConversations(user.id, { 
        limit: 50, 
        offset: conversationsOffset 
      });

      // Update hasMoreConversations based on DB result
      setHasMoreConversations(hasMore);

      if (moreConversations.length > 0) {
        // Deduplicate conversations by ID to prevent duplicate keys
        // This handles edge cases where conversations might appear in multiple pages
        // (e.g., if a conversation was updated between loads, causing it to shift positions)
        setChatHistory((prev) => {
          const existingIds = new Set(prev.map(conv => conv.id));
          const newConversations = moreConversations.filter(conv => !existingIds.has(conv.id));
          return [...prev, ...newConversations];
        });
        // Increase offset by actual number returned from DB (not deduplicated count)
        // This ensures correct pagination even if there are duplicates
        // The deduplication above prevents React key errors, but offset tracks DB queries
        setConversationsOffset((prev) => prev + moreConversations.length);
      }
    } catch (err) {
      setHasMoreConversations(false); // Stop trying on error
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, conversationsOffset, isLoadingMore, hasMoreConversations, searchQuery]);


  // Infinite scroll detection using hook
  useInfiniteScroll(
    contentRef,
    loadMoreConversations,
    {
      threshold: 200,
      direction: 'bottom',
      enabled: isOpen && !searchQuery.trim() && hasMoreConversations && !isLoadingMore,
    }
  );

  // Optimistic update handler: Add conversation to sidebar immediately
  const addConversationOptimistically = useCallback((conversation: Conversation) => {
    setChatHistory((prev) => {
      // Deduplicate: Check if already exists (prevent duplicates from optimistic + real-time)
      if (prev.some(c => c.id === conversation.id)) {
        return prev;
      }
      // Add to top (newest first)
      return [conversation, ...prev];
    });
  }, []);

  // Register optimistic update handler with context
  useEffect(() => {
    if (user && user.id) {
      const unregister = registerHandler(addConversationOptimistically);
      return unregister;
    }
    // If no user, unregister by registering a no-op handler
    // This ensures the handler is cleared when user logs out
    return registerHandler(() => {});
  }, [user, registerHandler, addConversationOptimistically]);

  // Fetch conversation count when sidebar opens and user is logged in
  // Reset count when user logs out
  useEffect(() => {
    if (!user || !user.id) {
      setTotalConversationCount(null);
      return;
    }

    if (isOpen && !isAuthLoading && totalConversationCount === null) {
      getConversationCount(user.id)
        .then(count => {
          setTotalConversationCount(count);
          logger.debug('Conversation count fetched', { count });
        })
        .catch(err => {
          logger.error('Failed to fetch conversation count', err);
          // Fallback to chatHistory.length (will be updated when conversations load)
        });
    }
  }, [isOpen, user, isAuthLoading, totalConversationCount]);

  // Load conversations when sidebar opens and user is logged in (only if not already loaded)
  useEffect(() => {
    if (isOpen && user && !isAuthLoading && !hasLoaded) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user, isAuthLoading, hasLoaded]); // loadConversations intentionally excluded to prevent infinite re-renders

  // Real-time subscription: Listen for conversation changes (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!user || !user.id || !isOpen) {
      return;
    }

    try {
      const supabase = createClient();
      
      // Use unique channel name per user to avoid conflicts
      const channelName = `conversations-${user.id}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversations',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // New conversation created in database
            const dbConv = payload.new as {
              id: string;
              title: string;
              updated_at: string;
              created_at?: string;
              user_id?: string;
            };
            
            // Map to Conversation type (message_count not available in real-time payload)
            const newConv: Conversation = {
              id: dbConv.id,
              title: dbConv.title,
              updated_at: dbConv.updated_at,
              created_at: dbConv.created_at,
              message_count: 0, // Real-time payload doesn't include message_count
              user_id: dbConv.user_id,
            };
            
            logger.debug('Real-time INSERT detected', { conversationId: newConv.id });
            
            // Update count
            setTotalConversationCount(prev => (prev !== null ? prev + 1 : null));
            
            setChatHistory((prev) => {
              // Deduplicate: Check if already exists (prevent duplicates from optimistic + real-time)
              if (prev.some(c => c.id === newConv.id)) {
                return prev;
              }
              // Add to top (newest first)
              return [newConv, ...prev];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Conversation updated (e.g., title generation completed)
            const dbConv = payload.new as {
              id: string;
              title: string;
              updated_at: string;
              created_at?: string;
              user_id?: string;
            };
            
            // Map to Conversation type, preserve existing message_count if available
            const updatedConv: Conversation = {
              id: dbConv.id,
              title: dbConv.title,
              updated_at: dbConv.updated_at,
              created_at: dbConv.created_at,
              user_id: dbConv.user_id,
              // Preserve message_count from existing conversation if it exists
            };
            
            logger.debug('Real-time UPDATE detected', { conversationId: updatedConv.id, title: updatedConv.title });
            
            setChatHistory((prev) =>
              prev.map(c => {
                if (c.id === updatedConv.id) {
                  // Preserve message_count from existing conversation
                  return { ...updatedConv, message_count: c.message_count ?? 0 };
                }
                return c;
              })
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'conversations',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Conversation deleted
            const deletedId = payload.old.id as string;
            logger.debug('Real-time DELETE detected', { conversationId: deletedId });
            
            // Update count
            setTotalConversationCount(prev => (prev !== null ? Math.max(0, prev - 1) : null));
            
            setChatHistory((prev) => prev.filter(c => c.id !== deletedId));
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug('Real-time subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('Real-time subscription error', new Error('Channel error'));
            // Graceful degradation: Don't break UI, cache invalidation will handle updates
          }
        });

      return () => {
        supabase.removeChannel(channel);
        logger.debug('Real-time subscription cleaned up');
      };
    } catch (error) {
      logger.error('Failed to set up real-time subscription', error);
      // Graceful degradation: Don't break UI, cache invalidation will handle updates
    }
  }, [user, isOpen]);

  // Cache invalidation: Refresh on conversation ID changes (fallback if real-time fails)
  useEffect(() => {
    if (
      conversationId &&
      conversationId !== prevConversationIdRef.current &&
      isOpen &&
      hasLoaded &&
      !conversationId.startsWith('temp-')
    ) {
      // Invalidate cache and refresh
      logger.debug('Cache invalidation triggered', { conversationId });
      setHasLoaded(false);
      loadConversations(true);
    }
    
    // Update ref to track previous ID
    prevConversationIdRef.current = conversationId;
  }, [conversationId, isOpen, hasLoaded, loadConversations]);

  const getDateGroup = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Today';
    } else if (diffInHours < 24) {
      return 'Last 24 hours';
    } else if (diffInHours < 168) {
      return 'Last 7 days';
    } else if (diffInHours < 720) {
      return 'Last 30 days';
    } else {
      return 'Older';
    }
  };

  const groupConversations = (conversations: Conversation[]): ConversationGroup[] => {
    const groups: Record<string, Conversation[]> = {};
    
    conversations.forEach(conversation => {
      const group = getDateGroup(conversation.updated_at);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(conversation);
    });

    const groupOrder = ['Today', 'Last 24 hours', 'Last 7 days', 'Last 30 days', 'Older'];
    return groupOrder
      .filter(group => groups[group])
      .map(group => ({
        label: group,
        conversations: groups[group].sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      }));
  };

  // Server-side search with debouncing
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = searchQuery.trim();

    // If search is empty, clear results and restore chatHistory
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce search (300ms)
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      if (!user || !user.id) {
        setIsSearching(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/conversations/search?query=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const { conversations } = await response.json();
        setSearchResults(conversations || []);
        logger.debug('Search completed', { query, resultCount: conversations?.length || 0 });
      } catch (err) {
        logger.error('Search error', err);
        setError('Failed to search conversations');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, user]);

  // Get conversations to display (search results or paginated list)
  const getDisplayConversations = () => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    return chatHistory;
  };

  const handleClearHistory = async () => {
    if (!user || !user.id) return;
    
    try {
      await deleteAllConversations(user.id);
      setChatHistory([]);
      setSearchResults([]);
      setTotalConversationCount(0);
      setShowClearConfirm(false);
    } catch (err) {
      // Error handled by setError state
      setError('Failed to clear history');
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      await updateConversation(id, { title: newTitle });
      setChatHistory(prev => 
        prev.map(chat => 
          chat.id === id ? { ...chat, title: newTitle } : chat
        )
      );
      // Also update search results if conversation is in search results
      setSearchResults(prev =>
        prev.map(chat =>
          chat.id === id ? { ...chat, title: newTitle } : chat
        )
      );
    } catch (err) {
      // Error handled by component state
      setError('Failed to rename conversation');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation(id);
      setChatHistory(prev => prev.filter(chat => chat.id !== id));
      // Also remove from search results if conversation is in search results
      setSearchResults(prev => prev.filter(chat => chat.id !== id));
      // Update count (real-time subscription will also update, but this ensures immediate UI update)
      setTotalConversationCount(prev => (prev !== null ? Math.max(0, prev - 1) : null));
    } catch (err) {
      // Error handled by component state
      setError('Failed to delete conversation');
    }
  };

  const displayConversations = getDisplayConversations();
  const groupedConversations = groupConversations(displayConversations);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="history-backdrop"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`history-sidebar ${isOpen ? 'open' : ''}`}>
        <HistoryHeader onClose={onClose} />

        {/* Content */}
        <div className="history-content" ref={contentRef}>
          {/* Loading State */}
          {isLoading && (
            <div style={{ padding: '20px' }}>
              <LoadingSkeleton variant="conversation" count={5} />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="history-empty">
              <p style={{ color: 'var(--color-error)' }}>{error}</p>
              <button 
                onClick={() => loadConversations(true)}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Guest State */}
          {!user && !isLoading && !error && (
            <div className="history-empty">
              <Image 
                src={getIconPath("history", resolvedTheme, false, mounted)} 
                alt="History" 
                width={48} 
                height={48} 
                className="history-empty-icon" 
              />
              <p>Sign in to view history</p>
              <span>Your conversations will be saved after signing in</span>
              <Link 
                href="/login"
                style={{
                  marginTop: '16px',
                  padding: '8px 24px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Search Bar - Always show when user is logged in */}
          {user && !isLoading && !error && (
            <HistorySearch
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              conversationCount={totalConversationCount ?? chatHistory.length}
              onClearHistory={() => setShowClearConfirm(true)}
            />
          )}

          {/* Empty State (Logged in, no conversations, not searching) */}
          {user && chatHistory.length === 0 && !isLoading && !error && !searchQuery.trim() && (
            <div className="history-empty">
              <Image 
                src={getIconPath("history", resolvedTheme, false, mounted)} 
                alt="History" 
                width={48} 
                height={48} 
                className="history-empty-icon" 
              />
              <p>No conversations yet</p>
              <span>Start a new chat to begin</span>
            </div>
          )}

          {/* Searching indicator - Show whenever searching, even if sidebar is blank */}
          {user && isSearching && !isLoading && !error && (
            <div style={{ 
              padding: '16px', 
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: '14px'
            }}>
              Searching...
            </div>
          )}

          {/* Conversation List */}
          {user && displayConversations.length > 0 && !isLoading && !error && (
            <>
              <ConversationList
                groupedConversations={groupedConversations}
                onRename={handleRename}
                onDelete={handleDelete}
                onClose={onClose}
                isSidebarOpen={isOpen}
              />

              {/* Loading indicator for infinite scroll */}
              {isLoadingMore && !searchQuery.trim() && (
                <div style={{ 
                  padding: '16px', 
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: '14px'
                }}>
                  Loading more conversations...
                </div>
              )}
            </>
          )}

          {/* No search results message */}
          {user && searchQuery.trim() && !isSearching && displayConversations.length === 0 && !isLoading && !error && (
            <div className="history-empty">
              <p>No conversations found</p>
              <span>Try a different search term</span>
            </div>
          )}
        </div>
      </div>

      <ClearHistoryModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearHistory}
      />
    </>
  );
}
