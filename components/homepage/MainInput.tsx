'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useConversation } from '@/lib/contexts/ConversationContext';

export default function MainInput() {
  const [inputValue, setInputValue] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { resolvedTheme, mounted } = useTheme();
  const { selectedModel, chatMode } = useConversation();

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

  const handleSend = async () => {
    const messageText = inputValue.trim();
    if (!messageText || isLoading) return;

    // Generate a temporary conversation ID for instant redirect
    const tempConversationId = `temp-${Date.now()}`;
    
    // INSTANT redirect (like Scira does)
    window.history.replaceState({}, '', `/conversation/${tempConversationId}`);
    
    setIsLoading(true);
    setInputValue('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: messageText }],
          model: selectedModel,
          chatMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Get real conversation ID from response header
      const realConversationId = response.headers.get('X-Conversation-ID');
      
      if (realConversationId && realConversationId !== tempConversationId) {
        // Update URL with real conversation ID
        window.history.replaceState({}, '', `/conversation/${realConversationId}`);
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      // Redirect back to homepage on error
      window.history.replaceState({}, '', '/');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        <textarea
          ref={inputRef}
          rows={1}
          className={`w-full text-base main-input ${(isMultiline || isMobile) ? 'multiline' : ''}`}
          placeholder="Message Qurse..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
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
            zIndex: 3, // Ensure text is above background strip and buttons
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
              disabled={!inputValue.trim() || isLoading}
              className="flex items-center justify-center transition-all"
              aria-label="Send message"
              onClick={handleSend}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: (inputValue.trim() && !isLoading) ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                border: `1px solid ${(inputValue.trim() && !isLoading) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                padding: '0',
                opacity: (inputValue.trim() && !isLoading) ? 1 : 0.5,
                cursor: (inputValue.trim() && !isLoading) ? 'pointer' : 'not-allowed',
              }}
            >
              {isLoading ? (
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid var(--color-text-secondary)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <Image
                  src={inputValue.trim() ? '/icon_light/send.svg' : getIconPath('send', resolvedTheme, false, mounted)}
                  alt="Send"
                  width={16}
                  height={16}
                />
              )}
            </button>
          </div>
        ) : (
          // Multiline mode: buttons at bottom
          <>
            <div 
              className="absolute left-3 bottom-2 flex items-center gap-2"
              style={{ zIndex: 2, transition: 'all 0.2s' }}
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
              style={{ zIndex: 2, transition: 'all 0.2s' }}
            >
              {/* Send Button */}
              <button
                type="button"
                disabled={!inputValue.trim() || isLoading}
                className="flex items-center justify-center transition-all"
                aria-label="Send message"
                onClick={handleSend}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: (inputValue.trim() && !isLoading) ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${(inputValue.trim() && !isLoading) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  padding: '0',
                  opacity: (inputValue.trim() && !isLoading) ? 1 : 0.5,
                  cursor: (inputValue.trim() && !isLoading) ? 'pointer' : 'not-allowed',
                }}
              >
                {isLoading ? (
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid var(--color-text-secondary)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                ) : (
                  <Image
                    src={inputValue.trim() ? '/icon_light/send.svg' : getIconPath('send', resolvedTheme, false, mounted)}
                    alt="Send"
                    width={16}
                    height={16}
                  />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
