/**
 * Conversation thread component
 * Renders message list, loading indicators, and error messages
 */

import React from 'react';
import ChatMessage from '@/components/chat/ChatMessage';
import type { QurseMessage } from '@/lib/types';

interface ConversationThreadProps {
  messages: QurseMessage[];
  isLoading: boolean;
  isLoadingOlderMessages: boolean;
  hasMoreMessages: boolean;
  error: Error | undefined;
  isRateLimited: boolean;
  selectedModel: string;
  conversationEndRef: React.RefObject<HTMLDivElement | null>;
  conversationContainerRef: React.RefObject<HTMLDivElement | null>;
  conversationThreadRef: React.RefObject<HTMLDivElement | null>;
}

export function ConversationThread({
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
}: ConversationThreadProps) {
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

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isUser={message.role === 'user'}
            model={selectedModel}
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

        <div ref={conversationEndRef} />
      </div>
    </div>
  );
}

