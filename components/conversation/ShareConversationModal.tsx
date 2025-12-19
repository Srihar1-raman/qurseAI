'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { UnifiedButton } from '@/components/ui/UnifiedButton';
import { useToast } from '@/lib/contexts/ToastContext';

interface ShareConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  onUnshare?: () => void;
}

export function ShareConversationModal({
  isOpen,
  onClose,
  shareUrl,
  onUnshare,
}: ShareConversationModalProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('URL copied to clipboard', 'success');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast('Failed to copy URL', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h3 className="modal-title">
        Share Conversation
      </h3>

      <div className="modal-form-group">
        <label className="modal-label">
          Shareable URL
        </label>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}>
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="modal-input"
            style={{ flex: 1 }}
          />
          <UnifiedButton
            variant={copied ? 'success' : 'primary'}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy URL'}
          </UnifiedButton>
        </div>
      </div>

      <p className="modal-text">
        Anyone with this link can view this conversation. Only authenticated users can continue the conversation. Messages sent or received  after sharing your link won't be shared.
      </p>

      <div className="modal-actions">
        <UnifiedButton variant="secondary" onClick={onClose}>
          Close
        </UnifiedButton>
        {onUnshare && (
          <UnifiedButton variant="danger" onClick={onUnshare}>
            Unshare
          </UnifiedButton>
        )}
      </div>
    </Modal>
  );
}

