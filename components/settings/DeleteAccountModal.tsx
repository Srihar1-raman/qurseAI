'use client';

import type { DeleteAccountModalProps } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { UnifiedButton } from '@/components/ui/UnifiedButton';

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  deleteConfirmation,
  setDeleteConfirmation,
  isDeleting,
  userStats
}: DeleteAccountModalProps) {
  const handleClose = () => {
    onClose();
    setDeleteConfirmation('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} preventClose={isDeleting}>
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
        <UnifiedButton
          variant="secondary"
          onClick={handleClose}
          disabled={isDeleting}
        >
          Cancel
        </UnifiedButton>
        <UnifiedButton
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting || deleteConfirmation !== 'DELETE'}
        >
          {isDeleting ? 'Deleting...' : 'Delete Account'}
        </UnifiedButton>
      </div>
    </Modal>
  );
}

