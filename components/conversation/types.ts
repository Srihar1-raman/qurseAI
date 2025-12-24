/**
 * Type definitions for conversation components and hooks
 */

'use client';

import type { UIMessagePart } from 'ai';
import type { QurseMessage } from '@/lib/types';

export interface ConversationClientProps {
  conversationId: string | undefined;
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
  onShare?: () => void | Promise<void>;
  user?: { id: string } | null;
  isStreaming?: boolean; // Indicates if content is actively streaming
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
  contextUsage?: ContextUsage | null;
}

export interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts?: UIMessagePart<any, any>[];
  content?: string;
  metadata?: any;
  createdAt?: string;
}

/**
 * Context usage metadata from API
 * Contains information about conversation context utilization
 */
export interface ContextUsage {
  /** Percentage of context budget used (0-100) */
  percentage: number;
  /** Current token count after trimming */
  currentTokens: number;
  /** Maximum tokens allowed (75% of model context window) */
  maxTokens: number;
  /** Model's total context window */
  modelContextWindow: number;
  /** Number of messages in current context */
  messagesKept: number;
  /** Number of messages dropped (if any) */
  messagesDropped: number;
  /** Number of messages reasoning was removed from */
  reasoningRemoved: number;
  /** Optional warning message from context manager */
  warning?: string;
  /** Model identifier */
  model: string;
}

