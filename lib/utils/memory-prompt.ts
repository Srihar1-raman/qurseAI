/**
 * Memory Prompt Builder
 * Formats Supermemory context into system prompt for AI
 */

import type { UserMemoryContext } from '@/lib/services/supermemory.service';

/**
 * Build memory-enhanced system prompt from Supermemory context
 *
 * @param context - User memory context from Supermemory
 * @returns Formatted prompt string or empty string if no context
 */
export function buildMemoryPrompt(context: UserMemoryContext): string {
  const { static: staticFacts, dynamic, memories } = context;

  // Return empty if no context available
  if (staticFacts.length === 0 && dynamic.length === 0 && memories.length === 0) {
    return '';
  }

  const parts: string[] = [];

  // Header
  parts.push('User Context (from memory):');
  parts.push('');

  // Static facts - long-term information about the user
  if (staticFacts.length > 0) {
    parts.push('Known Facts:');
    staticFacts.forEach((fact) => {
      parts.push(`  • ${fact}`);
    });
    parts.push('');
  }

  // Dynamic context - recent activity and context
  if (dynamic.length > 0) {
    parts.push('Recent Activity:');
    dynamic.forEach((item) => {
      parts.push(`  • ${item}`);
    });
    parts.push('');
  }

  // Relevant memories - semantically related past conversations
  if (memories.length > 0) {
    parts.push('Relevant Past Conversations:');
    memories.forEach((memory) => {
      parts.push(`  • ${memory}`);
    });
    parts.push('');
  }

  // Guidance for AI
  parts.push('Use this context to provide personalized responses. Reference specific details when relevant.');

  return parts.join('\n');
}

/**
 * Extract text content from a UI message
 *
 * @param message - Message object (UIMessage or object with content string)
 * @returns Extracted text content
 */
export function extractMessageText(message: { content?: string | null } | { parts?: Array<{ type: string; text?: string }> }): string {
  // Handle messages with content property
  if ('content' in message && message.content) {
    return message.content;
  }

  // Handle messages with parts (UIMessage format)
  if ('parts' in message && message.parts) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('') || '';
  }

  return '';
}
