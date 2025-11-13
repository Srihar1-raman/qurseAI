'use client';

import { useState, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import type { ConversationItemProps } from '@/lib/types';

export default function ConversationItem({ 
  conversation, 
  onRename, 
  onDelete, 
  onClose 
}: ConversationItemProps) {
  const { resolvedTheme, mounted } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleChatClick = () => {
    if (!isEditing) {
      // Use window.history.replaceState() for true SPA behavior (0ms, no navigation)
      // Next.js usePathname() hook automatically detects replaceState() changes
      // This eliminates 200-500ms navigation delay
      window.history.replaceState({}, '', `/conversation/${conversation.id}`);
      onClose();
    }
  };

  const handleRename = () => {
    if (editTitle.trim()) {
      onRename(conversation.id, editTitle.trim());
    }
    setIsEditing(false);
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    onDelete(conversation.id);
    setIsMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(conversation.title);
    }
  };

  const handleBlur = () => {
    handleRename();
  };

  // Viewport-aware menu positioning: detect available space and flip direction if needed
  // Use useLayoutEffect to calculate before paint (eliminates flash)
  useLayoutEffect(() => {
    if (isMenuOpen && menuTriggerRef.current) {
      const triggerRect = menuTriggerRef.current.getBoundingClientRect();
      
      // Find the scrollable container (.history-content) to check space relative to it
      const scrollContainer = menuTriggerRef.current.closest('.history-content') as HTMLElement;
      
      let spaceAbove: number;
      let spaceBelow: number;
      
      if (scrollContainer) {
        // Calculate space relative to scroll container (not window viewport)
        const containerRect = scrollContainer.getBoundingClientRect();
        
        // Find search bar container and account for its height
        const searchContainer = scrollContainer.querySelector('.history-search-container') as HTMLElement;
        const searchBarHeight = searchContainer ? searchContainer.getBoundingClientRect().height : 0;
        
        // Space above = distance from trigger to container top, minus search bar height
        spaceAbove = triggerRect.top - containerRect.top - searchBarHeight;
        spaceBelow = containerRect.bottom - triggerRect.bottom;
      } else {
        // Fallback to window viewport if container not found
        spaceAbove = triggerRect.top;
        spaceBelow = window.innerHeight - triggerRect.bottom;
      }
      
      // Handle negative space explicitly (edge case: trigger above container)
      if (spaceAbove < 0) {
        setMenuDirection('down');
        return;
      }
      
      // Use estimate for calculation (menu not rendered yet in useLayoutEffect)
      // Estimate: 2 items (~32px each) + padding (8px) = ~72px, add buffer = 80px
      // This is accurate enough for positioning decisions
      const estimatedMenuHeight = 80;
      
      // Open upward if there's enough space above, otherwise open downward
      if (spaceAbove >= estimatedMenuHeight) {
        setMenuDirection('up');
      } else if (spaceBelow >= estimatedMenuHeight) {
        setMenuDirection('down');
      } else {
        // If neither direction has enough space, prefer downward for first items
        setMenuDirection('down');
      }
    }
  }, [isMenuOpen]);

  return (
    <div className="history-tree-item">
      <div 
        className="tree-item-content"
        onClick={handleChatClick}
        style={{ cursor: isEditing ? 'default' : 'pointer' }}
      >
        <div className="tree-item-main">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="tree-item-edit-input"
              autoFocus
            />
          ) : (
            <>
              <div className="tree-item-title">{conversation.title}</div>
              <div className="tree-item-meta">
                <span className="tree-item-time">{formatTimestamp(conversation.updated_at)}</span>
              </div>
            </>
          )}
        </div>
        
        {/* Actions */}
        <div className="tree-item-actions">
          <button
            ref={menuTriggerRef}
            className="chat-menu-trigger"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            title="More options"
          >
            <Image 
              src={getIconPath("more", resolvedTheme, false, mounted)} 
              alt="More options" 
              width={12} 
              height={12} 
              className={`tree-item-more ${isMenuOpen ? 'active' : ''}`}
            />
          </button>
          
          {isMenuOpen && (
            <div className={`chat-menu chat-menu-${menuDirection}`}>
              <div className="chat-menu-item" onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setEditTitle(conversation.title);
                setIsMenuOpen(false);
              }}>
                <Image 
                  src={getIconPath("rename", resolvedTheme, false, mounted)} 
                  alt="Rename" 
                  width={14} 
                  height={14} 
                  className="icon-sm" 
                />
                <span>Rename</span>
              </div>
              <div className="chat-menu-item" onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}>
                <Image 
                  src={getIconPath("delete", resolvedTheme, false, mounted)} 
                  alt="Delete" 
                  width={14} 
                  height={14} 
                  className="icon-sm" 
                />
                <span>Delete</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
