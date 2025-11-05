'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
import { getOlderMessages } from '@/lib/db/queries';
import type { QurseMessage, StreamMetadata } from '@/lib/types';

interface ConversationClientProps {
  conversationId: string;
  initialMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string; reasoning?: string }>;
  initialHasMore?: boolean;
  initialDbRowCount?: number;
  hasInitialMessageParam: boolean;
}

export function ConversationClient({
  conversationId,
  initialMessages,
  initialHasMore = false,
  initialDbRowCount = 0,
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
  const conversationThreadRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);
  const scrollPositionRef = useRef<{ height: number; top: number } | null>(null);
  
  // Track if we've had any user interaction (useChat bug workaround)
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Scroll-up pagination state
  const [loadedMessages, setLoadedMessages] = useState(initialMessages);
  // Track database offset (rows queried, not visible messages after filtering)
  // Each page loads 50 rows from database, so offset increases by 50 each time
  const [messagesOffset, setMessagesOffset] = useState(initialDbRowCount || initialMessages.length); // Use dbRowCount if available, fallback to filtered count
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  // Only assume there are more if we loaded a full page initially (50 messages from DB)
  const [hasMoreMessages, setHasMoreMessages] = useState(initialMessages.length > 0);
  const [isScrollTopDetected, setIsScrollTopDetected] = useState(false);

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

  // Update loadedMessages when initialMessages change (e.g., on conversation change)
  useEffect(() => {
    setLoadedMessages(initialMessages);
    // Set offset to actual DB rows queried (not filtered count) for accurate pagination
    setMessagesOffset(initialDbRowCount || initialMessages.length);
    // Use hasMore flag from server if available, otherwise fall back to heuristic
    setHasMoreMessages(initialHasMore ?? initialMessages.length >= 50);
    setIsScrollTopDetected(false);
  }, [conversationId, initialMessages, initialHasMore, initialDbRowCount]);

  // Memoize transport to prevent useChat reset on re-render
  // CRITICAL: Transport recreation causes useChat to reset, breaking streaming
  const transport = React.useMemo(() => {
    return new DefaultChatTransport({
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
    });
  }, []); // Empty deps - refs are stable, don't recreate transport

  // Memoize callbacks to prevent useChat reset
  const handleFinish = React.useCallback(({ message }: { message: { id: string } }) => {
    // Message completed successfully
  }, []);

  const handleError = React.useCallback((error: Error) => {
    const userMessage = handleClientError(error, 'conversation/chat');
    showToastError(userMessage);
  }, [showToastError]);

  // useChat hook (initialMessages prop removed - useChat doesn't respect it)
  // Workaround: Use rawDisplayMessages to merge loadedMessages with useChat messages
  // CRITICAL: conversationId must be stable - if it changes, useChat resets mid-stream
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    id: conversationId,
    transport,
    onFinish: handleFinish,
    onError: handleError,
  });

  // Workaround for useChat not respecting initialMessages
  // Merge loadedMessages with new messages from useChat, avoiding duplicates
  // Note: useChat handles optimistic updates natively - user message appears immediately
  const rawDisplayMessages = React.useMemo(() => {
    if (!hasInteracted && messages.length === 0) {
      // Not interacted yet, use server-loaded messages
      return loadedMessages;
    }
    
    // Merge: start with loadedMessages, add new useChat messages that aren't duplicates
    // This includes optimistic updates (user messages appear immediately via useChat)
    const messageIds = new Set(loadedMessages.map(m => m.id));
    const newMessages = messages.filter(m => !messageIds.has(m.id));
    
    // Combine in chronological order (loadedMessages first, then new messages from useChat)
    // useChat's optimistic updates are included in messages array immediately
    return [...loadedMessages, ...newMessages];
  }, [loadedMessages, messages, hasInteracted]);
  
  // Transform server messages to have parts structure that ChatMessage expects
  const displayMessages = React.useMemo(() => {
    return rawDisplayMessages.map((msg): QurseMessage => {
      // If message already has parts (from useChat), filter to only text/reasoning parts
      if ('parts' in msg && msg.parts && Array.isArray(msg.parts)) {
        const validParts = msg.parts
          .filter((part): part is { type: 'text' | 'reasoning'; text: string } => 
            (part.type === 'text' || part.type === 'reasoning') && 
            'text' in part && 
            typeof part.text === 'string'
          )
          .map(part => ({
            type: part.type as 'text' | 'reasoning',
            text: part.text,
          }));
        
        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          parts: validParts.length > 0 ? validParts : [{ type: 'text', text: '' }],
          metadata: ('metadata' in msg && msg.metadata) ? (msg.metadata as StreamMetadata) : undefined,
        };
      }
      
      // Transform server message format to parts structure
      const parts: Array<{ type: 'text' | 'reasoning'; text: string }> = [];
      
      // Extract content if it exists
      if ('content' in msg && typeof msg.content === 'string') {
        parts.push({ type: 'text', text: msg.content });
      }
      
      // Add reasoning as a separate part if it exists
      if ('reasoning' in msg && msg.reasoning && typeof msg.reasoning === 'string') {
        parts.push({ type: 'reasoning', text: msg.reasoning });
      }
      
      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        parts: parts.length > 0 ? parts : [{ type: 'text', text: '' }],
        metadata: undefined,
      };
    });
  }, [rawDisplayMessages]);

  const isLoading = status === 'submitted';

  // Load older messages when user scrolls to top
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlderMessages || !hasMoreMessages || conversationId.startsWith('temp-')) {
      return;
    }

    const threadElement = conversationThreadRef.current;
    if (!threadElement) return;

    // Save current scroll position and height before loading
    scrollPositionRef.current = {
      height: threadElement.scrollHeight,
      top: threadElement.scrollTop,
    };

    setIsLoadingOlderMessages(true);
    
    try {
      const { messages: olderMessages, hasMore, dbRowCount } = await getOlderMessages(conversationId, 50, messagesOffset);
      
      // Update hasMoreMessages based on database result
      setHasMoreMessages(hasMore);
      
      // If no more messages in DB, we're done
      if (!hasMore && olderMessages.length === 0) {
        scrollPositionRef.current = null;
        return;
      }
      
      // Only prepend if we got messages
      if (olderMessages.length > 0) {
        setLoadedMessages((prev) => [...olderMessages, ...prev]);
      }
      
      // Increase offset by actual DB rows queried (not filtered count)
      // This ensures accurate pagination even if some rows are filtered out
      setMessagesOffset((prev) => prev + dbRowCount);
      
      // If we got no messages but there are more in DB, clear scroll position
      // (likely filtered out, will try again on next scroll)
      if (olderMessages.length === 0 && hasMore) {
        scrollPositionRef.current = null;
      }
    } catch (error) {
      const userMessage = handleClientError(error as Error, 'conversation/loadOlderMessages');
      showToastError(userMessage);
      setHasMoreMessages(false); // Stop trying if there's an error
      scrollPositionRef.current = null;
    } finally {
      setIsLoadingOlderMessages(false);
      setIsScrollTopDetected(false);
    }
  }, [conversationId, messagesOffset, isLoadingOlderMessages, hasMoreMessages, showToastError]);

  // Restore scroll position after older messages are loaded and DOM is updated
  useEffect(() => {
    if (!isLoadingOlderMessages && scrollPositionRef.current) {
      const threadElement = conversationThreadRef.current;
      if (!threadElement) {
        scrollPositionRef.current = null;
        return;
      }

      const saved = scrollPositionRef.current;
      
      // Use requestAnimationFrame to wait for DOM to update
      requestAnimationFrame(() => {
        if (threadElement && saved) {
          const scrollHeightAfter = threadElement.scrollHeight;
          const heightDifference = scrollHeightAfter - saved.height;
          // Adjust scroll position to maintain visual position
          threadElement.scrollTop = saved.top + heightDifference;
          scrollPositionRef.current = null;
        }
      });
    }
  }, [loadedMessages.length, isLoadingOlderMessages]);

  // Scroll detection for loading older messages
  useEffect(() => {
    const threadElement = conversationThreadRef.current;
    if (!threadElement) return;

    const handleScroll = () => {
      // Reset detection flag if user scrolled away from top
      if (threadElement.scrollTop > 200) {
        setIsScrollTopDetected(false);
      }
      
      // Check if user scrolled to top (within 100px threshold)
      if (threadElement.scrollTop < 100 && !isScrollTopDetected && hasMoreMessages && !isLoadingOlderMessages) {
        setIsScrollTopDetected(true);
        loadOlderMessages();
      }
    };

    threadElement.addEventListener('scroll', handleScroll);
    return () => threadElement.removeEventListener('scroll', handleScroll);
  }, [loadOlderMessages, isScrollTopDetected, hasMoreMessages, isLoadingOlderMessages]);


  // Send initial message if we have one from URL params
  // CRITICAL: Guard against useChat resets causing duplicate sends
  useEffect(() => {
    // Guard: Don't send if already sent or no message param
    if (!hasInitialMessageParam || initialMessageSentRef.current) return;

    // Mark as sent immediately to prevent duplicate sends (even if useChat resets)
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
        // Clean up URL params immediately (better UX)
        params.delete('message');
        params.delete('model');
        params.delete('mode');
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);

        // Send message immediately (don't wait for displayMessages)
        // Note: sendMessage is stable now (memoized transport prevents useChat reset)
        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: messageText }],
        });
      }
    }
  }, [hasInitialMessageParam, sendMessage]); // sendMessage is now stable due to memoized transport

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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = input.trim();
    
    // Prevent duplicate sends (debouncing via isLoading check)
    if (!messageText || isLoading) return;

    // Clear input immediately for better UX (before API call)
    setInput('');
    setHasInteracted(true); // Mark that user has interacted
    
    // Send message (useChat handles optimistic updates natively)
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: messageText }],
    });
  }, [input, isLoading, sendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Directly call handleSubmit logic instead of creating synthetic event
      const messageText = input.trim();
      if (!messageText || isLoading) return;
      setInput('');
      setHasInteracted(true);
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: messageText }],
      });
    }
  }, [input, isLoading, sendMessage]);

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
          <div 
            ref={conversationThreadRef}
            className="conversation-thread"
            style={{ overflowY: 'auto', height: '100%' }}
          >
            {/* Loading indicator for older messages */}
            {isLoadingOlderMessages && (
              <div style={{ 
                padding: '16px', 
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '14px'
              }}>
                Loading older messages...
              </div>
            )}
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

