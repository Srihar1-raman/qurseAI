'use client';

import type { ClearChatsModalProps } from '@/lib/types';

export default function ClearChatsModal({
  isOpen,
  onClose,
  onConfirm,
  isClearingChats,
  userStats
}: ClearChatsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title danger">
          Clear All Chats
        </h3>
        
        <p className="modal-text">
          This will permanently delete all your conversations ({userStats?.totalConversations || 0} total) and cannot be undone.
        </p>
        
        <p className="modal-text">
          This includes:
        </p>
        
        <ul className="modal-list">
          <li>All conversations and messages</li>
          <li>Any uploaded files and attachments</li>
        </ul>
        
        <p className="modal-text">
          Your account and settings will remain intact.
        </p>
        
        <p className="modal-warning">
          This action cannot be undone.
        </p>
        
        <div className="modal-actions">
          <button
            onClick={onClose}
            disabled={isClearingChats}
            className="modal-btn modal-btn-cancel"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isClearingChats}
            className="modal-btn modal-btn-danger"
          >
            {isClearingChats ? 'Clearing...' : 'Clear All Chats'}
          </button>
        </div>
      </div>
    </div>
  );
}

