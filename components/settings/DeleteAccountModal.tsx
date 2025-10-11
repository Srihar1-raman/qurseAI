'use client';

import type { DeleteAccountModalProps } from '@/lib/types';

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  deleteConfirmation,
  setDeleteConfirmation,
  isDeleting,
  userStats
}: DeleteAccountModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={() => {
        onClose();
        setDeleteConfirmation('');
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title danger">
          Delete Account
        </h3>
        
        <p className="modal-text">
          This will permanently delete your account and all associated data, including:
        </p>
        
        <ul className="modal-list">
          <li>All conversations ({userStats?.totalConversations || 0} total)</li>
          <li>Account profile and settings</li>
          <li>Any uploaded files and attachments</li>
        </ul>
        
        <p className="modal-warning">
          This action cannot be undone.
        </p>
        
        <div className="modal-form-group">
          <label className="modal-label">
            Type &quot;DELETE&quot; to confirm:
          </label>
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="DELETE"
            className="modal-input"
            disabled={isDeleting}
          />
        </div>
        
        <div className="modal-actions">
          <button
            onClick={() => {
              onClose();
              setDeleteConfirmation('');
            }}
            disabled={isDeleting}
            className="modal-btn modal-btn-cancel"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || deleteConfirmation !== 'DELETE'}
            className="modal-btn modal-btn-danger"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

