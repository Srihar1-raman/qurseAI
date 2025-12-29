'use client';

import { Modal } from '@/components/ui/Modal';
import { UnifiedButton } from '@/components/ui/UnifiedButton';

interface SignOutAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSigningOut: boolean;
}

export default function SignOutAllModal({
  isOpen,
  onClose,
  onConfirm,
  isSigningOut,
}: SignOutAllModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} preventClose={isSigningOut}>
      <h3 className="modal-title danger">
        Sign Out All Devices
      </h3>

      <p className="modal-text">
        This will immediately sign you out from all devices where your account is logged in, including:
      </p>

      <ul className="modal-list">
        <li>This browser/device</li>
        <li>All other browsers</li>
        <li>Mobile apps</li>
        <li>Any other active sessions</li>
      </ul>

      <p className="modal-warning">
        You will need to sign in again on each device after this action.
      </p>

      <div className="modal-actions">
        <UnifiedButton
          variant="secondary"
          onClick={onClose}
          disabled={isSigningOut}
        >
          Cancel
        </UnifiedButton>
        <UnifiedButton
          variant="danger"
          onClick={onConfirm}
          disabled={isSigningOut}
        >
          {isSigningOut ? 'Signing Out...' : 'Sign Out All Devices'}
        </UnifiedButton>
      </div>
    </Modal>
  );
}
