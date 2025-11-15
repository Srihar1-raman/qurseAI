'use client';

import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ClearHistoryModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: ClearHistoryModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Clear Chat History"
      message="This will permanently delete all your conversations. This action cannot be undone."
      variant="danger"
      confirmText="Clear All"
    />
  );
}
