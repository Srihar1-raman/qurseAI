'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getConversations, deleteConversation, deleteAllConversations, updateConversation } from '@/lib/db/queries';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import HistoryHeader from './HistoryHeader';
import HistorySearch from './HistorySearch';
import ConversationList from './ConversationList';
import ClearHistoryModal from './ClearHistoryModal';
import type { Conversation, ConversationGroup, HistorySidebarProps } from '@/lib/types';

export default function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const { resolvedTheme, mounted } = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [chatHistory, setChatHistory] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [conversationsOffset, setConversationsOffset] = useState(0); // Start at 0, updated after first load
  const [hasMoreConversations, setHasMoreConversations] = useState(true); // Assume more until proven otherwise
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (forceRefresh = false) => {
    if (!user || !user.id) {
      setIsLoading(false);
      return;
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
      return; // Don't load more if searching (search filters client-side)
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
        setChatHistory((prev) => [...prev, ...moreConversations]);
        // Increase offset by actual number loaded (in case we got less than 50)
        setConversationsOffset((prev) => prev + moreConversations.length);
      }
    } catch (err) {
      setHasMoreConversations(false); // Stop trying on error
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, conversationsOffset, isLoadingMore, hasMoreConversations, searchQuery]);


  // Scroll detection for infinite scrolling
  useEffect(() => {
    if (!isOpen || searchQuery.trim() || !hasMoreConversations || isLoadingMore) {
      return;
    }

    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = contentElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Load more when user is within 200px of bottom
      if (distanceFromBottom < 200) {
        loadMoreConversations();
      }
    };

    contentElement.addEventListener('scroll', handleScroll);
    return () => contentElement.removeEventListener('scroll', handleScroll);
  }, [isOpen, searchQuery, hasMoreConversations, isLoadingMore, loadMoreConversations]);

  // Load conversations when sidebar opens and user is logged in (only if not already loaded)
  useEffect(() => {
    if (isOpen && user && !isAuthLoading && !hasLoaded) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user, isAuthLoading, hasLoaded]); // loadConversations intentionally excluded to prevent infinite re-renders

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

  const getFilteredConversations = () => {
    if (!searchQuery.trim()) {
      return chatHistory;
    }
    
    const query = searchQuery.toLowerCase();
    return chatHistory.filter(chat => 
      chat.title.toLowerCase().includes(query)
    );
  };

  const handleClearHistory = async () => {
    if (!user || !user.id) return;
    
    try {
      await deleteAllConversations(user.id);
      setChatHistory([]);
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
    } catch (err) {
      // Error handled by component state
      setError('Failed to rename conversation');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation(id);
      setChatHistory(prev => prev.filter(chat => chat.id !== id));
    } catch (err) {
      // Error handled by component state
      setError('Failed to delete conversation');
    }
  };

  const filteredConversations = getFilteredConversations();
  const groupedConversations = groupConversations(filteredConversations);

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

          {/* Empty State (Logged in, no conversations) */}
          {user && chatHistory.length === 0 && !isLoading && !error && (
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

          {/* Conversation List */}
          {user && chatHistory.length > 0 && !isLoading && !error && (
            <>
              <HistorySearch
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                conversationCount={chatHistory.length}
                onClearHistory={() => setShowClearConfirm(true)}
              />

              <ConversationList
                groupedConversations={groupedConversations}
                onRename={handleRename}
                onDelete={handleDelete}
                onClose={onClose}
              />

              {/* Loading indicator for infinite scroll */}
              {isLoadingMore && (
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
