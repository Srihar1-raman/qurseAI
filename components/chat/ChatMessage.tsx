'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-provider';
import Image from 'next/image';
// import MarkdownRenderer from './MarkdownRenderer'; // Temporarily disabled for faster streaming
import { getIconPath } from '@/lib/icon-utils';
import type { ChatMessageProps } from '@/lib/types';

function ChatMessageComponent({ message, isUser, onRedo, onShare, user }: ChatMessageProps) {
  const { resolvedTheme, mounted } = useTheme();

  // Extract text content from message parts
  const content = message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');

  // Extract reasoning from message parts
  const reasoning = message.parts
    .filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning')
    .map(p => p.text)
    .join('\n\n') || null;

  // Check if message contains stop text and split it
  const stopTextPattern = '*User stopped this message here*';
  const hasStopText = content.includes(stopTextPattern);
  let mainContent = content;
  if (hasStopText) {
    // Split on the pattern and take everything before it as main content
    const parts = content.split(stopTextPattern);
    mainContent = parts[0].trimEnd(); // Remove trailing whitespace/newlines
  }

  const copyToClipboard = React.useCallback(() => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  }, [content]);

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
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {reasoning}
            </div>
          </div>
        )}

        {/* Main message content */}
        <div className="message-content">
          {isUser ? (
            content
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {mainContent}
              {hasStopText && (
                <>
                  {'\n\n'}
                  <span className="stop-message-indicator">
                    User stopped this message here
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        
        {!isUser && (
          <div className="message-actions">
            <button onClick={copyToClipboard} className="action-btn" title="Copy message">
              <Image src={getIconPath('copy', resolvedTheme, false, mounted)} alt="Copy" width={16} height={16} className="icon" />
            </button>
            {onShare && (
              <button 
                onClick={async () => {
                  try {
                    await onShare();
                  } catch {
                    // Silently handle error
                  }
                }} 
                className="action-btn" 
                title="Share conversation"
              >
                <Image src={getIconPath('share', resolvedTheme, false, mounted)} alt="Share" width={16} height={16} className="icon" />
              </button>
            )}
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

// Memoize component to prevent re-renders of unchanged messages during streaming
// CRITICAL: When streaming updates last message, other messages shouldn't re-render
export default React.memo(ChatMessageComponent, (prevProps, nextProps) => {
  // Quick check: if IDs don't match, definitely re-render
  if (prevProps.message.id !== nextProps.message.id) {
    return false;
  }
  
  // Quick check: if isUser changed, re-render
  if (prevProps.isUser !== nextProps.isUser) {
    return false;
  }
  
  // Quick check: if parts array length changed, content definitely changed
  if (prevProps.message.parts.length !== nextProps.message.parts.length) {
    return false;
  }
  
  // Only re-render if message content actually changed
  const prevContent = prevProps.message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');
  const nextContent = nextProps.message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');
  
  const prevReasoning = prevProps.message.parts
    .filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning')
    .map(p => p.text)
    .join('');
  const nextReasoning = nextProps.message.parts
    .filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning')
    .map(p => p.text)
    .join('');
  
  // Return true if props are EQUAL (skip re-render), false if different (re-render)
  return prevContent === nextContent && prevReasoning === nextReasoning;
});

