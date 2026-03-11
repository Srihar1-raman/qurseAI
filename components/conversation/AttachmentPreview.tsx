/**
 * AttachmentPreview Component
 * Displays uploaded file attachments before sending
 */

import React from 'react';
import { Icon } from '@/components/icons';
import type { Attachment } from '@/lib/types';
import { formatFileSize, isImage } from '@/lib/services/attachment.service';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  uploading?: boolean;
}

export function AttachmentPreview({ attachments, onRemove, uploading = false }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="attachment-preview-container">
      <div className="attachment-preview-list">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-xs"
          >
            {isImage(attachment.contentType) ? (
              <img src={attachment.url} alt={attachment.originalName} className="w-6 h-6 object-cover rounded" />
            ) : (
              <Icon name="attach" size={14} />
            )}
            <span className="max-w-[100px] truncate">{attachment.originalName}</span>
            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              className="ml-1 hover:text-red-500"
            >
              <Icon name="cross" size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function getFileIconName(contentType: string): 'image' | 'chat' | 'attach' {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf') return 'chat';
  if (contentType.includes('word') || contentType.includes('document')) return 'chat';
  if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType === 'text/csv') return 'chat';
  if (contentType === 'text/plain' || contentType === 'text/markdown') return 'chat';
  return 'attach';
}

export default AttachmentPreview;
