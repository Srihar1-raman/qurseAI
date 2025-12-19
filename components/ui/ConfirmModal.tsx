'use client';

import React from 'react';
import { Modal } from './Modal';
import { UnifiedButton } from './UnifiedButton';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  warning?: string;
  disabled?: boolean;
  preventClose?: boolean; // When true, prevents closing via backdrop click or Escape key
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  warning,
  disabled = false,
  preventClose = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} preventClose={preventClose}>
      <h3
        className={variant === 'danger' ? 'modal-title danger' : 'modal-title'}
      >
        {title}
      </h3>

      {typeof message === 'string' ? (
        <p className="modal-text">{message}</p>
      ) : (
        <div className="modal-text">{message}</div>
      )}

      {warning && <p className="modal-warning">{warning}</p>}

      <div className="modal-actions">
        <UnifiedButton variant="secondary" onClick={onClose} disabled={preventClose}>
          {cancelText}
        </UnifiedButton>
        <UnifiedButton
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          disabled={disabled}
        >
          {confirmText}
        </UnifiedButton>
      </div>
    </Modal>
  );
}

