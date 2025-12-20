/**
 * Message Parts Fallback Utilities
 * Handles conversion from legacy content/reasoning format to parts array
 * Used for backward compatibility with old messages
 */

import type { UIMessagePart, UIDataTypes, UITools } from 'ai';

/**
 * Type for parts array (compatible with AI SDK)
 */
export type MessageParts = UIMessagePart<UIDataTypes, UITools>[];

/**
 * Delimiter constants for legacy reasoning format
 */
const REASONING_START = '__QURSE_REASONING_START__';
const REASONING_END = '__QURSE_REASONING_END__';

/**
 * Convert legacy content (with delimiter-based reasoning) to parts array
 * Handles old messages that use delimiter format
 * 
 * @param content - Legacy content string (may contain delimiter)
 * @returns Parts array with text and reasoning parts
 */
export function convertLegacyContentToParts(content: string | null | undefined): MessageParts {
  if (!content) {
    return [{ type: 'text', text: '' }];
  }

  const parts: MessageParts = [];

  // Check if content contains delimiter-based reasoning
  if (content.includes(REASONING_START) && content.includes(REASONING_END)) {
    const startIdx = content.indexOf(REASONING_START);
    const endIdx = content.indexOf(REASONING_END);

    if (startIdx < endIdx) {
      // Extract text content (before and after delimiter)
      const textContent = content.substring(0, startIdx) + content.substring(endIdx + REASONING_END.length);
      const reasoningRaw = content.substring(startIdx + REASONING_START.length, endIdx);

      // Add text part if not empty
      if (textContent.trim()) {
        parts.push({ type: 'text', text: textContent });
      }

      // Parse and add reasoning part
      try {
        const parsed = JSON.parse(reasoningRaw);
        let reasoningText: string;

        if (typeof parsed === 'string') {
          reasoningText = parsed;
        } else if (Array.isArray(parsed)) {
          // Array of objects with text property: [{type: "reasoning", text: "..."}]
          reasoningText = parsed
            .map((item) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object' && 'text' in item) {
                return typeof item.text === 'string' ? item.text : String(item.text);
              }
              return '';
            })
            .filter(Boolean)
            .join('\n\n');
        } else if (parsed && typeof parsed === 'object' && 'text' in parsed) {
          // Object with text property: {type: "reasoning", text: "..."}
          reasoningText = typeof parsed.text === 'string' ? parsed.text : String(parsed.text);
        } else {
          // Fallback: stringify if we can't extract text
          reasoningText = JSON.stringify(parsed);
        }

        if (reasoningText) {
          parts.push({ type: 'reasoning', text: reasoningText });
        }
      } catch {
        // Not JSON, use as-is
        if (reasoningRaw) {
          parts.push({ type: 'reasoning', text: reasoningRaw });
        }
      }
    } else {
      // Invalid delimiter positions, treat as plain text
      parts.push({ type: 'text', text: content });
    }
  } else {
    // No delimiter, just content
    parts.push({ type: 'text', text: content });
  }

  // Ensure at least one part exists
  if (parts.length === 0) {
    parts.push({ type: 'text', text: '' });
  }

  return parts;
}

