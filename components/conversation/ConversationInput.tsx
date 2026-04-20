/**
 * Conversation input component
 * Handles message input, model selection, and web search mode
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/lib/theme-provider';
import { Icon } from '@/components/icons';
import ModelSelector from '@/components/homepage/ModelSelector';
import WebSearchSelector from '@/components/homepage/WebSearchSelector';
import { getOptionFromChatMode, getChatModeFromOption } from '@/lib/conversation/chat-mode-utils';
import { ContextIndicator } from './ContextIndicator';
import { AttachmentPreview } from './AttachmentPreview';
import { useToast } from '@/lib/contexts/ToastContext';
import type { ContextUsage } from './types';
import type { Attachment } from '@/lib/types';
import { ATTACHMENT_LIMITS } from '@/lib/types';
import { validateFile } from '@/lib/services/attachment.service';
import { hasVisionSupport } from '@/ai/models';

interface ConversationInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent, attachments?: Attachment[]) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isLoading: boolean;
  chatMode: string;
  onChatModeChange: (mode: string) => void;
  onStop?: () => void;
  showStopButton?: boolean;
  disabled?: boolean;
  onDisabledClick?: () => void;
  contextUsage?: ContextUsage | null;
  showSelectors?: boolean;
  selectedModel?: string;
}

export function ConversationInput({
  input,
  onInputChange,
  onSubmit,
  onKeyPress,
  textareaRef,
  isLoading,
  chatMode,
  onChatModeChange,
  onStop,
  showStopButton = false,
  disabled = false,
  onDisabledClick,
  contextUsage,
  showSelectors = true,
  selectedModel,
}: ConversationInputProps) {
  const { resolvedTheme, mounted } = useTheme();
  const { error: showToastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const showButtonsBackground = useRef(false);

  const hasImageAttachment = attachments.some(a => a.contentType.startsWith('image/'));
  const modelSupportsVision = selectedModel ? hasVisionSupport(selectedModel) : false;
  const hasImageModelConflict = hasImageAttachment && !modelSupportsVision;

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const updateButtonsBackground = () => {
        if (!textarea) return;
        const needsBackground = input.length > 60 || textarea.scrollHeight > textarea.clientHeight * 2;
        showButtonsBackground.current = needsBackground;
      };

      textarea.addEventListener('input', updateButtonsBackground);
      textarea.addEventListener('input', () => setTimeout(updateButtonsBackground, 0));

      return () => {
        textarea.removeEventListener('input', updateButtonsBackground);
      };
    }
  }, [input, textareaRef]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > ATTACHMENT_LIMITS.MAX_FILES_PER_MESSAGE) {
      showToastError(`Maximum ${ATTACHMENT_LIMITS.MAX_FILES_PER_MESSAGE} files allowed per message`);
      return;
    }

    setUploading(true);

    for (const file of Array.from(files)) {
      const validation = validateFile(file);
      if (!validation.valid) {
        showToastError(validation.error || 'Invalid file');
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/attachments/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success && result.attachment) {
          setAttachments((prev) => [...prev, result.attachment]);
        } else {
          showToastError(result.error || 'Upload failed');
        }
      } catch (err) {
        console.error('[ConversationInput] Upload error:', err);
        showToastError('Failed to upload file');
      }
    }

    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachments.length, showToastError]);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    onSubmit(e, attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
  }, [onSubmit, attachments]);

  const canSend = (input.trim() || attachments.length > 0) && !hasImageModelConflict;

  return (
    <div className="input-section">
      <div className="input-section-content">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.txt,.md,.xlsx,.csv,.json,.xml,.html"
          attachments={attachments}
          onRemove={handleRemoveAttachment}
          uploading={uploading}
        />

        {hasImageModelConflict && (
          <div className="attachment-error-message">
            <span>
              This model doesn't support images. Please select a vision-enabled model or remove the image.
            </span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="input-container conversation-input-container">
          <div
            onClick={(e) => {
              if (disabled && onDisabledClick) {
                e.preventDefault();
                e.stopPropagation();
                onDisabledClick();
              }
            }}
            onMouseDown={(e) => {
              if (disabled && onDisabledClick) {
                e.preventDefault();
                e.stopPropagation();
                onDisabledClick();
              }
            }}
            onTouchStart={(e) => {
              if (disabled && onDisabledClick) {
                e.preventDefault();
                e.stopPropagation();
                onDisabledClick();
              }
            }}
            style={{
              position: 'relative',
              width: '100%',
              cursor: disabled ? 'not-allowed' : 'text',
              pointerEvents: disabled ? 'auto' : 'auto',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
              onClick={(e) => {
                if (disabled && onDisabledClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDisabledClick();
                }
              }}
              onFocus={(e) => {
                if (disabled && onDisabledClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDisabledClick();
                }
              }}
              onKeyDown={(e) => {
                if (disabled && onDisabledClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDisabledClick();
                }
              }}
              onMouseDown={(e) => {
                if (disabled && onDisabledClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDisabledClick();
                }
              }}
              placeholder="Message Qurse..."
              className="main-input conversation-input"
              rows={1}
              disabled={isLoading || disabled}
              style={disabled ? { pointerEvents: 'none' } : undefined}
            />
          </div>

          <div
            className={`input-buttons-background${showButtonsBackground.current ? ' show' : ''}`}
            style={{ pointerEvents: 'none' }}
          />

          <div className="input-actions-left">
            {showSelectors && (
              <>
                <div className="input-model-selector">
                  <ModelSelector showChevron={false} />
                </div>

                <div className="input-model-selector">
                  <WebSearchSelector
                    selectedOption={getOptionFromChatMode(chatMode)}
                    onSelectOption={(optionName) => {
                      onChatModeChange(getChatModeFromOption(optionName));
                    }}
                    showChevron={false}
                  />
                </div>
              </>
            )}

            <button
              type="button"
              onClick={handleAttachClick}
              className="attach-btn"
              title="Attach file"
              disabled={isLoading || disabled || uploading}
              style={{
                opacity: uploading ? 0.5 : 1,
              }}
            >
              {uploading ? (
                <span className="w-4 h-4 border-2 border-t-[var(--color-primary)] rounded-full animate-spin" />
              ) : (
                <Icon
                  name="attach"
                  size={16}
                  aria-label="Attach"
                  className={canSend ? "icon-active" : ""}
                />
              )}
            </button>

            <ContextIndicator contextUsage={contextUsage || null} />
          </div>

          <div className="input-actions-right">
            {showStopButton && onStop ? (
              <button
                type="button"
                className="send-btn active"
                title="Stop generation"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStop();
                }}
              >
                <div style={{ opacity: 1 }}>
                  <Icon
                    name="stop"
                    size={16}
                    aria-label="Stop"
                    className="icon-active"
                  />
                </div>
              </button>
            ) : (
              <button
                type="submit"
                className={`send-btn ${canSend ? 'active' : ''}`}
                title={hasImageModelConflict ? "This model doesn't support images. Please select a vision-enabled model or remove the image." : "Send message"}
                disabled={!canSend || isLoading}
              >
                <div style={{ opacity: 1 }}>
                  <Icon
                    name="send"
                    size={16}
                    aria-label="Send"
                    className={canSend ? "icon-active" : ""}
                  />
                </div>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
