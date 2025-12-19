'use client';

import { useState, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-provider';
import { useOptimisticNavigation } from '@/hooks/use-optimistic-navigation';
import { getIconPath } from '@/lib/icon-utils';
import { useClickOutside } from '@/hooks/use-click-outside';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { ConversationItemProps } from '@/lib/types';

export default function ConversationItem({ 
  conversation, 
  onRename, 
  onDelete, 
  onClose,
  isMenuOpen,
  onMenuToggle,
  activeConversationId,
  onPin
}: ConversationItemProps) {
  const router = useRouter();
  const { navigateOptimistically } = useOptimisticNavigation();
  const { resolvedTheme, mounted } = useTheme();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [isPinning, setIsPinning] = useState(false);
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pinButtonRef = useRef<HTMLButtonElement>(null);

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

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinning) return;

    setIsPinning(true);
    try {
      const isGuest = !user;
      const endpoint = isGuest 
        ? `/api/guest/conversations/${conversation.id}/pin`
        : `/api/conversations/${conversation.id}/pin`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle pin');
      }

      const data = await response.json();
      
      // Optimistically update local state
      if (onPin) {
        onPin(conversation.id, data.pinned);
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    } finally {
      setIsPinning(false);
    }
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
  useClickOutside(menuContainerRef, () => {
    onMenuToggle();
  }, isMenuOpen);

  // Viewport-aware menu positioning: detect available space and flip direction if needed
  // Use useLayoutEffect to calculate before paint (eliminates flash)
  useLayoutEffect(() => {
    if (isMenuOpen && menuTriggerRef.current) {
      const triggerRect = menuTriggerRef.current.getBoundingClientRect();
      
      // Calculate position relative to viewport for fixed positioning
      const sidebar = menuTriggerRef.current.closest('.history-sidebar') as HTMLElement;
      const sidebarRect = sidebar?.getBoundingClientRect();
      const sidebarRight = sidebarRect ? sidebarRect.right : window.innerWidth;
      
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
      
      // Use estimate for calculation (menu not rendered yet in useLayoutEffect)
      // Estimate: 2 items (~32px each) + padding (8px) = ~72px, add buffer = 80px
      const estimatedMenuHeight = 80;
      
      // Calculate menu position
      const menuRight = sidebarRight - triggerRect.right;
      
      // Handle negative space explicitly (edge case: trigger above container)
      if (spaceAbove < 0) {
        setMenuDirection('down');
        setMenuPosition({
          top: triggerRect.bottom + 4,
          right: menuRight,
        });
        return;
      }
      
      // Open upward if there's enough space above, otherwise open downward
      if (spaceAbove >= estimatedMenuHeight) {
        setMenuDirection('up');
        setMenuPosition({
          bottom: window.innerHeight - triggerRect.top + 4,
          right: menuRight,
        });
      } else if (spaceBelow >= estimatedMenuHeight) {
        setMenuDirection('down');
        setMenuPosition({
          top: triggerRect.bottom + 4,
          right: menuRight,
        });
      } else {
        // If neither direction has enough space, prefer downward for first items
        setMenuDirection('down');
        setMenuPosition({
          top: triggerRect.bottom + 4,
          right: menuRight,
        });
      }
    } else if (!isMenuOpen) {
      // Reset to default direction when menu closes (consistency)
      setMenuDirection('up');
      setMenuPosition({ right: 0 });
    }
  }, [isMenuOpen]);

  const isActive = conversation.id === activeConversationId;

  return (
    <div className="history-tree-item">
      <div 
        className={`tree-item-content ${isActive ? 'active' : ''}`}
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
            ref={pinButtonRef}
            className="chat-pin-trigger"
            onClick={handlePin}
            title={conversation.pinned ? "Unpin conversation" : "Pin conversation"}
            disabled={isPinning}
          >
            <Image 
              src={conversation.pinned ? getIconPath("pin", resolvedTheme, true, mounted) : getIconPath("unpin", resolvedTheme, false, mounted)} 
              alt={conversation.pinned ? "Unpin" : "Pin"} 
              width={12} 
              height={12} 
              className={`tree-item-pin ${conversation.pinned ? 'active' : ''}`}
            />
          </button>
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
            <div 
              ref={menuRef}
              className={`chat-menu chat-menu-${menuDirection}`}
              style={menuPosition}
            >
              <div className="chat-menu-item" onClick={(e) => {
                e.stopPropagation();
                // Check if user is guest - trigger popup immediately instead of allowing edit
                if (!user) {
                  onRename(conversation.id, conversation.title); // This will trigger popup in HistorySidebar
                  onMenuToggle(); // Close menu
                  return;
                }
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
