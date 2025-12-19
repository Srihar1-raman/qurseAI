/**
 * Type definitions for conversation components and hooks
 */

'use client';

import type { UIMessagePart } from 'ai';
import type { QurseMessage } from '@/lib/types';

export interface ConversationClientProps {
  conversationId: string;
  initialMessages: Array<{
    id: string;
    role: 'user' | 'assistant';
    parts?: UIMessagePart<any, any>[];
  }>;
  initialHasMore?: boolean;
  initialDbRowCount?: number;
  hasInitialMessageParam: boolean;
}

export interface ConversationThreadProps {
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

export interface ConversationInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isLoading: boolean;
  chatMode: string;
  onChatModeChange: (mode: string) => void;
}

export interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts?: UIMessagePart<any, any>[];
  content?: string;
  metadata?: any;
  createdAt?: string;
}

