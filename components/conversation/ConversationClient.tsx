'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import ChatMessage from '@/components/chat/ChatMessage';
import HistorySidebar from '@/components/layout/history/HistorySidebar';
import ModelSelector from '@/components/homepage/ModelSelector';
import WebSearchSelector from '@/components/homepage/WebSearchSelector';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useConversation } from '@/lib/contexts/ConversationContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { handleClientError } from '@/lib/utils/error-handler';
import type { QurseMessage } from '@/lib/types';

interface ConversationClientProps {
  conversationId: string;
  initialMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string; reasoning?: string }>;
  hasInitialMessageParam: boolean;
}

export function ConversationClient({
  conversationId,
  initialMessages,
  hasInitialMessageParam,
}: ConversationClientProps) {
  const router = useRouter();
  const { selectedModel, chatMode, setChatMode } = useConversation();
  const { user } = useAuth();
  const { resolvedTheme, mounted } = useTheme();
  const { error: showToastError } = useToast();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [input, setInput] = useState('');
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageSentRef = useRef(false);
  
  // Track if we've had any user interaction (useChat bug workaround)
  const [hasInteracted, setHasInteracted] = useState(false);

  // Create refs to store current values (Scira pattern - avoids closure issues)
  const conversationIdRef = useRef(conversationId);
  const selectedModelRef = useRef(selectedModel);
  const chatModeRef = useRef(chatMode);

  // Update refs whenever state changes
  useEffect(() => {
    conversationIdRef.current = conversationId;
    selectedModelRef.current = selectedModel;
    chatModeRef.current = chatMode;
  }, [conversationId, selectedModel, chatMode]);

  // Map chatMode to WebSearchSelector option names
  const getOptionFromChatMode = (mode: string): string => {
    const mapping: Record<string, string> = {
      'chat': 'Chat',
      'web': 'Web Search (Exa)',
      'web-search': 'Web Search (Exa)',
      'arxiv': 'arXiv',
    };
    return mapping[mode] || 'Chat';
  };

  const getChatModeFromOption = (optionName: string): string => {
    const mapping: Record<string, string> = {
      'Chat': 'chat',
      'Web Search (Exa)': 'web',
      'arXiv': 'arxiv',
    };
    return mapping[optionName] || 'chat';
  };

  // useChat hook with pre-loaded initialMessages (no timing issues!)
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    id: conversationId,
    initialMessages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            messages,
            conversationId: conversationIdRef.current,
            model: selectedModelRef.current,
            chatMode: chatModeRef.current,
          },
        };
      },
    }),
    onFinish: ({ message }: { message: { id: string } }) => {
      // Message completed successfully
    },
    onError: (error: Error) => {
      const userMessage = handleClientError(error, 'conversation/chat');
      showToastError(userMessage);
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // Workaround for useChat not respecting initialMessages
  // Merge initialMessages with new messages from useChat, avoiding duplicates
  const rawDisplayMessages = React.useMemo(() => {
    if (!hasInteracted && messages.length === 0) {
      // Not interacted yet, use server-loaded messages
      return initialMessages;
    }
    
    // Merge: start with initialMessages, add new useChat messages that aren't duplicates
    const messageIds = new Set(initialMessages.map(m => m.id));
    const newMessages = messages.filter(m => !messageIds.has(m.id));
    
    return [...initialMessages, ...newMessages];
  }, [initialMessages, messages, hasInteracted]);
  
  // Transform server messages to have parts structure that ChatMessage expects
  const displayMessages = React.useMemo(() => {
    return rawDisplayMessages.map((msg): QurseMessage => {
      // If message already has parts (from useChat), use as is
      if ('parts' in msg && msg.parts) {
        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          parts: msg.parts,
          metadata: ('metadata' in msg && msg.metadata) ? msg.metadata as any : undefined,
        };
      }
      
      // Transform server message format to parts structure
      const parts: Array<{ type: 'text' | 'reasoning'; text: string }> = [
        { type: 'text' as const, text: (msg as any).content }
      ];
      
      // Add reasoning as a separate part if it exists
      if ('reasoning' in msg && msg.reasoning) {
        parts.push({ type: 'reasoning' as const, text: msg.reasoning });
      }
      
      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        parts: parts as any,
        metadata: undefined,
      };
    });
  }, [rawDisplayMessages]);

  const isLoading = status === 'submitted';

  // Send initial message if we have one from URL params
  useEffect(() => {
    if (!hasInitialMessageParam || initialMessageSentRef.current || displayMessages.length > 0) return;

    initialMessageSentRef.current = true;
    setHasInteracted(true); // Mark as interacted for initial message

    // Get message from current URL params
    const params = new URLSearchParams(window.location.search);
    const messageParam = params.get('message');
    
    if (messageParam) {
      // Safely decode URL-encoded message parameter
      let messageText: string;
      try {
        messageText = decodeURIComponent(messageParam);
      } catch (error) {
        // If decoding fails, use the raw parameter as fallback
        messageText = messageParam;
      }

      // Only send if we have a valid message
      if (messageText && messageText.trim()) {
      // Clean up URL params
      params.delete('message');
      params.delete('model');
      params.delete('mode');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);

      // Send message
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: messageText }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialMessageParam, displayMessages.length]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, 200) + 'px';

      if (scrollHeight > 200) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    }
  }, [input]);

  // Auto-focus textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = input.trim();
    if (!messageText || isLoading) return;

    setHasInteracted(true); // Mark that user has interacted
    
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: messageText }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleSubmit(e as any);
    }
  };

  const handleNewChatClick = () => {
    router.push('/');
  };

  const handleHistoryClick = () => {
    setIsHistoryOpen(true);
  };

  return (
    <div className="homepage-container">
      <Header
        user={user}
        showNewChatButton={true}
        onNewChatClick={handleNewChatClick}
        showHistoryButton={true}
        onHistoryClick={handleHistoryClick}
      />

      <main className="conversation-main-content">
        <div className="conversation-container">
          <div className="conversation-thread">
            {displayMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message as QurseMessage}
                isUser={message.role === 'user'}
                model={selectedModel}
              />
            ))}

            {isLoading && (
              <div className="message bot-message">
                <div style={{ maxWidth: '95%', marginRight: 'auto' }}>
                  <div className="message-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: 'var(--color-primary)',
                        borderRadius: '50%',
                        animation: 'reasoning 2s infinite linear',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          animation: 'reasoningPulse 1s infinite ease-in-out'
                        }}></div>
                      </div>
                      <span style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: '14px',
                        fontStyle: 'italic'
                      }}>
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
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

        <div className="input-section">
          <div className="input-section-content">
            <form onSubmit={handleSubmit} className="input-container conversation-input-container">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message Qurse..."
                className="main-input conversation-input"
                rows={1}
                disabled={isLoading}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                }}
              />

              <div className="input-buttons-background"></div>

              <div className="input-actions-left">
                <div className="input-model-selector">
                  <ModelSelector />
                </div>

                <div className="input-model-selector">
                  <WebSearchSelector
                    selectedOption={getOptionFromChatMode(chatMode)}
                    onSelectOption={(optionName) => {
                      setChatMode(getChatModeFromOption(optionName));
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {/* Attach file functionality */}}
                  className="attach-btn"
                  title="Attach file"
                >
                  <Image src={getIconPath("attach", resolvedTheme, false, mounted)} alt="Attach" width={16} height={16} />
                </button>
              </div>

              <div className="input-actions-right">
                <button
                  type="submit"
                  className={`send-btn ${input.trim() ? 'active' : ''}`}
                  title="Send message"
                  disabled={!input.trim() || isLoading}
                >
                  <Image
                    src={input.trim() ? '/icon_light/send.svg' : getIconPath('send', resolvedTheme, false, mounted)}
                    alt="Send"
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

