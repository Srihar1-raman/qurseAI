'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSidebar } from '@/lib/contexts/SidebarContext';
import { useHistorySidebar } from '@/lib/contexts/HistorySidebarContext';
import { createClient } from '@/lib/supabase/client';
import { deleteConversation, deleteAllConversations, updateConversation } from '@/lib/db/queries';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import HistoryHeader from './HistoryHeader';
import HistorySearch from './HistorySearch';
import ConversationList from './ConversationList';
import ClearHistoryModal from './ClearHistoryModal';
import { GuestRateLimitPopup } from '@/components/rate-limit/GuestRateLimitPopup';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { useConversationId } from '@/hooks/use-conversation-id';
import { createScopedLogger } from '@/lib/utils/logger';
import type { Conversation, ConversationGroup, HistorySidebarProps } from '@/lib/types';
import { UnifiedButton } from '@/components/ui/UnifiedButton';
import { ShareConversationModal } from '@/components/conversation/ShareConversationModal';
import { useShareConversation } from '@/hooks/use-share-conversation';
import { useToast } from '@/lib/contexts/ToastContext';

const logger = createScopedLogger('history-sidebar');

// Helper function to get date group (moved outside component for performance)
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

// Helper function to group conversations (moved outside component for performance)
  const groupConversations = (conversations: Conversation[]): ConversationGroup[] => {
    // Separate pinned and unpinned conversations
    const pinned: Conversation[] = [];
    const unpinned: Conversation[] = [];
    
    conversations.forEach(conversation => {
      if (conversation.pinned) {
        pinned.push(conversation);
      } else {
        unpinned.push(conversation);
      }
    });

    // Sort pinned by updated_at DESC
    pinned.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    // Group unpinned conversations by date
    const groups: Record<string, Conversation[]> = {};
    unpinned.forEach(conversation => {
      const group = getDateGroup(conversation.updated_at);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(conversation);
    });

    const groupOrder = ['Today', 'Last 24 hours', 'Last 7 days', 'Last 30 days', 'Older'];
    const dateGroups = groupOrder
      .filter(group => groups[group])
      .map(group => ({
        label: group,
        conversations: groups[group].sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      }));

    // Return pinned section first (if any), then date groups
    const result: ConversationGroup[] = [];
    if (pinned.length > 0) {
      result.push({
        label: 'Pinned',
        conversations: pinned
      });
    }
    result.push(...dateGroups);
    
    return result;
  };

