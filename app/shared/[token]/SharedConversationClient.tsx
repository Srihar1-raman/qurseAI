'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Header from '@/components/layout/Header';
import HistorySidebar from '@/components/layout/history/HistorySidebar';
import { ConversationThread } from '@/components/conversation/ConversationThread';
import { ConversationInput } from '@/components/conversation/ConversationInput';
import { GuestRateLimitPopup } from '@/components/rate-limit';
import type { Conversation, QurseMessage } from '@/lib/types';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('app/shared/[token]/SharedConversationClient');

interface SharedConversationClientProps {
  conversation: Conversation;
  messages: QurseMessage[];
  shareToken: string;
}

export default function SharedConversationClient({
  conversation,
  messages: initialMessages,
  shareToken,
}: SharedConversationClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGuestPopup, setShowGuestPopup] = useState(false);
  const [sendAttemptCount, setSendAttemptCount] = useState(0);
  const [inputInteractionCount, setInputInteractionCount] = useState(0);

  // Handler for guest input interactions (click, focus, keydown)
  const handleGuestInputInteraction = useCallback(() => {
    const isGuest = !user || !user.id;
    logger.debug('Input interaction', { isGuest, hasUser: !!user, userId: user?.id });
    if (isGuest) {
      setInputInteractionCount(prev => prev + 1);
      setShowGuestPopup(true);
    }
  }, [user, logger]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Refs for conversation thread (needed by ConversationThread)
  const conversationEndRef = React.useRef<HTMLDivElement>(null);
  const conversationContainerRef = React.useRef<HTMLDivElement>(null);
  const conversationThreadRef = React.useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const messageText = input.trim();
    if (!messageText) return;

    // Guest users: show login popup
    if (!user || !user.id) {
      setSendAttemptCount(prev => prev + 1);
      setShowGuestPopup(true);
      return;
    }

    // Authenticated users: fork conversation and continue
    // Show optimistic message immediately for better UX
    setPendingMessage(messageText);
    setInput(''); // Clear input immediately
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/shared/${shareToken}/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setPendingMessage(null); // Clear optimistic message on error
          setSendAttemptCount(prev => prev + 1);
          setShowGuestPopup(true);
          setIsLoading(false);
          return;
        }

        const errorData = await response.json().catch(() => ({ error: 'Failed to continue conversation' }));
        logger.error('Error continuing conversation', { status: response.status, error: errorData.error });
        setPendingMessage(null); // Clear optimistic message on error
        alert(errorData.error || 'Failed to continue conversation');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const newConversationId = data.conversationId;

      if (newConversationId) {
        // Redirect to new conversation (optimistic navigation)
        router.push(`/conversation/${newConversationId}?message=${encodeURIComponent(messageText)}`);
        // Don't clear loading state - let the new page handle it
      } else {
        throw new Error('No conversation ID returned');
      }
    } catch (error) {
      logger.error('Error continuing shared conversation', error);
      setPendingMessage(null); // Clear optimistic message on error
      alert('Failed to continue conversation. Please try again.');
      setIsLoading(false);
    }
  }, [input, user, shareToken, router]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Enter to submit, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }, [handleSubmit]);

  // Convert initial messages to display format, with optimistic pending message
  const displayMessages: QurseMessage[] = React.useMemo(() => {
    const baseMessages = initialMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts,
      metadata: msg.metadata,
    }));

    // Add optimistic user message if pending
    if (pendingMessage && isLoading) {
      return [
        ...baseMessages,
        {
          id: `pending-${Date.now()}`,
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: pendingMessage }],
          metadata: undefined,
        },
      ];
    }

    return baseMessages;
  }, [initialMessages, pendingMessage, isLoading]);

  // Handle New Chat button click
  const handleNewChat = useCallback(() => {
    router.push('/');
  }, [router]);

  return (
    <div className="homepage-container">
      <Header 
        user={user || null}
        showHistoryButton={true}
        onHistoryClick={() => setIsHistoryOpen(true)}
        showNewChatButton={true}
        onNewChatClick={handleNewChat}
      />
      
      <main className="conversation-main-content" style={{ position: 'relative' }}>
        {/* Loading overlay during fork */}
        {isLoading && pendingMessage && (
          <>
            {/* Translucent backdrop - shows conversation thread behind */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'var(--color-bg)',
                opacity: 0.85,
                zIndex: 99,
              }}
            />
            {/* Modal content - fully opaque */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                flexDirection: 'column',
                gap: '16px',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  padding: '24px 32px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  maxWidth: '400px',
                  pointerEvents: 'auto',
                }}
              >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--color-primary)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div
                style={{
                  color: 'var(--color-text)',
                  fontSize: '16px',
                  fontWeight: 500,
                  textAlign: 'center',
                }}
              >
                Creating your conversation...
              </div>
              <div
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                Copying messages and setting everything up
              </div>
            </div>
          </div>
          </>
        )}

        <ConversationThread
          messages={displayMessages}
          isLoading={false}
          isLoadingOlderMessages={false}
          hasMoreMessages={false}
          error={undefined}
          isRateLimited={false}
          selectedModel=""
          conversationEndRef={conversationEndRef}
          conversationContainerRef={conversationContainerRef}
          conversationThreadRef={conversationThreadRef}
        />

        <ConversationInput
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onKeyPress={handleKeyPress}
          textareaRef={React.createRef()}
          isLoading={isLoading}
          chatMode="chat"
          onChatModeChange={() => {}}
          disabled={!user || !user.id}
          onDisabledClick={handleGuestInputInteraction}
        />
      </main>

      {/* History Sidebar */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Guest login popup - show on input interaction or send attempt */}
      {showGuestPopup && (
        <GuestRateLimitPopup
          key={`${sendAttemptCount}-${inputInteractionCount}`}
          isOpen={true}
          onClose={() => {
            setShowGuestPopup(false);
            // Reset counts when closing to allow popup to show again on next interaction
            setSendAttemptCount(0);
            setInputInteractionCount(0);
          }}
          reset={Date.now() + 24 * 60 * 60 * 1000}
          layer="database"
          customTitle="Sign in to continue"
          customMessage="Sign in to continue this conversation and send messages."
        />
      )}
    </div>
  );
}

