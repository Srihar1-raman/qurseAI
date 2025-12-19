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
  // If we have streaming messages, prioritize them to prevent flashing
  // This is the source of truth when messages are actively streaming
  if (useChatMessages.length > 0) {
    // If loadedMessages is empty, just return useChatMessages directly (no merge needed)
    if (loadedMessages.length === 0) {
      return useChatMessages;
    }

    // Both have messages - merge and deduplicate
    const messageIds = new Set(loadedMessages.map((m) => m.id));
    const messageContentSet = new Set(loadedMessages.map(createMessageContentKey));

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

    // Only create new array if there are actually new messages to add
    if (newMessages.length === 0) {
      return loadedMessages; // Return loadedMessages as-is if no new messages
    }

    return [...loadedMessages, ...newMessages];
  }

  // No streaming messages - return loaded messages (or empty if still loading)
  if (isLoadingInitialMessages && loadedMessages.length === 0) {
    return [];
  }

  return loadedMessages;
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

