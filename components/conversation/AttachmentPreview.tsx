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
          <div key={attachment.id} className="attachment-preview-item">
            {isImage(attachment.contentType) ? (
              <div className="attachment-image-preview">
                <img src={attachment.url} alt={attachment.originalName} />
              </div>
            ) : (
              <div className="attachment-file-icon">
                <Icon name={getFileIconName(attachment.contentType)} size={20} />
              </div>
            )}
            <div className="attachment-info">
              <span className="attachment-name" title={attachment.originalName}>
                {attachment.originalName}
              </span>
              <span className="attachment-size">{formatFileSize(attachment.size)}</span>
            </div>
            {uploading ? (
              <div className="attachment-uploading">
                <span className="loading-spinner-small" />
              </div>
            ) : (
              <button
                type="button"
                className="attachment-remove-btn"
                onClick={() => onRemove(attachment.id)}
                aria-label="Remove attachment"
              >
                <Icon name="cross" size={14} />
              </button>
            )}
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
