/**
 * Message Type Adapters
 * Safe conversion between Zod-validated messages, server format, and AI SDK UIMessage format
 */

import { type UIMessage, type UIMessagePart, convertToModelMessages, streamText } from 'ai';
import { createScopedLogger } from './logger';
import type { ChatRequest } from '@/lib/validation/chat-schema';

const logger = createScopedLogger('message-adapters');

/**
 * Helper type for UIMessage parts array
 * Extracts the exact type expected by convertToModelMessages
 */
export type UIMessageParts = Parameters<typeof convertToModelMessages>[0][number]['parts'];

/**
 * Helper type for provider options
 * Extracts the exact type expected by streamText
 */
export type StreamTextProviderOptions = Parameters<typeof streamText>[0]['providerOptions'];

/**
 * Server message format (from database or API responses)
 */
export interface ServerMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
}

/**
 * Convert Zod-validated messages to UIMessage[] format
 * Handles optional fields and ensures all required UIMessage fields are present
 */
export function toUIMessageFromZod(messages: ChatRequest['messages']): UIMessage[] {
  return messages.map((msg): UIMessage => {
    // Generate ID if missing (client messages might not have IDs)
    let messageId = msg.id;
    if (!messageId) {
      messageId = crypto.randomUUID();
      logger.warn('Message missing ID, generated UUID', { role: msg.role });
    }

    // If message has parts, use as UIMessage with parts
    if (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
      return {
        id: messageId,
        role: (msg.role || 'user') as 'user' | 'assistant' | 'system',
        parts: msg.parts.map((p) => ({ type: p.type, text: p.text || '' })) as UIMessageParts,
      };
    }

    // Otherwise, create parts from content
    const parts: UIMessageParts = [];
    if (msg.content) {
      parts.push({ type: 'text', text: msg.content } as UIMessageParts[number]);
    }

    return {
      id: messageId,
      role: (msg.role || 'user') as 'user' | 'assistant' | 'system',
      parts,
    };
  });
}

/**
 * Convert server message format to UIMessage[] format
 * Server messages come from database and always have id, role, and content
 */
export function toUIMessageFromServer(messages: ServerMessage[]): UIMessage[] {
  return messages.map((msg): UIMessage => {
    const parts: UIMessageParts = [
      { type: 'text', text: msg.content } as UIMessageParts[number],
    ];

    // Add reasoning as a separate part if it exists
    if (msg.reasoning) {
      parts.push({ type: 'reasoning', text: msg.reasoning } as UIMessageParts[number]);
    }

    return {
      id: msg.id,
      role: msg.role,
      parts,
    };
  });
}

