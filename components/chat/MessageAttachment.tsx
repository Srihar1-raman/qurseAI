/**
 * Message Attachment Component
 * Displays file attachments in chat messages
 */

import React from 'react';
import { Icon } from '@/components/icons';
import type { Attachment } from '@/lib/types';
import { formatFileSize, isImage } from '@/lib/services/attachment.service';

interface MessageAttachmentProps {
  attachments: Attachment[];
}

export function MessageAttachment({ attachments }: MessageAttachmentProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="message-attachments">
      <div className="message-attachments-list">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="message-attachment-item">
            {isImage(attachment.contentType) ? (
              <div className="message-attachment-preview">
                <img
                  src={attachment.url}
                  alt={attachment.originalName}
                  className="message-attachment-image"
                />
              </div>
            ) : (
              <div className="message-attachment-file">
                <div className="message-attachment-icon">
                  <Icon name="chat" size={16} />
                </div>
                <div className="message-attachment-info">
                  <div className="message-attachment-name">
                    {attachment.originalName}
                  </div>
                  <div className="message-attachment-size">
                    {formatFileSize(attachment.size)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MessageAttachment;
