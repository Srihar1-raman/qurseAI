'use client';

import { useState } from 'react';
import ConversationItem from './ConversationItem';
import type { ConversationListProps } from '@/lib/types';

export default function ConversationList({ 
  groupedConversations, 
  onRename, 
  onDelete, 
  onClose 
}: ConversationListProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

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
                  onDelete={onDelete}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
