'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { useToast } from '@/lib/contexts/ToastContext';
import { getIconPath } from '@/lib/icon-utils';

interface DiagramActionsProps {
  code: string;
  onDownload?: () => void;
}

export const DiagramActions: React.FC<DiagramActionsProps> = ({
  code,
  onDownload,
}) => {
  const { resolvedTheme, mounted } = useTheme();
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
          <Image
            src={getIconPath('check', resolvedTheme, false, mounted)}
            alt="Copied"
            width={14}
            height={14}
          />
        ) : (
          <Image
            src={getIconPath('copy', resolvedTheme, false, mounted)}
            alt="Copy"
            width={14}
            height={14}
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
          <Image
            src={getIconPath('download', resolvedTheme, false, mounted)}
            alt="Download"
            width={14}
            height={14}
          />
        </button>
      )}
    </div>
  );
};