function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Build callback URL for post-auth redirect (industry standard: query parameter)
  const callbackUrl = useMemo(() => {
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    // Only add callbackUrl if not already on login/signup pages (avoid loops)
    if (currentUrl.startsWith('/login') || currentUrl.startsWith('/signup')) {
      return '';
    }
    return encodeURIComponent(currentUrl);
  }, [pathname, searchParams]);
  const { resolvedTheme, mounted } = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { registerHandler } = useSidebar();
  const conversationId = useConversationId();
  const prevConversationIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showGuestActionPopup, setShowGuestActionPopup] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [sharedConversationId, setSharedConversationId] = useState<string | null>(null);
  const { shareConversation, unshareConversation } = useShareConversation();
  const { showToastError, showToastSuccess } = useToast();

  // Get state and actions from context
  const {
    chatHistory,
    hasLoaded,
    totalConversationCount,
    searchResults,
    isLoading,
    error,
    conversationsOffset,
    hasMoreConversations,
    isLoadingMore,
    loadConversations,
    loadMoreConversations,
    setChatHistory,
    setTotalConversationCount,
    setSearchResults,
    setError,
  } = useHistorySidebar();



  // Infinite scroll detection using hook
  useInfiniteScroll(
    contentRef,
    () => {
      // Don't load more if searching (server-side search replaces list)
    if (!searchQuery.trim()) {
        loadMoreConversations();
      }
    },
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
    // Increment count optimistically (real-time will also update, but this ensures immediate UI feedback)
    setTotalConversationCount(prev => (prev !== null ? prev + 1 : null));
  }, [setChatHistory, setTotalConversationCount]);

  // Register optimistic update handler with context (for both auth and guest users)
  useEffect(() => {
      const unregister = registerHandler(addConversationOptimistically);
      return unregister;
  }, [registerHandler, addConversationOptimistically]);


  // Load conversations when sidebar opens (for both auth and guest users, only if not already loaded)
  useEffect(() => {
    if (isOpen && !isAuthLoading && !hasLoaded) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthLoading, hasLoaded]); // loadConversations intentionally excluded to prevent infinite re-renders

  // For guest users: Refresh conversations when sidebar opens if current conversation is not in list
  // (Authenticated users have real-time subscriptions, but guests don't)
  useEffect(() => {
    if (isOpen && !user && hasLoaded && conversationId) {
      // Check if current conversation is in the list
      const conversationExists = chatHistory.some(c => c.id === conversationId);
      
      // If conversation not in list, refresh to pick up newly created conversations
      if (!conversationExists) {
        // Small delay to ensure DB operations have completed
        const timeoutId = setTimeout(() => {
          loadConversations(true); // Force refresh
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user, hasLoaded, conversationId, chatHistory]); // Refresh when sidebar opens for guests if conversation missing

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
            
            setChatHistory((prev) => {
              // Deduplicate: Check if already exists (prevent duplicates from optimistic + real-time)
              const alreadyExists = prev.some(c => c.id === newConv.id);
              if (alreadyExists) {
                return prev;
              }
              // Update count only if conversation is new (not from optimistic update)
              setTotalConversationCount(prevCount => (prevCount !== null ? prevCount + 1 : null));
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
  }, [user, isOpen, setChatHistory, setTotalConversationCount]);

  // Cache invalidation: Refresh on conversation ID changes (fallback if real-time fails)
  useEffect(() => {
    if (
      conversationId &&
      conversationId !== prevConversationIdRef.current &&
      isOpen &&
      hasLoaded
    ) {
      // Invalidate cache and refresh
      logger.debug('Cache invalidation triggered', { conversationId });
      loadConversations(true);
    }
    
    // Update ref to track previous ID
    prevConversationIdRef.current = conversationId;
  }, [conversationId, isOpen, hasLoaded, loadConversations]);

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
  }, [searchQuery, user, setSearchResults, setError]);

  // Memoize display conversations (search results vs chatHistory)
  const displayConversations = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    return chatHistory;
  }, [searchQuery, searchResults, chatHistory]);

  // Memoize grouped conversations (expensive: loops, sorts, filters)
  const groupedConversations = useMemo(() => {
    return groupConversations(displayConversations);
  }, [displayConversations]);

  // Wrap handleClearHistory with useCallback for stable reference
  const handleClearHistory = useCallback(async () => {
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
  }, [user?.id, setChatHistory, setSearchResults, setTotalConversationCount, setError]);

  // Wrap handleRename with useCallback for stable reference
  const handleRename = useCallback(async (id: string, newTitle: string) => {
    // Check if user is guest - show popup instead of attempting rename
    if (!user) {
      setShowGuestActionPopup(true);
      return;
    }

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
  }, [user, setChatHistory, setSearchResults, setError]);

  // Wrap handleDelete with useCallback for stable reference
  const handleDelete = useCallback(async (id: string) => {
    // Check if user is guest - show popup instead of attempting delete
    if (!user) {
      setShowGuestActionPopup(true);
      return;
    }

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
  }, [user, setChatHistory, setSearchResults, setTotalConversationCount, setError]);

  // Handle pin toggle - optimistic update with new array reference to force re-sort
  const handlePin = useCallback((id: string, pinned: boolean) => {
    setChatHistory(prev => {
      // Create new array reference to ensure memoization detects change
      return prev.map(chat => 
        chat.id === id ? { ...chat, pinned } : chat
      );
    });
    // Also update search results if conversation is in search results
    setSearchResults(prev => {
      // Create new array reference to ensure memoization detects change
      return prev.map(chat => 
        chat.id === id ? { ...chat, pinned } : chat
      );
    });
  }, [setChatHistory, setSearchResults]);

  // Handle share - check if guest, show popup, otherwise call share API
  const handleShare = useCallback(async (id: string) => {
    // Check if user is guest - show popup instead of attempting share
    if (!user) {
      setShowGuestActionPopup(true);
      return;
    }

    // Check if conversation is already shared
    const conversation = chatHistory.find(conv => conv.id === id);
    if (conversation?.share_token && conversation?.is_shared) {
      // Conversation already shared - construct URL and show modal
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/shared/${conversation.share_token}`;
      setShareUrl(url);
      setSharedConversationId(id);
      setShareModalOpen(true);
      return;
    }

    // Call share API
    try {
      const response = await shareConversation(id);
      setShareUrl(response.shareUrl);
      setSharedConversationId(id);
      setShareModalOpen(true);
      
      // Update conversation in local state
      setChatHistory(prev => prev.map(conv => 
        conv.id === id 
          ? { ...conv, share_token: response.shareToken, is_shared: true }
          : conv
      ));
      setSearchResults(prev => prev.map(conv => 
        conv.id === id 
          ? { ...conv, share_token: response.shareToken, is_shared: true }
          : conv
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share conversation';
      showToastError(errorMessage);
      logger.error('Error sharing conversation', err, { conversationId: id });
    }
  }, [user, chatHistory, shareConversation, setChatHistory, setSearchResults, showToastError]);

  // Handle unshare
  const handleUnshare = useCallback(async () => {
    if (!sharedConversationId) return;

    try {
      await unshareConversation(sharedConversationId);
      setShareModalOpen(false);
      setShareUrl('');
      showToastSuccess('Conversation unshared');
      
      // Update conversation in local state
      setChatHistory(prev => prev.map(conv => 
        conv.id === sharedConversationId 
          ? { ...conv, share_token: null, is_shared: false }
          : conv
      ));
      setSearchResults(prev => prev.map(conv => 
        conv.id === sharedConversationId 
          ? { ...conv, share_token: null, is_shared: false }
          : conv
      ));
      
      setSharedConversationId(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unshare conversation';
      showToastError(errorMessage);
      logger.error('Error unsharing conversation', err, { conversationId: sharedConversationId });
    }
  }, [sharedConversationId, unshareConversation, setChatHistory, setSearchResults, showToastError, showToastSuccess]);

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
            <>
              {/* Search bar skeleton */}
              <LoadingSkeleton variant="history-search" />
              {/* Conversation list skeleton */}
              <div className="history-tree-list">
              <LoadingSkeleton variant="conversation" count={5} />
            </div>
            </>
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

          {/* Guest State - Only show if no conversations loaded */}
          {!user && !isLoading && !error && chatHistory.length === 0 && (
            <div className="history-empty">
              <Image 
                src={getIconPath("history", resolvedTheme, false, mounted)} 
                alt="History" 
                width={48} 
                height={48} 
                className="history-empty-icon" 
              />
              <p>Sign in to save history</p>
              <span>Your conversations will be saved after signing in</span>
              <Link href={callbackUrl ? `/login?callbackUrl=${callbackUrl}` : '/login'} style={{ marginTop: '16px', display: 'inline-block', textDecoration: 'none' }}>
                <UnifiedButton variant="success">
                  Sign In
                </UnifiedButton>
              </Link>
            </div>
          )}

          {/* Search Bar - Show for auth users only (search not implemented for guests) */}
          {user && !isLoading && !error && (
            <HistorySearch
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              conversationCount={totalConversationCount ?? chatHistory.length}
              onClearHistory={() => setShowClearConfirm(true)}
            />
          )}

          {/* Empty State (No conversations, not searching) */}
          {chatHistory.length === 0 && !isLoading && !error && !searchQuery.trim() && (
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

          {/* Searching indicator - Show whenever searching, even if sidebar is blank (auth users only) */}
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

          {/* Conversation List - Show for both auth and guest users */}
          {displayConversations.length > 0 && !isLoading && !error && (
            <>
              <ConversationList
                groupedConversations={groupedConversations}
                onRename={handleRename}
                onDelete={handleDelete}
                onShare={handleShare}
                onClose={onClose}
                isSidebarOpen={isOpen}
                activeConversationId={conversationId}
                onPin={handlePin}
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

          {/* No search results message (auth users only) */}
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

      <GuestRateLimitPopup
        isOpen={showGuestActionPopup}
        onClose={() => setShowGuestActionPopup(false)}
        reset={Date.now() + 24 * 60 * 60 * 1000} // 24 hours from now
        customTitle="Sign in to continue"
        customMessage="Sign in to unlock this feature and access more capabilities."
      />

      <ShareConversationModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setShareUrl('');
          setSharedConversationId(null);
        }}
        shareUrl={shareUrl}
        onUnshare={sharedConversationId ? handleUnshare : undefined}
      />
    </>
  );
}

// Custom comparison function for React.memo()
// Only re-render if isOpen or onClose changes
const areEqual = (prevProps: HistorySidebarProps, nextProps: HistorySidebarProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.onClose === nextProps.onClose
  );
};

export default memo(HistorySidebar, areEqual);
