'use client';

import { useState, useRef, useCallback } from 'react';
import { useTheme } from '@/lib/theme-provider';
import { Icon } from '@/components/icons';
import { useConversation } from '@/lib/contexts/ConversationContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSidebar } from '@/lib/contexts/SidebarContext';
import { useRateLimit } from '@/lib/contexts/RateLimitContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { GuestRateLimitPopup, FreeUserRateLimitPopup } from '@/components/rate-limit';
import { useRouter } from 'next/navigation';
import { useMobile } from '@/hooks/use-mobile';
import { useAutoFocus } from '@/hooks/use-auto-focus';
import { useTextareaAutoResize } from '@/hooks/use-textarea-auto-resize';
import type { Conversation } from '@/lib/types';
import type { Attachment } from '@/lib/types';
import { validateFile, formatFileSize, isImage } from '@/lib/services/attachment.service';

interface MainInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  showAttachButton?: boolean;
  shouldNavigate?: boolean;
}

export default function MainInput({ inputValue, setInputValue, showAttachButton = true, shouldNavigate = false }: MainInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, mounted } = useTheme();
  const { selectedModel, chatMode } = useConversation();
  const { user } = useAuth();
  const { addConversationOptimistically } = useSidebar();
  const { state: rateLimitState, setRateLimitState } = useRateLimit();
  const { error: showToastError } = useToast();
  const router = useRouter();
  
  // Track send attempts while rate limited to show popup again
  const [sendAttemptCount, setSendAttemptCount] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 5) {
      showToastError('Maximum 5 files allowed per message');
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
        console.error('[MainInput] Upload error:', err);
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

  // Use hooks for mobile detection, auto-focus, and textarea auto-resize
  const isMobile = useMobile();
  useAutoFocus(inputRef as React.RefObject<HTMLTextAreaElement>);
  const { isMultiline } = useTextareaAutoResize(inputRef, inputValue, {
    multilineThreshold: 60,
    maxHeight: 200,
  });

  const handleSend = () => {
    const messageText = inputValue.trim();
    if (!messageText && attachments.length === 0) return;
    
    // Check rate limit state (client-side check - instant, zero latency)
    // This state is set by pre-flight check on app load or by error handler
    if (rateLimitState.isRateLimited) {
      // Increment send attempt count to trigger popup to show again
      setSendAttemptCount(prev => prev + 1);
      return;
    }
    
    // Generate conversation ID
    const chatId = crypto.randomUUID();
    
    // OPTIMISTIC UPDATE: Add conversation to sidebar immediately (for both auth and guest users)
    const truncatedTitle = messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '');
    const optimisticConversation: Conversation = {
      id: chatId,
      title: truncatedTitle || 'New Chat',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      message_count: 0,
    };
    addConversationOptimistically(optimisticConversation);
    
    // Encode attachments as JSON in URL params
    const attachmentsParam = attachments.length > 0 ? encodeURIComponent(JSON.stringify(attachments)) : '';
    
    // Construct URL with message params
    // Same URL format for both auth and guest users
    const url = `/conversation/${chatId}?message=${encodeURIComponent(messageText)}&model=${encodeURIComponent(selectedModel)}&mode=${encodeURIComponent(chatMode)}${attachmentsParam ? `&attachments=${attachmentsParam}` : ''}`;

    // Navigate to conversation page
    if (shouldNavigate) {
      router.push(url);
    } else {
      // Use window.history.replaceState() for instant response (0ms navigation overhead)
      window.history.replaceState({}, '', url);
    }

    // Clear input and attachments
    setInputValue('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-[800px] relative mx-auto mb-2">
      <style jsx>{`
        // .main-input:focus {
        //   border: 0px solid var(--color-primary) !important;
        //   box-shadow: 0 2px 80px var(--color-shadow) !important;
        // }
        .homepage-input-container {
          position: relative;
          border: 1px solid var(--color-border-hover);
          border-radius: 20px;
          background: var(--color-bg-input);
          box-shadow: 0 2px 8px var(--color-shadow);
          transition: border 0.2s, box-shadow 0.2s;
        }
        .homepage-input-container:focus-within {
          border: 1px solid var(--color-primary);
          box-shadow: 0 2px 8px var(--color-shadow);
        }
        .homepage-buttons-background {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 50px;
          background: var(--color-bg-input);
          border-radius: 0 0 20px 20px;
          z-index: 1;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .homepage-buttons-background.show {
          opacity: 1;
        }
        .main-input::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      <div className="homepage-input-container">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.txt,.md,.xlsx,.xls,.csv,.json,.xml,.html"
          style={{ display: 'none' }}
        />

        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 absolute left-4 bottom-14 z-10">
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
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  className="ml-1 hover:text-red-500"
                >
                  <Icon name="cross" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {(isMultiline || isMobile) && (
          <div 
            className="homepage-buttons-background show"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '50px',
              background: 'var(--color-bg-input)',
              borderRadius: '0 0 20px 20px',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
        )}
        
        <textarea
          ref={inputRef}
          rows={1}
          className={`w-full text-base main-input ${(isMultiline || isMobile) ? 'multiline' : ''}`}
          placeholder="Message Qurse..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            padding: (isMultiline || isMobile) ? '12px 15px 60px 15px' : '12px 96px 12px 16px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '16px',
            outline: 'none',
            background: 'transparent',
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            resize: 'none',
            minHeight: isMobile ? '85px' : '48px',
            maxHeight: '200px',
            overflowY: (isMultiline || isMobile) ? 'auto' : 'hidden',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            position: 'relative',
            zIndex: 0, // Textarea content below buttons
          }}
        />
        
        {/* Buttons - position changes based on mode */}
        {!(isMultiline || isMobile) ? (
          // Single-line mode: buttons on the right
          <div
            className="absolute right-3 top-1/2 flex items-center gap-2"
            style={{ transform: 'translateY(-50%)', transition: 'all 0.2s' }}
          >
            {/* Attach Button */}
            {showAttachButton && (
              <button
                type="button"
                onClick={handleAttachClick}
                disabled={uploading}
                className="flex items-center justify-center transition-all"
                aria-label="Attach file"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '0',
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                {uploading ? (
                  <span className="w-4 h-4 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
                ) : (
                  <Icon
                    name="attach"
                    size={16}
                    aria-label="Attach file"
                  />
                )}
              </button>
            )}

            {/* Send Button */}
            <button
              type="button"
              disabled={!inputValue.trim()}
              className="flex items-center justify-center transition-all"
              aria-label="Send message"
              onClick={handleSend}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: inputValue.trim() ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                border: `1px solid ${inputValue.trim() ? 'var(--color-primary)' : 'var(--color-border)'}`,
                padding: '0',
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <div style={{ opacity: 1 }}>
                <Icon
                  name="send"
                  size={16}
                  aria-label="Send"
                  className={inputValue.trim() ? "icon-active" : ""}
                />
              </div>
            </button>
          </div>
        ) : (
          // Multiline mode: buttons at bottom
          <>
            {showAttachButton && (
              <div
                className="absolute left-3 bottom-2 flex items-center gap-2"
                style={{ zIndex: 10, transition: 'all 0.2s' }}
              >
                {/* Attach Button */}
                <button
                  type="button"
                  onClick={handleAttachClick}
                  disabled={uploading}
                  className="flex items-center justify-center transition-all"
                  aria-label="Attach file"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    padding: '0',
                    opacity: uploading ? 0.5 : 1,
                  }}
                >
                  {uploading ? (
                    <span className="w-4 h-4 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
                  ) : (
                    <Icon
                      name="attach"
                      size={16}
                      aria-label="Attach file"
                    />
                  )}
                </button>
              </div>
            )}
            
            <div 
              className="absolute right-3 bottom-2 flex items-center gap-2"
              style={{ zIndex: 10, transition: 'all 0.2s' }}
            >
              {/* Send Button */}
              <button
                type="button"
                disabled={!inputValue.trim()}
                className="flex items-center justify-center transition-all"
                aria-label="Send message"
                onClick={handleSend}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: inputValue.trim() ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${inputValue.trim() ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  padding: '0',
                  cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                  <div style={{ opacity: 1 }}>
                    <Icon
                      name="send"
                      size={16}
                      aria-label="Send"
                      className={inputValue.trim() ? "icon-active" : ""}
                    />
                  </div>
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* Rate limit popups - only show when user tries to send */}
      {rateLimitState.isRateLimited && sendAttemptCount > 0 && !user && (
        <GuestRateLimitPopup
          key={sendAttemptCount}
          isOpen={true}
          onClose={() => {
            // Don't clear state - user is still rate limited
          }}
          reset={rateLimitState.resetTime || Date.now()}
          layer={rateLimitState.layer || 'database'}
        />
      )}
      
      {rateLimitState.isRateLimited && sendAttemptCount > 0 && user && (
        <FreeUserRateLimitPopup
          key={sendAttemptCount}
          isOpen={true}
          onClose={() => {
            // Don't clear state - user is still rate limited
          }}
          onUpgrade={async () => {
            try {
              const response = await fetch('/api/payments/checkout', {
                method: 'POST',
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session');
              }

              const data = await response.json();

              if (!data.checkout_url) {
                throw new Error('No checkout URL returned');
              }

              window.location.href = data.checkout_url;
            } catch (error) {
              console.error('Checkout error:', error);
              showToastError(
                error instanceof Error
                  ? error.message
                  : 'Failed to start checkout. Please try again.'
              );
            }
          }}
          reset={rateLimitState.resetTime || Date.now()}
        />
      )}
    </div>
  );
}
