/**
 * Message utility functions for conversation management
 * Handles message merging, transformation, and deduplication
 */

import type { UIMessagePart } from 'ai';
import type { QurseMessage, StreamMetadata } from '@/lib/types';

/**
 * Base message type from database or useChat
 */
interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts?: UIMessagePart<any, any>[];
  content?: string;
  metadata?: StreamMetadata;
  createdAt?: string;
}

/**
 * Extract text content from a message
 * Handles both parts array and content string formats
 */
function extractMessageContent(message: BaseMessage): string {
  if ('parts' in message && Array.isArray(message.parts) && message.parts.length > 0) {
    return message.parts
      .map((p) => ('text' in p ? p.text : ''))
      .join('')
      .trim();
  }
  if ('content' in message && message.content) {
    return String(message.content).trim();
  }
  return '';
}

/**
 * Create a content-based key for message deduplication
 * Uses role + content to identify duplicate messages with different IDs
 */
function createMessageContentKey(message: BaseMessage): string {
  const content = extractMessageContent(message);
  return `${message.role}:${content}`;
}

/**
 * Merge database messages with useChat messages, avoiding duplicates
 * Database messages are the source of truth and always preserved
 */
export function mergeMessages(
  loadedMessages: BaseMessage[],
  useChatMessages: BaseMessage[],
  isLoadingInitialMessages: boolean
): BaseMessage[] {
  const baseMessages = loadedMessages.length > 0 ? loadedMessages : [];

  if (isLoadingInitialMessages) {
    return baseMessages;
  }

  if (useChatMessages.length === 0) {
    return baseMessages;
  }

  const messageIds = new Set(baseMessages.map((m) => m.id));
  const messageContentSet = new Set(baseMessages.map(createMessageContentKey));

  const newMessages = useChatMessages.filter((m) => {
    if (messageIds.has(m.id)) {
      return false;
    }

    const contentKey = createMessageContentKey(m);
    if (messageContentSet.has(contentKey)) {
      return false;
    }

    return true;
  });

  return [...baseMessages, ...newMessages];
}

/**
 * Transform merged messages to QurseMessage format
 * Ensures all messages have the parts structure that ChatMessage expects
 */
export function transformToQurseMessage(messages: BaseMessage[]): QurseMessage[] {
  return messages.map((msg): QurseMessage => {
    if ('parts' in msg && msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        parts: msg.parts as UIMessagePart<any, any>[],
        metadata: 'metadata' in msg && msg.metadata ? (msg.metadata as StreamMetadata) : undefined,
      };
    }

    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      parts: [{ type: 'text', text: '' }],
      metadata: undefined,
    };
  });
}

