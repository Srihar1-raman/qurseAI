'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ConversationItem from './ConversationItem';
import type { ConversationListProps } from '@/lib/types';

export default function ConversationList({ 
  groupedConversations, 
  onRename, 
  onDelete, 
  onShare,
  onClose,
  isSidebarOpen,
  activeConversationId,
  onPin
}: ConversationListProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Reset menu state when sidebar closes (industry standard: cleanup on unmount/hide)
  useEffect(() => {
    if (!isSidebarOpen) {
      setOpenMenuId(null);
    }
  }, [isSidebarOpen]);

  const toggleSection = (sectionLabel: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionLabel)) {
        newSet.delete(sectionLabel);
      } else {
        newSet.add(sectionLabel);
      }
      return newSet;
    });
  };

  // Memoize to prevent unnecessary re-renders of all ConversationItem components
  const handleMenuToggle = useCallback((conversationId: string) => {
    // Single-menu pattern: close others when one opens
    setOpenMenuId(prev => prev === conversationId ? null : conversationId);
  }, []);

  // Wrap onDelete to also reset menu state if deleted conversation's menu was open
  const handleDelete = useCallback((id: string) => {
    setOpenMenuId(prev => prev === id ? null : prev);
    onDelete(id);
  }, [onDelete]);

  // Create a memoized map of toggle callbacks for all conversations
  // This prevents creating new functions on every render
  const menuToggleMap = useMemo(() => {
    const map = new Map<string, () => void>();
    groupedConversations.forEach(group => {
      group.conversations.forEach(conversation => {
        map.set(conversation.id, () => handleMenuToggle(conversation.id));
      });
    });
    return map;
  }, [groupedConversations, handleMenuToggle]);

  if (groupedConversations.length === 0) {
    return (
      <div className="history-no-results">
        <p>No conversations found</p>
        <span>Try adjusting your search terms</span>
      </div>
    );
  }

  return (
    <div className="history-tree-container">
      {groupedConversations.map((group) => (
        <div key={group.label} className="history-tree-section">
          <div className="history-tree-header">
            <div className="tree-header-content">
              <div 
                className="tree-header-icon"
                onClick={() => toggleSection(group.label)}
                style={{ cursor: 'pointer' }}
              >
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 12 12" 
                  fill="none"
                  style={{ 
                    transform: collapsedSections.has(group.label) ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <path 
                    d="M2 3L6 7L10 3" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="tree-header-label">{group.label}</span>
            </div>
          </div>
          
          {!collapsedSections.has(group.label) && (
            <div className="history-tree-list">
              {group.conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  onRename={onRename}
                  onDelete={handleDelete}
                  onShare={onShare}
                  onClose={onClose}
                  isMenuOpen={openMenuId === conversation.id}
                  onMenuToggle={menuToggleMap.get(conversation.id) || (() => {})}
                  activeConversationId={activeConversationId}
                  onPin={onPin}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
