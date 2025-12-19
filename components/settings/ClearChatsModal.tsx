'use client';

import type { ClearChatsModalProps } from '@/lib/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function ClearChatsModal({
  isOpen,
  onClose,
  onConfirm,
  isClearingChats,
  userStats
}: ClearChatsModalProps) {
  const message = (
    <>
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
    </>
  );

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Clear All Chats"
      message={message}
      variant="danger"
      warning="This action cannot be undone."
      confirmText={isClearingChats ? 'Clearing...' : 'Clear All Chats'}
      disabled={isClearingChats}
      preventClose={isClearingChats}
    />
  );
}

