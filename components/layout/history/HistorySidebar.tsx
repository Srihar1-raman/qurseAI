'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const loadConversations = useCallback(async () => {
    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const conversations = await getConversations(user.id);
      setChatHistory(conversations || []);
    } catch (err) {
      setError('Failed to load conversations');
      setChatHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load conversations when sidebar opens and user is logged in
  useEffect(() => {
    if (isOpen && user && !isAuthLoading) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user, isAuthLoading]); // loadConversations intentionally excluded to prevent infinite re-renders

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
        <div className="history-content">
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
                onClick={loadConversations}
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
