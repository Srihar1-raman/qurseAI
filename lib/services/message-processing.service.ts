/**
 * Message Processing Service
 * Handles conversion and processing of chat messages
 */

import type { UIMessage } from 'ai';
import { toUIMessageFromZod } from '@/lib/utils/message-adapters';
import type { ChatRequest } from '@/lib/validation/chat-schema';

// Constants
export const TITLE_GENERATION_MIN_LENGTH = 50;

/**
 * Type for message array from validated chat request
 */
export type ChatMessageArray = ChatRequest['messages'];

/**
 * Result of processing chat messages
 */
export interface ProcessedMessageData {
  /** Messages converted to UIMessage format */
  uiMessages: UIMessage[];
  /** Last user message from the batch */
  lastUserMessage: UIMessage | null;
  /** Extracted text content from user message */
  userMessageText: string;
  /** Generated title for the conversation */
  title: string;
}

/**
 * Process and transform chat messages for AI streaming
 *
 * @param messages - Validated chat messages from request
 * @returns Processed message data including UI messages, title, etc.
 */
export function processMessages(messages: ChatMessageArray): ProcessedMessageData {
  // Convert Zod-validated messages to UIMessage[] format
  const uiMessages = toUIMessageFromZod(messages);

  // Extract user message for saving (enables parallel DB operations)
  let lastUserMessage: UIMessage | null = null;
  if (uiMessages.length > 0) {
    const lastMessage = uiMessages[uiMessages.length - 1];

    // Verify last message is a user message (critical for data integrity)
    if (lastMessage.role === 'user') {
      lastUserMessage = lastMessage;
    }
  }

  // Extract user message text for title generation
  const userMessageText = lastUserMessage?.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('') || '';

  // Calculate title for conversation creation
  const title = userMessageText.trim().length > 0
    ? userMessageText.slice(0, TITLE_GENERATION_MIN_LENGTH) + (userMessageText.length > TITLE_GENERATION_MIN_LENGTH ? '...' : '')
    : 'New Chat';

  return {
    uiMessages,
    lastUserMessage,
    userMessageText,
    title,
  };
}
