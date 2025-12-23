'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useConversation } from '@/lib/contexts/ConversationContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { useRateLimit } from '@/lib/contexts/RateLimitContext';
import { GuestRateLimitPopup, FreeUserRateLimitPopup } from '@/components/rate-limit';
import { useConversationMessages } from '@/hooks/use-conversation-messages';
import { useConversationScroll } from '@/hooks/use-conversation-scroll';
import { useConversationInput } from '@/hooks/use-conversation-input';
import { useChatTransport } from '@/hooks/use-chat-transport';
import { useConversationLifecycle } from '@/hooks/use-conversation-lifecycle';
import { ConversationThread } from './ConversationThread';
import { ConversationInput } from './ConversationInput';
import { ShareConversationModal } from './ShareConversationModal';
import { useShareConversation } from '@/hooks/use-share-conversation';
import { createScopedLogger } from '@/lib/utils/logger';
import type { ConversationClientProps } from './types';

const logger = createScopedLogger('components/conversation/ConversationClient');

export function ConversationClient({
  conversationId,
  initialMessages,
  initialHasMore = false,
  initialDbRowCount = 0,
  hasInitialMessageParam,
}: ConversationClientProps) {
  const { selectedModel, chatMode, setChatMode } = useConversation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { error: showToastError, success: showToastSuccess } = useToast();
  const { state: rateLimitState, setRateLimitState } = useRateLimit();
  const router = useRouter();
  const { shareConversation, unshareConversation, isSharing } = useShareConversation();
  
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState<string>('');
  const [isShared, setIsShared] = React.useState(false);
  const [showGuestSharePopup, setShowGuestSharePopup] = React.useState(false);
  const [shareAttemptCount, setShareAttemptCount] = React.useState(0);

  const conversationIdRef = useRef(conversationId);
  const initialMessageSentRef = useRef(false);
  const [sendAttemptCount, setSendAttemptCount] = React.useState(0);
  const hasStoppedRef = useRef(false);
  const hasSavedStopRef = useRef(false);
  const stoppedMessageIdsRef = useRef<Set<string>>(new Set()); // Track which message IDs have been stopped
  const currentStreamingMessageIdRef = useRef<string | null>(null); // Track current streaming message ID

  React.useEffect(() => {
    conversationIdRef.current = conversationId;
    hasStoppedRef.current = false; // Reset on conversation change
    hasSavedStopRef.current = false;
    stoppedMessageIdsRef.current.clear(); // Clear stopped message IDs on conversation change
    currentStreamingMessageIdRef.current = null;
  }, [conversationId]);

  const { messages, sendMessage, status, error, stop, setMessages } = useChatTransport({
    conversationId,
    selectedModel,
    chatMode,
    user: user ? { id: user.id } : null,
    setRateLimitState,
    showToastError,
    onSendAttempt: () => {
      setSendAttemptCount((prev) => prev + 1);
    },
  });

  const { hasInteracted, setHasInteracted } = useConversationLifecycle({
    conversationId,
    user,
    isAuthLoading,
    hasInitialMessageParam,
    sendMessage,
    initialMessageSentRef,
  });

  const {
    displayMessages,
    displayMessagesRef,
    isLoadingOlderMessages,
    isLoadingInitialMessages,
    hasMoreMessages,
    loadOlderMessages,
    scrollPositionRef,
    loadedMessagesLength,
  } = useConversationMessages({
    conversationId,
    initialMessages,
    initialHasMore,
    initialDbRowCount,
    useChatMessages: messages,
    user,
    showToastError,
    initialMessageSentRef,
    conversationIdRef,
    hasInitialMessageParam,
    status,
  });

  const { conversationEndRef, conversationContainerRef, conversationThreadRef, scrollToBottom } =
    useConversationScroll({
      displayMessages,
      displayMessagesRef, // Pass ref with always-latest content for RAF loop
      status,
      hasInteracted,
      isLoadingOlderMessages,
      isLoadingInitialMessages,
      hasMoreMessages,
      loadOlderMessages,
      scrollPositionRef,
      loadedMessagesLength,
      conversationId,
    });

  // Reset stop flags when a new message starts streaming (status transitions to 'submitted')
  // This allows stopping multiple messages in the same conversation
  const prevStatusRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    // When status changes from 'idle'/'error' to 'submitted', a new message is starting
    const wasIdle = prevStatusRef.current === 'idle' || prevStatusRef.current === 'error' || prevStatusRef.current === undefined;
    const isNowSubmitted = status === 'submitted';
    
    if (wasIdle && isNowSubmitted) {
      // New message starting - reset stop flags
      hasStoppedRef.current = false;
      hasSavedStopRef.current = false;
      currentStreamingMessageIdRef.current = null;
    }
    
    // Also reset when status becomes idle/error (message completed or failed)
    if (status !== 'submitted' && status !== 'streaming') {
      hasStoppedRef.current = false;
      hasSavedStopRef.current = false;
    }
    
    // Track current streaming message ID
    // Extract last message info as primitives to avoid infinite loops during streaming
    // During streaming, displayMessages gets new reference on every chunk
    if (status === 'streaming' && displayMessages.length > 0) {
      const lastMessage = displayMessages[displayMessages.length - 1];
      if (lastMessage.role === 'assistant') {
        currentStreamingMessageIdRef.current = lastMessage.id;
      }
    }
    
    prevStatusRef.current = status;
    // Depend only on status and length (primitives), not array reference
    // Accessing displayMessages inside effect is safe - we only read, don't depend on reference
  }, [status, displayMessages.length]);

  const isLoading = status === 'submitted' || status === 'streaming';
  const isThinking = status === 'submitted'; // Only show thinking animation before streaming starts
  const isStreaming = status === 'streaming'; // Extract for passing down to markdown renderer
  const showStopButton = status === 'streaming' && !hasStoppedRef.current;

  const { input, setInput, textareaRef, handleSubmit, handleKeyPress } = useConversationInput({
    sendMessage,
    isLoading,
    isRateLimited: rateLimitState.isRateLimited,
    onSendAttempt: () => {
      setSendAttemptCount((prev) => prev + 1);
    },
    onInteract: () => setHasInteracted(true),
  });

  const handleShare = React.useCallback(async () => {
    // Check if user is guest - show login popup
    if (!user || !user.id) {
      setShareAttemptCount(prev => prev + 1);
      setShowGuestSharePopup(true);
      return;
    }

    if (!conversationId || conversationId.startsWith('temp-')) {
      showToastError('Cannot share this conversation');
      return;
    }

    try {
      const response = await shareConversation(conversationId);
      setShareUrl(response.shareUrl);
      setIsShared(true);
      setShareModalOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share conversation';
      showToastError(errorMessage);
    }
  }, [conversationId, shareConversation, showToastError, user]);

  const handleUnshare = React.useCallback(async () => {
    if (!conversationId || conversationId.startsWith('temp-')) {
      return;
    }

    try {
      await unshareConversation(conversationId);
      setIsShared(false);
      setShareUrl('');
      setShareModalOpen(false);
      showToastSuccess('Conversation unshared');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unshare conversation';
      showToastError(errorMessage);
    }
  }, [conversationId, unshareConversation, showToastError, showToastSuccess]);

  const handleStop = React.useCallback(() => {
    // Get current streaming message ID
    const streamingMessageId = currentStreamingMessageIdRef.current;
    
    // Check if this message has already been stopped
    if (streamingMessageId && stoppedMessageIdsRef.current.has(streamingMessageId)) {
      return; // Already stopped this message
    }
    
    // Check if we've already stopped in this session (prevent rapid clicks)
    if (hasStoppedRef.current) {
      return;
    }
    
    hasStoppedRef.current = true;
    hasSavedStopRef.current = false;

    stop();

    // Wait for stop() to complete and messages to settle before processing
    setTimeout(() => {
      // Use current messages state (not captured) to avoid stale state
      setMessages((prev) => {
        // Check again inside setMessages to prevent duplicate processing
        if (hasSavedStopRef.current) {
          return prev;
        }

        const lastMessage = prev[prev.length - 1];
        const hasPartialResponse = lastMessage?.role === 'assistant' && 
          lastMessage.parts && lastMessage.parts.length > 0;
        
        // Check if this specific message has already been stopped
        const messageId = lastMessage?.id;
        if (messageId && stoppedMessageIdsRef.current.has(messageId)) {
          return prev; // Already processed this message
        }
        
        // Check if stop text already exists in this message
        const alreadyStopped = lastMessage?.parts?.some(
          p => p.type === 'text' && typeof p.text === 'string' && p.text.includes('*User stopped this message here*')
        ) ?? false;
        
        if (hasPartialResponse && !alreadyStopped && messageId) {
          // Mark this message as stopped
          stoppedMessageIdsRef.current.add(messageId);
          
          const updatedLastMessage = {
            ...lastMessage,
            parts: [
              ...lastMessage.parts,
              { type: 'text' as const, text: '\n\n*User stopped this message here*' },
            ],
          };
          
          // Save to database (only once)
          if (conversationId && !hasSavedStopRef.current) {
            hasSavedStopRef.current = true;
            const saveStartTime = Date.now();
            logger.info('CLIENT: Saving partial message to /api/messages', {
              conversationId,
              messageId: updatedLastMessage.id,
              timestamp: saveStartTime,
            });
            fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationId,
                message: updatedLastMessage,
              }),
            })
            .then(() => {
              logger.info('CLIENT: Partial message saved successfully', {
                conversationId,
                messageId: updatedLastMessage.id,
                saveDuration: Date.now() - saveStartTime,
              });
            })
            .catch((error) => {
              logger.error('CLIENT: Failed to save stopped message', error, {
                conversationId,
                messageId: updatedLastMessage.id,
              });
            });
          }
          
          return [...prev.slice(0, -1), updatedLastMessage];
        }
        
        // If no partial response but status was streaming, create stop-only message
        if ((status === 'submitted' || status === 'streaming') && !alreadyStopped && messageId) {
          // Mark this message as stopped
          stoppedMessageIdsRef.current.add(messageId);
          
          const stopMessage = {
            id: `stop-${Date.now()}`,
            role: 'assistant' as const,
            parts: [{ type: 'text' as const, text: '*User stopped this message here*' }],
          };
          
          // Save to database (only once)
          if (conversationId && !hasSavedStopRef.current) {
            hasSavedStopRef.current = true;
            const saveStartTime = Date.now();
            logger.info('CLIENT: Saving stop-only message to /api/messages', {
              conversationId,
              messageId: stopMessage.id,
              timestamp: saveStartTime,
            });
            fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationId,
                message: stopMessage,
              }),
            })
            .then(() => {
              logger.info('CLIENT: Stop-only message saved successfully', {
                conversationId,
                messageId: stopMessage.id,
                saveDuration: Date.now() - saveStartTime,
              });
            })
            .catch((error) => {
              logger.error('CLIENT: Failed to save stopped message', error, {
                conversationId,
                messageId: stopMessage.id,
              });
            });
          }
          
          return [...prev, stopMessage];
        }
        
        return prev;
      });
    }, 200);
  }, [stop, status, setMessages, conversationId]);

  return (
    <div className="homepage-container">
      <main className="conversation-main-content">
        <ConversationThread
          messages={displayMessages}
          isLoading={isThinking} // Only show thinking animation during 'submitted' status
          isLoadingOlderMessages={isLoadingOlderMessages}
          hasMoreMessages={hasMoreMessages}
          error={error}
          isRateLimited={rateLimitState.isRateLimited}
          selectedModel={selectedModel}
          isStreaming={isStreaming}
          conversationEndRef={conversationEndRef}
          conversationContainerRef={conversationContainerRef}
          conversationThreadRef={conversationThreadRef}
          onShare={handleShare}
          user={user?.id ? { id: user.id } : null}
        />

        <ConversationInput
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onKeyPress={handleKeyPress}
          textareaRef={textareaRef}
          isLoading={isLoading}
          chatMode={chatMode}
          onChatModeChange={setChatMode}
          onStop={handleStop}
          showStopButton={showStopButton}
        />
      </main>

      {/* Rate limit popups - only show when user tries to send */}
      {rateLimitState.isRateLimited && sendAttemptCount > 0 && !user && (
        <GuestRateLimitPopup
          key={sendAttemptCount}
          isOpen={true}
          onClose={() => {
            // Don't clear state - user is still rate limited
          }}
          reset={rateLimitState.resetTime || Date.now()}
          layer={rateLimitState.layer || 'database'}
        />
      )}

      {rateLimitState.isRateLimited && sendAttemptCount > 0 && user && (
        <FreeUserRateLimitPopup
          key={sendAttemptCount}
          isOpen={true}
          onClose={() => {
            // Don't clear state - user is still rate limited
          }}
          onUpgrade={() => {
            router.push('/pricing');
          }}
          reset={rateLimitState.resetTime || Date.now()}
        />
      )}

      {/* Share conversation modal */}
      <ShareConversationModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        onUnshare={isShared ? handleUnshare : undefined}
      />

      {/* Guest share popup - same as rename/delete */}
      {showGuestSharePopup && shareAttemptCount > 0 && (
        <GuestRateLimitPopup
          key={shareAttemptCount}
          isOpen={true}
          onClose={() => setShowGuestSharePopup(false)}
          reset={Date.now() + 24 * 60 * 60 * 1000}
          layer="database"
          customTitle="Sign in to continue"
          customMessage="Sign in to unlock this feature and access more capabilities."
        />
      )}
    </div>
  );
}
