'use client';

import { useTheme } from '@/lib/theme-provider';
import Image from 'next/image';
import MarkdownRenderer from './MarkdownRenderer';
import { getIconPath } from '@/lib/icon-utils';
import type { ChatMessageProps } from '@/lib/types';

export default function ChatMessage({ content, isUser, onRedo }: ChatMessageProps) {
  const { resolvedTheme, mounted } = useTheme();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
      <div style={{ maxWidth: '95%', marginLeft: isUser ? 'auto' : 0, marginRight: isUser ? 0 : 'auto' }}>
        <div className="message-content">
          {isUser ? (
            content
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>
        
        {!isUser && (
          <div className="message-actions">
            <button onClick={copyToClipboard} className="action-btn">
              <Image src={getIconPath('copy', resolvedTheme, false, mounted)} alt="Copy" width={16} height={16} className="icon" />
            </button>
            {onRedo && (
              <button 
                onClick={async () => {
                  try {
                    await onRedo();
                  } catch {
                    // Silently handle error
                  }
                }} 
                className="action-btn" 
                title="Regenerate response"
              >
                <Image src={getIconPath('redo', resolvedTheme, false, mounted)} alt="Redo" width={16} height={16} className="icon" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

