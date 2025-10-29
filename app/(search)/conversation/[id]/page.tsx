'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
import type { Message } from '@/lib/types';

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
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageSentRef = useRef(false);
  const { resolvedTheme, mounted} = useTheme();
  const { user } = useAuth();

  // Use ref values instead of reactive searchParams
  const initialMessageFromRef = initialParamsRef.current.message;
  const initialModelFromRef = initialParamsRef.current.model;
  const initialModeFromRef = initialParamsRef.current.mode;

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
      setMessages(msgs.map(msg => ({
        id: msg.id || `msg-${Date.now()}`,
        content: msg.content || '',
        role: msg.role || 'user',
        text: msg.content || '',
        isUser: msg.role === 'user',
        timestamp: msg.created_at || new Date().toISOString(),
      })));
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user, conversationId]);

  // Load existing messages
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Send initial message from URL params if present (ONCE on mount)
  useEffect(() => {
    // Use ref values, not reactive searchParams
    if (!initialMessageFromRef || initialMessageSentRef.current || isLoadingMessages) return;
    
    // Mark as sent immediately to prevent duplicate sends
    initialMessageSentRef.current = true;
    
    // Send the initial message
    const messageText = decodeURIComponent(initialMessageFromRef);
    const model = initialModelFromRef || selectedModel;
    const mode = initialModeFromRef || chatMode;
    
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageText,
      role: 'user',
      text: messageText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    // Set user message FIRST (before any async operations)
    setMessages([userMessage]);
    setIsLoading(true);
    
    // Clean up URL params immediately after setting state (prevents reload issues)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.has('message')) {
          url.searchParams.delete('message');
          url.searchParams.delete('model');
          url.searchParams.delete('mode');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }, 50); // Minimal delay to let React process the state update

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: messageText }],
        conversationId,
        model,
        chatMode: mode,
      }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to get response');
        return response.body?.getReader();
      })
      .then(reader => {
        if (!reader) return;
        const decoder = new TextDecoder();
        let aiResponse = '';
        
        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            aiResponse += chunk;

            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                return [...prev.slice(0, -1), { ...lastMessage, content: aiResponse, text: aiResponse }];
              } else {
                return [...prev, {
                  id: `ai-${Date.now()}`,
                  content: aiResponse,
                  role: 'assistant' as const,
                  text: aiResponse,
                  isUser: false,
                  timestamp: new Date().toISOString(),
                }];
              }
            });
          }
          setIsLoading(false);
        };
        
        processStream().catch(err => {
          console.error('Error processing stream:', err);
          setMessages(prev => prev.slice(0, -1));
          setIsLoading(false);
        });
      })
      .catch(err => {
        console.error('Error sending message:', err);
        setMessages([]);
        setIsLoading(false);
        initialMessageSentRef.current = false; // Reset on error to allow retry
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMessages, conversationId, selectedModel, chatMode]);

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

    // Add user message immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageText,
      role: 'user',
      text: messageText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          conversationId,
          model: selectedModel,
          chatMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          aiResponse += chunk;

          // Update AI message in real-time
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [...prev.slice(0, -1), { ...lastMessage, content: aiResponse, text: aiResponse }];
            } else {
              return [...prev, {
                id: `ai-${Date.now()}`,
                content: aiResponse,
                role: 'assistant' as const,
                text: aiResponse,
                isUser: false,
                timestamp: new Date().toISOString(),
                model: selectedModel,
              }];
            }
          });
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
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
                content={message.content || ''}
                isUser={message.isUser}
                model={message.model}
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
            
            <div ref={conversationEndRef} />
          </div>
        </div>

        {/* Input Section - Same as before but with form */}
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
