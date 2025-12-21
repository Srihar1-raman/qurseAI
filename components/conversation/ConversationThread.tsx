/**
 * Conversation thread component
 * Renders message list, loading indicators, and error messages
 */

import React from 'react';
import ChatMessage from '@/components/chat/ChatMessage';
import { deduplicateMessages } from '@/lib/utils/message-deduplication';
import type { QurseMessage } from '@/lib/types';
import type { ConversationThreadProps } from './types';

function ConversationThreadComponent({
  messages,
  isLoading,
  isLoadingOlderMessages,
  hasMoreMessages,
  error,
  isRateLimited,
  selectedModel,
  conversationEndRef,
  conversationContainerRef,
  conversationThreadRef,
  onShare,
  user,
  isStreaming = false,
}: ConversationThreadProps) {
  // Deduplicate messages before rendering (safety net for Vercel serverless abort signal limitations)
  const deduplicatedMessages = React.useMemo(
    () => deduplicateMessages(messages),
    [messages]
  );
  
  return (
    <div ref={conversationContainerRef} className="conversation-container">
      <div ref={conversationThreadRef} className="conversation-thread">
        {isLoadingOlderMessages && hasMoreMessages && (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
            }}
          >
            Loading older messages...
          </div>
        )}

        {deduplicatedMessages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isUser={message.role === 'user'}
            model={selectedModel}
            onShare={onShare}
            user={user}
            isStreaming={isStreaming && index === deduplicatedMessages.length - 1} // Only last message streams
          />
        ))}

        {isLoading && (
          <div className="message bot-message">
            <div style={{ maxWidth: '95%', marginRight: 'auto' }}>
              <div className="message-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: '50%',
                      animation: 'reasoning 2s infinite linear',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        animation: 'reasoningPulse 1s infinite ease-in-out',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '14px',
                      fontStyle: 'italic',
                    }}
                  >
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && !isRateLimited && (
          <div className="message bot-message">
            <div style={{ maxWidth: '95%', marginRight: 'auto' }}>
              <div className="message-content" style={{ color: 'var(--color-error)' }}>
                ❌ Error: {error.message}
              </div>
            </div>
          </div>
        )}

        <div ref={conversationEndRef} style={{ height: '1px', minHeight: '1px' }} />
      </div>
    </div>
  );
}

// Memoize to prevent Safari re-render flash - only re-render when content actually changes
export const ConversationThread = React.memo(ConversationThreadComponent, (prevProps, nextProps) => {
  // Only re-render if messages actually changed (by content, not reference)
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false; // Re-render
  }
  
  // Check if any message content changed
  for (let i = 0; i < prevProps.messages.length; i++) {
    const prevMsg = prevProps.messages[i];
    const nextMsg = nextProps.messages[i];
    
    if (prevMsg.id !== nextMsg.id) {
      return false; // Re-render
    }
    
    // Check if parts content changed
    const prevContent = prevMsg.parts?.map(p => ('text' in p ? p.text : '')).join('') || '';
    const nextContent = nextMsg.parts?.map(p => ('text' in p ? p.text : '')).join('') || '';
    
    if (prevContent !== nextContent) {
      return false; // Re-render
    }
  }
  
  // Check other props
  if (
    prevProps.isLoading !== nextProps.isLoading ||
    prevProps.isLoadingOlderMessages !== nextProps.isLoadingOlderMessages ||
    prevProps.hasMoreMessages !== nextProps.hasMoreMessages ||
    prevProps.isRateLimited !== nextProps.isRateLimited ||
    prevProps.selectedModel !== nextProps.selectedModel ||
    prevProps.error?.message !== nextProps.error?.message ||
    prevProps.user?.id !== nextProps.user?.id ||
    prevProps.isStreaming !== nextProps.isStreaming
  ) {
    return false; // Re-render
  }
  
  // Note: onShare is a function, so we don't compare it (functions are always different references)
  // This is fine - the share button will only show for authenticated users anyway
  
  // Props are equal - skip re-render
  return true;
});
