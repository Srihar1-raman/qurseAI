'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath, getInvertedIconPath } from '@/lib/icon-utils';

export default function MainInput() {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, mounted } = useTheme();

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

  const handleSend = () => {
    if (inputValue.trim()) {
      console.log('Sending:', inputValue);
      // TODO: Send message logic
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-[800px] relative mx-auto mb-2">
      <style jsx>{`
        .main-input:focus {
          border: 1px solid var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 2px 8px var(--color-shadow) !important;
        }
      `}</style>
      <input
        ref={inputRef}
        type="text"
        className="w-full pr-24 pl-4 text-base main-input"
        placeholder="Message Qurse..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        style={{
          padding: '12px 96px 12px 16px',
          borderRadius: '20px',
          border: `1px solid var(--color-border-hover)`,
          fontSize: '16px',
          outline: 'none',
          background: 'var(--color-bg-input)',
          color: 'var(--color-text)',
          boxShadow: '0 2px 8px var(--color-shadow)',
          fontFamily: 'inherit',
          transition: 'border 0.2s, box-shadow 0.2s',
        }}
      />
      
      <div 
        className="absolute right-3 top-1/2 flex items-center gap-2"
        style={{ transform: 'translateY(-50%)' }}
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
    </div>
  );
}
