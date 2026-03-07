'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/icons';
import { useToast } from '@/lib/contexts/ToastContext';

interface DiagramActionsProps {
  code: string;
  onDownload?: () => void;
}

export const DiagramActions: React.FC<DiagramActionsProps> = ({
  code,
  onDownload,
}) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className="diagram-actions">
      <button
        onClick={handleCopy}
        className="action-button"
        title="Copy code"
        type="button"
      >
        {copied ? (
          <Icon
            name="check"
            size={14}
            aria-label="Copied"
          />
        ) : (
          <Icon
            name="copy"
            size={14}
            aria-label="Copy"
          />
        )}
      </button>
      {onDownload && (
        <button
          onClick={onDownload}
          className="action-button"
          title="Download"
          type="button"
        >
          <Icon
            name="download"
            size={14}
            aria-label="Download"
          />
        </button>
      )}
    </div>
  );
};
