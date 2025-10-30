'use client';

import { useTheme } from '@/lib/theme-provider';
import Image from 'next/image';
import MarkdownRenderer from './MarkdownRenderer';
import { getIconPath } from '@/lib/icon-utils';
import type { ChatMessageProps } from '@/lib/types';

export default function ChatMessage({ message, isUser, onRedo }: ChatMessageProps) {
  const { resolvedTheme, mounted } = useTheme();

  // Extract text content from message parts
  const content = message.parts
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map(p => p.text)
    .join('');

  // Extract reasoning from message parts
  const reasoning = message.parts
    .filter((p): p is Extract<typeof p, { type: 'reasoning' }> => p.type === 'reasoning')
    .map(p => p.text)
    .join('\n\n') || null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
      <div style={{ maxWidth: '95%', marginLeft: isUser ? 'auto' : 0, marginRight: isUser ? 0 : 'auto' }}>
        {/* Reasoning section (for assistant messages only) */}
        {!isUser && reasoning && (
          <div className="reasoning-section" style={{ 
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px'
          }}>
            <div className="reasoning-label" style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: '8px'
            }}>
              💭 Thinking...
            </div>
            <div className="reasoning-content" style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)'
            }}>
              <MarkdownRenderer content={reasoning} />
            </div>
          </div>
        )}

        {/* Main message content */}
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

