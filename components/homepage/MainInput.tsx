'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useConversation } from '@/lib/contexts/ConversationContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSidebar } from '@/lib/contexts/SidebarContext';
import { useRateLimit } from '@/lib/contexts/RateLimitContext';
import { GuestRateLimitPopup, FreeUserRateLimitPopup } from '@/components/rate-limit';
import { useRouter } from 'next/navigation';
import { useMobile } from '@/hooks/use-mobile';
import { useAutoFocus } from '@/hooks/use-auto-focus';
import { useTextareaAutoResize } from '@/hooks/use-textarea-auto-resize';
import type { Conversation } from '@/lib/types';

export default function MainInput() {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { resolvedTheme, mounted } = useTheme();
  const { selectedModel, chatMode } = useConversation();
  const { user } = useAuth();
  const { addConversationOptimistically } = useSidebar();
  const { state: rateLimitState, setRateLimitState } = useRateLimit();
  const router = useRouter();
  
  // Track send attempts while rate limited to show popup again
  const [sendAttemptCount, setSendAttemptCount] = useState(0);

  // Use hooks for mobile detection, auto-focus, and textarea auto-resize
  const isMobile = useMobile();
  useAutoFocus(inputRef as React.RefObject<HTMLTextAreaElement>);
  const { isMultiline } = useTextareaAutoResize(inputRef, inputValue, {
    multilineThreshold: 60,
    maxHeight: 200,
  });

  const handleSend = () => {
    const messageText = inputValue.trim();
    if (!messageText) return;
    
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
      title: truncatedTitle,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      message_count: 0,
    };
    addConversationOptimistically(optimisticConversation);
    
    // Construct URL with message params
    // Same URL format for both auth and guest users
    const url = `/conversation/${chatId}?message=${encodeURIComponent(messageText)}&model=${encodeURIComponent(selectedModel)}&mode=${encodeURIComponent(chatMode)}`;
    
    // Use window.history.replaceState() for true SPA behavior (0ms, no navigation)
    // Next.js usePathname() hook automatically detects replaceState() changes
    // This eliminates 200-500ms navigation delay
    window.history.replaceState({}, '', url);
    
    // Clear input
    setInputValue('');
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
        {/* Opaque background bar for multiline mode to hide scrolled text */}
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
            <button
              type="button"
              className="flex items-center justify-center transition-all"
              aria-label="Attach file"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                padding: '0',
              }}
            >
              <Image
                src={getIconPath('attach', resolvedTheme, false, mounted)}
                alt="Attach"
                width={16}
                height={16}
              />
            </button>

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
                opacity: inputValue.trim() ? 1 : 0.5,
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Image
                src={inputValue.trim() ? '/icon_light/send.svg' : getIconPath('send', resolvedTheme, false, mounted)}
                alt="Send"
                width={16}
                height={16}
              />
            </button>
          </div>
        ) : (
          // Multiline mode: buttons at bottom
          <>
            <div 
              className="absolute left-3 bottom-2 flex items-center gap-2"
              style={{ zIndex: 10, transition: 'all 0.2s' }}
            >
              {/* Attach Button */}
              <button
                type="button"
                className="flex items-center justify-center transition-all"
                aria-label="Attach file"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '0',
                }}
              >
                <Image
                  src={getIconPath('attach', resolvedTheme, false, mounted)}
                  alt="Attach"
                  width={16}
                  height={16}
                />
              </button>
            </div>
            
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
                  opacity: inputValue.trim() ? 1 : 0.5,
                  cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                <Image
                  src={inputValue.trim() ? '/icon_light/send.svg' : getIconPath('send', resolvedTheme, false, mounted)}
                  alt="Send"
                  width={16}
                  height={16}
                />
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
          onUpgrade={() => {
            router.push('/settings?tab=pricing');
          }}
          reset={rateLimitState.resetTime || Date.now()}
        />
      )}
    </div>
  );
}
