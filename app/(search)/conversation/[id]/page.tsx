'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
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
import { getMessages } from '@/lib/db/queries';
import type { QurseMessage } from '@/lib/types';

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  const { selectedModel, chatMode, setChatMode } = useConversation();
  
  // Map chatMode (lowercase IDs) to WebSearchSelector option names (display names)
  const getOptionFromChatMode = (mode: string): string => {
    const mapping: Record<string, string> = {
      'chat': 'Chat',
      'web': 'Web Search (Exa)',
      'web-search': 'Web Search (Exa)',
      'arxiv': 'arXiv',
    };
    return mapping[mode] || 'Chat';
  };
  
  // Map WebSearchSelector option names to chatMode IDs
  const getChatModeFromOption = (optionName: string): string => {
    const mapping: Record<string, string> = {
      'Chat': 'chat',
      'Web Search (Exa)': 'web',
      'arXiv': 'arxiv',
    };
    return mapping[optionName] || 'chat';
  };
  
  // Capture URL params once in refs to avoid reactive issues
  const searchParams = useSearchParams();
  const initialParamsRef = useRef({
    message: searchParams.get('message'),
    model: searchParams.get('model'),
    mode: searchParams.get('mode'),
  });
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [initialMessages, setInitialMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageSentRef = useRef(false);
  const { resolvedTheme, mounted} = useTheme();
  const { user } = useAuth();

  // Use ref values instead of reactive searchParams
  const initialMessageFromRef = initialParamsRef.current.message;

  // Load messages from database
  const loadMessages = useCallback(async () => {
    // Skip loading for temp conversation IDs (they start with 'temp-')
    if (conversationId.startsWith('temp-')) {
      setIsLoadingMessages(false);
      return;
    }

    // Skip loading if there's an initial message from URL params (new conversation)
    if (initialParamsRef.current.message) {
      setIsLoadingMessages(false);
      return;
    }

    if (!user) {
      setIsLoadingMessages(false);
      return;
    }

    try {
      const msgs = await getMessages(conversationId);
      // Convert to format compatible with useChat
      const formattedMessages = msgs.map(msg => ({
        id: msg.id || `msg-${Date.now()}`,
        role: (msg.role || 'user') as 'user' | 'assistant',
        content: msg.content || '',
      }));
      setInitialMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user, conversationId]);

  // Load existing messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // useChat hook - the core of the new implementation
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    id: conversationId,
    initialMessages: initialMessages,
    fetch: async (input: RequestInfo, init?: RequestInit) => {
      // Custom fetch to add body parameters
      const body = JSON.parse((init?.body as string) || '{}');
      return fetch(input, {
        ...init,
        body: JSON.stringify({
          ...body,
          conversationId,
          model: selectedModel,
          chatMode,
        }),
      });
    },
    api: '/api/chat',
    onFinish: ({ message }: { message: { id: string } }) => {
      console.log('✅ Message complete:', message.id);
    },
    onError: (error: Error) => {
      console.error('❌ Chat error:', error);
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const isLoading = status === 'submitted';

  // Send initial message from URL params if present (ONCE on mount)
  useEffect(() => {
    // Use ref values, not reactive searchParams
    if (!initialMessageFromRef || initialMessageSentRef.current || isLoadingMessages || messages.length > 0) return;
    
    // Mark as sent immediately to prevent duplicate sends
    initialMessageSentRef.current = true;
    
    // Send the initial message
    const messageText = decodeURIComponent(initialMessageFromRef);
    
    // Clean up URL params immediately
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('message')) {
        url.searchParams.delete('message');
        url.searchParams.delete('model');
        url.searchParams.delete('mode');
        window.history.replaceState({}, '', url.toString());
      }
    }

    // Send message via useChat with parts structure
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: messageText }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMessages, messages.length]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    if (textareaRef.current && !isLoadingMessages) {
      textareaRef.current.focus();
    }
  }, [isLoadingMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = input.trim();
    if (!messageText || isLoading) return;

    // Send message via useChat with parts structure
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: messageText }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Clear input
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
        {/* Conversation Container */}
        <div className="conversation-container">
          <div className="conversation-thread">
            {/* Display messages */}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message as QurseMessage}
                isUser={message.role === 'user'}
                model={selectedModel}
              />
            ))}
            
            {/* Loading indicator */}
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

            {/* Error display */}
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

        {/* Input Section */}
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
