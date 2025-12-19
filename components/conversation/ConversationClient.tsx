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
import type { ConversationClientProps } from './types';

export function ConversationClient({
  conversationId,
  initialMessages,
  initialHasMore = false,
  initialDbRowCount = 0,
  hasInitialMessageParam,
}: ConversationClientProps) {
  const { selectedModel, chatMode, setChatMode } = useConversation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { error: showToastError } = useToast();
  const { state: rateLimitState, setRateLimitState } = useRateLimit();
  const router = useRouter();

  const conversationIdRef = useRef(conversationId);
  const initialMessageSentRef = useRef(false);
  const [sendAttemptCount, setSendAttemptCount] = React.useState(0);

  React.useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const { messages, sendMessage, status, error } = useChatTransport({
    conversationId,
    selectedModel,
    chatMode,
    user: user ? { id: user.id } : null,
    setRateLimitState,
    showToastError,
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

  const isLoading = status === 'submitted' || status === 'streaming';

  const { input, setInput, textareaRef, handleSubmit, handleKeyPress } = useConversationInput({
    sendMessage,
    isLoading,
    isRateLimited: rateLimitState.isRateLimited,
    onSendAttempt: () => {
      setSendAttemptCount((prev) => prev + 1);
    },
    onInteract: () => setHasInteracted(true),
  });

  return (
    <div className="homepage-container">
      <main className="conversation-main-content">
        <ConversationThread
          messages={displayMessages}
          isLoading={isLoading}
          isLoadingOlderMessages={isLoadingOlderMessages}
          hasMoreMessages={hasMoreMessages}
          error={error}
          isRateLimited={rateLimitState.isRateLimited}
          selectedModel={selectedModel}
          conversationEndRef={conversationEndRef}
          conversationContainerRef={conversationContainerRef}
          conversationThreadRef={conversationThreadRef}
        />

        <ConversationInput
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onKeyPress={handleKeyPress}
          textareaRef={textareaRef}
          isLoading={isLoading}
          isRateLimited={rateLimitState.isRateLimited}
          chatMode={chatMode}
          onChatModeChange={setChatMode}
        />
      </main>

      {/* Rate limit popups */}
      {rateLimitState.isRateLimited && !user && (
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

      {rateLimitState.isRateLimited && user && (
        <FreeUserRateLimitPopup
          key={sendAttemptCount}
          isOpen={true}
          onClose={() => {
            // Don't clear state - user is still rate limited
          }}
          onUpgrade={() => {
            router.push('/settings?tab=pricing');
          }}
          reset={rateLimitState.resetTime || Date.now()}
        />
      )}
    </div>
  );
}
