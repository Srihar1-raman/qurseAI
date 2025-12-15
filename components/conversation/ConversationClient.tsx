'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessagePart } from 'ai';
import Image from 'next/image';
import ChatMessage from '@/components/chat/ChatMessage';
import ModelSelector from '@/components/homepage/ModelSelector';
import WebSearchSelector from '@/components/homepage/WebSearchSelector';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useConversation } from '@/lib/contexts/ConversationContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { handleClientError } from '@/lib/utils/error-handler';
import { getOlderMessages } from '@/lib/db/queries';
import { useOptimizedScroll } from '@/hooks/use-optimized-scroll';
import { useTextareaAutoResize } from '@/hooks/use-textarea-auto-resize';
import { createScopedLogger } from '@/lib/utils/logger';
import type { QurseMessage, StreamMetadata } from '@/lib/types';

const logger = createScopedLogger('conversation/ConversationClient');

interface ConversationClientProps {
  conversationId: string;
  initialMessages: Array<{ id: string; role: 'user' | 'assistant'; parts: Array<{ type: string; text?: string; [key: string]: any }> }>;
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
  const { selectedModel, chatMode, setChatMode } = useConversation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { resolvedTheme, mounted } = useTheme();
  const { error: showToastError } = useToast();

  const [input, setInput] = useState('');
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationThreadRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);
  const scrollPositionRef = useRef<{ height: number; top: number } | null>(null);
  const hasInitiallyScrolledRef = useRef(false);
  const lastUserMessageIdRef = useRef<string | null>(null); // Track last user message ID to detect new messages
  
  // Use optimized scroll hook (Scira pattern)
  const { scrollToBottom, markManualScroll, resetManualScroll } = useOptimizedScroll(conversationEndRef);
  
  // Track if we've had any user interaction (useChat bug workaround)
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Scroll-up pagination state
  const [loadedMessages, setLoadedMessages] = useState(initialMessages);
  // Track database offset (rows queried, not visible messages after filtering)
  // Each page loads 50 rows from database, so offset increases by 50 each time
  const [messagesOffset, setMessagesOffset] = useState(initialDbRowCount || initialMessages.length); // Use dbRowCount if available, fallback to filtered count
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState(false); // Separate state for initial message loading
  // Only assume there are more if we loaded a full page initially (50 messages from DB)
  const [hasMoreMessages, setHasMoreMessages] = useState(initialMessages.length > 0);
  const [isScrollTopDetected, setIsScrollTopDetected] = useState(false);

  // Create refs to store current values (Scira pattern - avoids closure issues)
  const conversationIdRef = useRef(conversationId);
  const selectedModelRef = useRef(selectedModel);
  const chatModeRef = useRef(chatMode);

  // Track previous conversationId to detect actual switches
  const previousConversationIdRef = useRef<string | null>(null);
  // Track previous conversationId for browser back navigation detection (separate from main useEffect)
  const browserBackConversationIdRef = useRef<string | null>(null);
  
  // Track previous user to detect logout
  const previousUserRef = useRef<typeof user>(null);
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  // Update refs whenever state changes
  useEffect(() => {
    conversationIdRef.current = conversationId;
    selectedModelRef.current = selectedModel;
    chatModeRef.current = chatMode;
  }, [conversationId, selectedModel, chatMode]);

  // Handle logout: Redirect to homepage when user becomes null
  // This ensures conversation view is cleared when user logs out in another tab
  useEffect(() => {
    // Don't redirect while auth is still loading (prevents race condition)
    // Also skip if we've already redirected (prevents multiple redirects)
    if (isAuthLoading || hasRedirectedRef.current) {
      // Still update the ref even if we skip the check
      previousUserRef.current = user;
      return;
    }
    
    const previousUser = previousUserRef.current;
    previousUserRef.current = user;
    
    // If user was authenticated but now logged out, redirect to homepage
    // Only trigger if we had a user before (prevents false positives on initial load)
    if (previousUser && !user) {
      hasRedirectedRef.current = true;
      logger.debug('User logged out, redirecting to homepage', { conversationId });
      router.replace('/');
    }
  }, [isAuthLoading, user, router, conversationId]);

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

  // Client-side message loading function (for direct URL access and conversation switching)
  // Handles both auth and guest users
  const loadInitialMessages = useCallback(async (id: string) => {
    // Guard: Only load if conversationId still matches (prevent race conditions)
    if (conversationIdRef.current !== id) {
      return;
    }
    
    try {
      setIsLoadingInitialMessages(true); // Use separate state for initial loading
      
      // Determine API route based on user authentication status
      // Auth users: /api/conversation/[id]/messages
      // Guest users: /api/guest/conversation/[id]/messages
      const apiRoute = user 
        ? `/api/conversation/${id}/messages?limit=50&offset=0`
        : `/api/guest/conversation/${id}/messages?limit=50&offset=0`;
      
      const response = await fetch(apiRoute);
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const { messages, hasMore, dbRowCount } = await response.json();
      
      // Double-check conversationId hasn't changed during fetch (race condition guard)
      if (conversationIdRef.current !== id) {
        return;
      }
      
      setLoadedMessages(messages);
      setMessagesOffset(dbRowCount);
      setHasMoreMessages(hasMore);
    } catch (error) {
      // Only show error if conversationId still matches (don't show error for stale requests)
      if (conversationIdRef.current === id) {
        const userMessage = handleClientError(error as Error, 'conversation/loadInitialMessages');
        showToastError(userMessage);
      }
    } finally {
      // Only update loading state if conversationId still matches
      if (conversationIdRef.current === id) {
        setIsLoadingInitialMessages(false);
      }
    }
  }, [showToastError, user]);

  // Handle conversationId prop changes (for conversation switching and direct URL access)
  useEffect(() => {
    const previousId = previousConversationIdRef.current;
    const hasConversationChanged = previousId !== conversationId;
    
    // Update refs immediately
    conversationIdRef.current = conversationId;
    previousConversationIdRef.current = conversationId;
    
    // Only reset state when actually switching conversations
    if (hasConversationChanged) {
      // Reset interaction state
      setHasInteracted(false);
      setIsScrollTopDetected(false);
      setIsLoadingOlderMessages(false);
      initialMessageSentRef.current = false;
      
      // If we have initialMessages from server, use them immediately
      // This happens when navigating to conversation route (server-side loaded)
      if (initialMessages.length > 0) {
        setLoadedMessages(initialMessages);
        setMessagesOffset(initialDbRowCount || initialMessages.length);
        setHasMoreMessages(initialHasMore ?? initialMessages.length >= 50);
        setIsLoadingInitialMessages(false);
        return; // Don't load client-side if we have server-side messages
      }
      
      // Only clear loadedMessages if we're actually switching conversations
      // AND we don't have initialMessages from server
      // This prevents clearing messages before new ones are loaded
      setLoadedMessages([]);
      setMessagesOffset(0);
      setHasMoreMessages(false);
      
      // Load messages client-side if needed (for both auth and guest users)
      // Remove user check - loadInitialMessages handles auth vs guest routing
      if (
        conversationId && 
        !conversationId.startsWith('temp-') && 
        !hasInitialMessageParam  // Don't load for new conversations - messages are being streamed
      ) {
        // Only set loading state if we're actually loading messages
        setIsLoadingInitialMessages(true);
        loadInitialMessages(conversationId);
      } else {
        // For new conversations (hasInitialMessageParam) or temp conversations,
        // messages come from useChat, so don't set loading state
        setIsLoadingInitialMessages(false);
      }
    } else {
      // ConversationId hasn't changed - don't reset anything
      // This handles cases where other dependencies changed but conversationId is same
      // (e.g., user object changed, but same conversation)
    }
  }, [conversationId, user, loadInitialMessages, initialMessages, initialHasMore, initialDbRowCount, hasInitialMessageParam]);

  // Update loadedMessages when initialMessages change (e.g., from server-side loading)
  // CRITICAL FIX: This handles server-side loaded messages from conversation route
  // Only update if conversationId matches (prevents stale updates from previous conversations)
  useEffect(() => {
    // Only update if conversationId matches (prevents stale updates)
    if (conversationIdRef.current !== conversationId) {
      return;
    }
    
    // Only update if we have initial messages (from server-side loading)
    // Don't overwrite client-loaded messages with empty array
    if (initialMessages.length > 0) {
    setLoadedMessages(initialMessages);
    // Set offset to actual DB rows queried (not filtered count) for accurate pagination
    setMessagesOffset(initialDbRowCount || initialMessages.length);
    // Use hasMore flag from server if available, otherwise fall back to heuristic
    setHasMoreMessages(initialHasMore ?? initialMessages.length >= 50);
    setIsScrollTopDetected(false);
      // CRITICAL FIX: Reset loading state when server-side messages are loaded
      // This ensures rawDisplayMessages logic works correctly
      setIsLoadingInitialMessages(false);
    }
  }, [conversationId, initialMessages, initialHasMore, initialDbRowCount]);

  // Handle browser back navigation edge case:
  // Same conversationId + empty initialMessages + not loading = server cache issue
  // Load messages client-side as fallback (for both auth and guest users)
  // Only triggers when conversationId hasn't changed (browser back scenario)
  useEffect(() => {
    // Update ref to track previous conversationId for browser back detection
    const previousId = browserBackConversationIdRef.current;
    const hasConversationChanged = previousId !== conversationId;
    browserBackConversationIdRef.current = conversationId;
    
    // Only trigger if:
    // 1. ConversationId exists and is valid
    // 2. ConversationId hasn't changed (browser back scenario - main useEffect won't handle this)
    // 3. InitialMessages is empty (server cache returned empty)
    // 4. Not a new conversation (no message param)
    // 5. Not currently loading messages
    // 6. ConversationId matches current ref (prevents stale loads)
    // 7. No messages already loaded (prevents duplicate loads)
    // 8. Not on initial mount (previousId is null on first render)
    if (
      conversationId &&
      !conversationId.startsWith('temp-') &&
      !hasConversationChanged && // Only handle browser back (conversationId hasn't changed)
      previousId !== null && // Not initial mount
      initialMessages.length === 0 &&
      !hasInitialMessageParam &&
      !isLoadingInitialMessages &&
      conversationIdRef.current === conversationId &&
      loadedMessages.length === 0 // Only load if we don't have any messages
    ) {
      logger.debug('Browser back navigation detected - loading messages client-side', { conversationId });
      setIsLoadingInitialMessages(true);
      loadInitialMessages(conversationId);
    }
  }, [conversationId, initialMessages.length, hasInitialMessageParam, isLoadingInitialMessages, loadedMessages.length, loadInitialMessages]);

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
  const handleFinish = React.useCallback(() => {
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
    // CRITICAL: loadedMessages (database) are the source of truth
    // They should NEVER disappear, even if useChat resets
    
    // Base messages from database (source of truth)
    const baseMessages = loadedMessages.length > 0 ? loadedMessages : [];
    
    // If loading initial messages, return what we have
    if (isLoadingInitialMessages) {
      return baseMessages;
    }
    
    // CRITICAL FIX: Always prioritize loadedMessages
    // If we have database messages, always show them first
    // This handles:
    // - Page reload (useChat resets, but loadedMessages has data)
    // - Sending message in old chat (useChat might reset, but loadedMessages has old messages)
    // - Tab switch (useChat might reset, but loadedMessages has data)
    if (messages.length === 0) {
      // No useChat messages - return loadedMessages (database messages)
      // This ensures messages never disappear, even if useChat resets
      return baseMessages;
    }
    
    // Merge: start with loadedMessages (database), add new useChat messages that aren't duplicates
    // This preserves all messages: old (from DB) + new (from useChat)
    const messageIds = new Set(baseMessages.map(m => m.id));
    const newMessages = messages.filter(m => !messageIds.has(m.id));
    
    // Always include loadedMessages first, then new messages
    // This ensures database messages never disappear
    return [...baseMessages, ...newMessages];
  }, [loadedMessages, messages, isLoadingInitialMessages]);
  
  // Transform messages to have parts structure that ChatMessage expects
  // Messages from DB already have parts array, messages from useChat also have parts
  const displayMessages = React.useMemo(() => {
    return rawDisplayMessages.map((msg): QurseMessage => {
      // If message already has parts (from useChat or DB), use them directly
      if ('parts' in msg && msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          parts: msg.parts as UIMessagePart<any, any>[],
          metadata: ('metadata' in msg && msg.metadata) ? (msg.metadata as StreamMetadata) : undefined,
        };
      }
      
      // Fallback: If no parts, create empty text part (shouldn't happen with new format)
      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        parts: [{ type: 'text', text: '' }],
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
      // Filter out 'tool' messages to match loadedMessages type (only 'user' | 'assistant')
      if (olderMessages.length > 0) {
        const filteredMessages = olderMessages.filter(
          (msg): msg is typeof msg & { role: 'user' | 'assistant' } => 
            msg.role === 'user' || msg.role === 'assistant'
        );
        if (filteredMessages.length > 0) {
          setLoadedMessages((prev) => [...filteredMessages, ...prev]);
        }
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
  // CRITICAL: Also guard against duplicate sends when ConversationClient is mounted twice
  // (e.g., homepage ConversationClient hidden + conversation route ConversationClient visible)
  useEffect(() => {
    // Guard: Don't send if already sent
    if (initialMessageSentRef.current) return;

    // CRITICAL FIX: Check if this ConversationClient instance is actually visible
    // If we're on the conversation route, the homepage ConversationClient (hidden) should not send
    // Only the visible ConversationClient should send the message
    // We check visibility by verifying the conversationId matches the current URL pathname
    const currentPathname = window.location.pathname;
    const pathnameMatch = currentPathname.match(/\/conversation\/([^/]+)/);
    const urlConversationId = pathnameMatch ? pathnameMatch[1] : null;
    
    // Only send if this ConversationClient's conversationId matches the URL conversationId
    // This ensures only the visible ConversationClient sends (not the hidden homepage one)
    if (conversationId !== urlConversationId) {
      return; // This instance is not the active one, don't send
    }

    // Get message from current URL params (read directly from window.location for reliability)
    // This ensures we detect the message param even if useSearchParams() hasn't updated yet
    const params = new URLSearchParams(window.location.search);
    const messageParam = params.get('message');
    
    // Guard: Don't send if no message param (check window.location directly, not just prop)
    if (!messageParam) return;

    // Mark as sent immediately to prevent duplicate sends (even if useChat resets)
    initialMessageSentRef.current = true;
    setHasInteracted(true); // Mark as interacted for initial message

      // Safely decode URL-encoded message parameter
      let messageText: string;
      try {
        messageText = decodeURIComponent(messageParam);
      } catch {
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
  }, [hasInitialMessageParam, sendMessage, conversationId]); // Added conversationId to deps for visibility check

  // Listen for manual scroll (wheel and touch) - Scira pattern
  useEffect(() => {
    const handleManualScroll = () => markManualScroll();
    window.addEventListener('wheel', handleManualScroll);
    window.addEventListener('touchmove', handleManualScroll);
    return () => {
      window.removeEventListener('wheel', handleManualScroll);
      window.removeEventListener('touchmove', handleManualScroll);
    };
  }, [markManualScroll]);

  // Reset manual scroll when streaming starts - Scira pattern
  useEffect(() => {
    if (status === 'streaming') {
      resetManualScroll();
      scrollToBottom();
    }
  }, [status, resetManualScroll, scrollToBottom]);

  // Auto-scroll during streaming when messages change - Scira pattern
  useEffect(() => {
    if (status === 'streaming') {
    scrollToBottom();
    }
  }, [messages, status, scrollToBottom]);

  // Scroll to show user message immediately after sending (before streaming starts)
  // This ensures user sees their message above the input area, following standard chat UX
  useEffect(() => {
    // Only scroll if:
    // 1. We have messages
    // 2. Last message is from user
    // 3. It's a NEW user message (not one we've already scrolled to)
    // 4. We're not currently streaming (streaming has its own scroll logic)
    // 5. User has interacted (message was sent, not just initial load)
    // 6. We're not loading older messages (pagination)
    // 7. We're not loading initial messages
    const lastMessage = displayMessages[displayMessages.length - 1];
    const isNewUserMessage = 
      lastMessage?.role === 'user' && 
      lastMessage?.id !== lastUserMessageIdRef.current;
    
    if (
      displayMessages.length > 0 &&
      isNewUserMessage &&
      status !== 'streaming' &&
      hasInteracted &&
      !isLoadingOlderMessages &&
      !isLoadingInitialMessages
    ) {
      // Update ref to track this message (prevents re-scrolling for same message)
      lastUserMessageIdRef.current = lastMessage.id;
      
      // Use requestAnimationFrame to ensure DOM has updated with new message
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      });
    }
  }, [displayMessages, status, hasInteracted, isLoadingOlderMessages, isLoadingInitialMessages, scrollToBottom]);

  // Scroll to bottom when messages are initially loaded (for existing conversations)
  // This ensures users see the latest messages first, not the oldest
  // CRITICAL: Only runs on initial load, not during pagination
  useEffect(() => {
    // Only scroll if:
    // 1. We have loaded messages (from DB)
    // 2. We haven't interacted yet (preserve scroll if user manually scrolled)
    // 3. We're not loading older messages (pagination) - CRITICAL: prevents interference
    // 4. We're not currently streaming (streaming has its own scroll logic)
    // 5. We haven't already scrolled to bottom for this conversation (prevents re-scrolling after pagination)
    if (
      loadedMessages.length > 0 &&
      !hasInteracted &&
      !isLoadingOlderMessages &&
      status !== 'streaming' &&
      !isLoadingInitialMessages &&
      !hasInitiallyScrolledRef.current
    ) {
      // Use setTimeout to ensure DOM is updated before scrolling
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        hasInitiallyScrolledRef.current = true; // Mark as scrolled
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loadedMessages.length, hasInteracted, isLoadingOlderMessages, status, isLoadingInitialMessages, scrollToBottom]);

  // Reset scroll flags when conversation changes (so it scrolls for new conversations)
  useEffect(() => {
    hasInitiallyScrolledRef.current = false;
    lastUserMessageIdRef.current = null; // Reset tracked message ID for new conversation
  }, [conversationId]);

  // Auto-resize textarea using hook
  useTextareaAutoResize(textareaRef, input, {
    maxHeight: 200,
    minHeight: 48, // Prevent collapse when input is cleared after sending
  });

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

  return (
    <div className="homepage-container">
      <main className="conversation-main-content">
        <div className="conversation-container">
          <div 
            ref={conversationThreadRef}
            className="conversation-thread"
            style={{ overflowY: 'auto', height: '100%' }}
          >
            {/* Loading indicator for older messages - only show when actually paginating */}
            {isLoadingOlderMessages && hasMoreMessages && (
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
    </div>
  );
}

