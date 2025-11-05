'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useConversation } from '@/lib/contexts/ConversationContext';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function MainInput() {
  const [inputValue, setInputValue] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { resolvedTheme, mounted } = useTheme();
  const { selectedModel, chatMode } = useConversation();
  const { user } = useAuth();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-focus input when user starts typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      if (
        !isInputFocused &&
        !e.ctrlKey && 
        !e.metaKey && 
        !e.altKey && 
        e.key !== 'Tab' &&
        e.key !== 'Escape' &&
        e.key !== 'Enter'
      ) {
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Industry standard: Aggressive prefetching for likely-used routes
  // Prefetch on mount (immediate) + on interaction (redundant but safe)
  // This ensures route is ready before user clicks send, eliminating homepage delay
  useEffect(() => {
    // Prefetch immediately on mount (industry standard for high-probability routes)
    const sampleId = '00000000-0000-0000-0000-000000000000'; // Dummy ID for prefetch
    router.prefetch(`/conversation/${sampleId}`);

    // Also prefetch on interaction (redundant but ensures it's always ready)
    const handlePrefetch = () => {
      router.prefetch(`/conversation/${sampleId}`);
    };

    const textarea = inputRef.current;
    if (!textarea) return;

    // Prefetch on focus (user starts typing)
    textarea.addEventListener('focus', handlePrefetch);
    
    // Prefetch on hover (desktop - user might send message)
    const currentIsMobile = window.innerWidth <= 768;
    if (!currentIsMobile) {
      textarea.addEventListener('mouseenter', handlePrefetch);
    }

    return () => {
      // Remove listeners from the textarea we added them to
      // Use captured textarea variable (not inputRef.current) to ensure we remove
      // listeners from the exact element we added them to
      textarea.removeEventListener('focus', handlePrefetch);
      textarea.removeEventListener('mouseenter', handlePrefetch);
    };
  }, [router]);

  // Auto-resize textarea and check if multiline
  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(scrollHeight, 200);
      textarea.style.height = newHeight + 'px';
      
      // Switch to multiline layout if content exceeds ~2 lines (60px) OR if on mobile
      setIsMultiline(scrollHeight > 60 || isMobile);
      
      // If content exceeds max height, scroll to bottom to keep cursor visible
      if (scrollHeight > 200) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    }
  }, [inputValue, isMobile]);

  // Cleanup navigation timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSend = () => {
    const messageText = inputValue.trim();
    if (!messageText || isNavigating) return;

    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }

    setIsNavigating(true);
    
    // Generate conversation ID
    const chatId = crypto.randomUUID();
    
    // Construct navigation URL
    const url = user && user.id
      ? `/conversation/${chatId}?message=${encodeURIComponent(messageText)}&model=${encodeURIComponent(selectedModel)}&mode=${encodeURIComponent(chatMode)}`
      : `/conversation/temp-${chatId}?message=${encodeURIComponent(messageText)}&model=${encodeURIComponent(selectedModel)}&mode=${encodeURIComponent(chatMode)}`;
    
    // Non-blocking navigation - router.push() handles prefetching
    router.push(url);
    
    // Safety: Reset navigation state after a delay if navigation doesn't complete
    // This prevents isNavigating from staying true forever if navigation fails
    // Note: If component unmounts (navigation succeeded), cleanup useEffect will clear this timeout
    navigationTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      navigationTimeoutRef.current = null;
    }, 2000);
    
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
            transition: 'padding 0.2s',
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
              disabled={!inputValue.trim() || isNavigating}
              className="flex items-center justify-center transition-all"
              aria-label="Send message"
              onClick={handleSend}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: inputValue.trim() && !isNavigating ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                border: `1px solid ${inputValue.trim() && !isNavigating ? 'var(--color-primary)' : 'var(--color-border)'}`,
                padding: '0',
                opacity: inputValue.trim() && !isNavigating ? 1 : 0.5,
                cursor: inputValue.trim() && !isNavigating ? 'pointer' : 'not-allowed',
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
                disabled={!inputValue.trim() || isNavigating}
                className="flex items-center justify-center transition-all"
                aria-label="Send message"
                onClick={handleSend}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: inputValue.trim() && !isNavigating ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${inputValue.trim() && !isNavigating ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  padding: '0',
                  opacity: inputValue.trim() && !isNavigating ? 1 : 0.5,
                  cursor: inputValue.trim() && !isNavigating ? 'pointer' : 'not-allowed',
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
    </div>
  );
}
