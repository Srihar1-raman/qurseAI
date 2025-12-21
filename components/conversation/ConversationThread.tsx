/**
 * Conversation thread component
 * Renders message list, loading indicators, and error messages
 */

import React from 'react';
import ChatMessage from '@/components/chat/ChatMessage';
import type { QurseMessage } from '@/lib/types';
import type { ConversationThreadProps } from './types';

/**
 * Layer 3: Deduplicate messages before display
 * Removes duplicate assistant messages where one has stop text and one doesn't
 * Keeps the message with stop text, removes the full duplicate
 * 
 * Algorithm: For each assistant message, check if there's a duplicate later in the array.
 * If one has stop text and one doesn't, keep the one with stop text.
 */
function deduplicateMessages(messages: QurseMessage[]): QurseMessage[] {
  if (messages.length === 0) return messages;
  
  const deduplicated: QurseMessage[] = [];
  const skipIndices = new Set<number>();
  
  for (let i = 0; i < messages.length; i++) {
    // Skip if already marked for removal
    if (skipIndices.has(i)) continue;
    
    const message = messages[i];
    
    // Always include user messages
    if (message.role !== 'assistant') {
      deduplicated.push(message);
      continue;
    }
    
    // Extract text content from parts
    const messageText = message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('') || '';
    
    const hasStopText = messageText.includes('*User stopped this message here*');
    
    // Check if this message has a duplicate later in the array
    // We only deduplicate pairs where one has stop text and one doesn't
    for (let j = i + 1; j < messages.length; j++) {
      if (skipIndices.has(j)) continue;
      
      const otherMessage = messages[j];
      
      // Only check assistant messages
      if (otherMessage.role !== 'assistant') continue;
      
      const otherText = otherMessage.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text)
        .join('') || '';
      
      const otherHasStopText = otherText.includes('*User stopped this message here*');
      
      // Check if they're duplicates (one has stop text, one doesn't)
      if (hasStopText !== otherHasStopText) {
        // They're duplicates - keep the one with stop text, skip the one without
        if (hasStopText) {
          // This one has stop text, skip the other one (full message)
          skipIndices.add(j);
        } else {
          // Other has stop text, skip this one (full message)
          skipIndices.add(i);
          break; // Don't add this message, move to next
        }
      }
    }
    
    // Add message if not skipped
    if (!skipIndices.has(i)) {
      deduplicated.push(message);
    }
  }
  
  return deduplicated;
}

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
  // Layer 3: Deduplicate messages before rendering
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
