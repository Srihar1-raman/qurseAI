'use client';

import { useState, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-provider';
import { useOptimisticNavigation } from '@/hooks/use-optimistic-navigation';
import { getIconPath } from '@/lib/icon-utils';
import { useClickOutside } from '@/hooks/use-click-outside';
import type { ConversationItemProps } from '@/lib/types';

export default function ConversationItem({ 
  conversation, 
  onRename, 
  onDelete, 
  onClose,
  isMenuOpen,
  onMenuToggle
}: ConversationItemProps) {
  const router = useRouter();
  const { navigateOptimistically } = useOptimisticNavigation();
  const { resolvedTheme, mounted } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

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
      // Use optimistic navigation for instant skeleton feedback
      navigateOptimistically(`/conversation/${conversation.id}`);
      onClose();
    }
  };

  const handleRename = () => {
    if (editTitle.trim()) {
      onRename(conversation.id, editTitle.trim());
    }
    setIsEditing(false);
    onMenuToggle(); // Close menu after rename
  };

  const handleDelete = () => {
    onDelete(conversation.id);
    onMenuToggle(); // Close menu after delete
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

  // Close menu when clicking outside (industry standard pattern)
  // Note: enabled flag already ensures callback only fires when menu is open
  useClickOutside(menuContainerRef as React.RefObject<HTMLElement>, () => {
    onMenuToggle();
  }, isMenuOpen);

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
    } else if (!isMenuOpen) {
      // Reset to default direction when menu closes (consistency)
      setMenuDirection('up');
    }
  }, [isMenuOpen]);

  return (
    <div className="history-tree-item">
      <div 
        className="tree-item-content"
        onClick={handleChatClick}
        onMouseEnter={() => !isEditing && router.prefetch(`/conversation/${conversation.id}`)}
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
        <div className="tree-item-actions" ref={menuContainerRef}>
          <button
            ref={menuTriggerRef}
            className="chat-menu-trigger"
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle();
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
                onMenuToggle(); // Close menu
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
