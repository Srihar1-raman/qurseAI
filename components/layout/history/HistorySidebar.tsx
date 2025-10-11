'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import HistoryHeader from './HistoryHeader';
import HistorySearch from './HistorySearch';
import ConversationList from './ConversationList';
import ClearHistoryModal from './ClearHistoryModal';
import type { Conversation, ConversationGroup, HistorySidebarProps } from '@/lib/types';

export default function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const { resolvedTheme, mounted } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Mock data for testing (will come from API later)
  const [chatHistory, setChatHistory] = useState<Conversation[]>([
    { id: '1', title: 'How to build a React app', updated_at: new Date().toISOString(), message_count: 5 },
    { id: '2', title: 'Understanding TypeScript generics', updated_at: new Date(Date.now() - 3600000).toISOString(), message_count: 12 },
    { id: '3', title: 'Next.js routing best practices', updated_at: new Date(Date.now() - 86400000 * 2).toISOString(), message_count: 8 },
    { id: '4', title: 'CSS Grid vs Flexbox', updated_at: new Date(Date.now() - 86400000 * 5).toISOString(), message_count: 15 },
    { id: '5', title: 'Tailwind CSS tips and tricks', updated_at: new Date(Date.now() - 86400000 * 10).toISOString(), message_count: 7 },
  ]);

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

  const handleClearHistory = () => {
    setChatHistory([]);
    setShowClearConfirm(false);
  };

  const handleRename = (id: string, newTitle: string) => {
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === id ? { ...chat, title: newTitle } : chat
      )
    );
  };

  const handleDelete = (id: string) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== id));
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
          {chatHistory.length === 0 ? (
            <div className="history-empty">
              <Image 
                src={getIconPath("history", resolvedTheme, false, mounted)} 
                alt="History" 
                width={48} 
                height={48} 
                className="history-empty-icon" 
              />
              <p>No chat history yet</p>
              <span>Your conversations will appear here</span>
            </div>
          ) : (
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
