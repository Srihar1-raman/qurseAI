'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      router.push(`/conversation?id=${conversation.id}`);
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
            <div className="chat-menu">
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
