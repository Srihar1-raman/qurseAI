import { getEncoding } from 'js-tiktoken';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('lib/utils/token-counter');

// Cache encodings per model for performance
const encodingCache = new Map<string, ReturnType<typeof getEncoding>>();

/**
 * Get token encoding name for a model
 * Maps model IDs to their tiktoken encoding names
 */
function getEncodingName(model: string): "cl100k_base" | "o200k_base" | "p50k_base" | "r50k_base" | "gpt2" {
  // Check if model matches any known patterns
  const modelLower = model.toLowerCase();

  // GPT-4o, GPT-4, GPT-3.5 use cl100k_base
  if (modelLower.includes('gpt-4') || modelLower.includes('gpt-3.5')) {
    return 'cl100k_base';
  }

  // o1, o3 models use o200k_base
  if (modelLower.includes('o1') || modelLower.includes('o3')) {
    return 'o200k_base';
  }

  // Default fallback for Claude, Llama, etc.
  return 'cl100k_base';
}

/**
 * Get token encoding for a model
 */
export function getTiktokenEncoding(model: string) {
  if (encodingCache.has(model)) {
    return encodingCache.get(model)!;
  }

  const encodingName = getEncodingName(model);

  const encoding = getEncoding(encodingName);
  encodingCache.set(model, encoding);

  logger.debug('Created new encoding cache', { model, encodingName });

  return encoding;
}

/**
 * Count tokens in text for a specific model
 */
export function countTokens(text: string, model: string): number {
  if (!text) return 0;

  try {
    const encoding = getTiktokenEncoding(model);
    return encoding.encode(text).length;
  } catch (error) {
    logger.warn('Token counting failed, using heuristic', { model, error });
    // Fallback to heuristic if encoding fails
    return Math.ceil(text.length / 4);
  }
}

/**
 * Count tokens in a message (all parts)
 */
export function countMessageTokens(
  message: { parts?: Array<{ type: string; text?: string }> },
  model: string
): number {
  if (!message.parts) return 0;

  return message.parts
    .filter((p) => p.type === 'text' || p.type === 'reasoning')
    .reduce((sum, part) => sum + countTokens(part.text || '', model), 0);
}

/**
 * Count total tokens in message array
 */
export function countConversationTokens(
  messages: Array<{ parts?: Array<{ type: string; text?: string }> }>,
  model: string
): number {
  return messages.reduce((sum, msg) => sum + countMessageTokens(msg, model), 0);
}

/**
 * Free encodings (call on server shutdown)
 */
export function freeEncodings(): void {
  logger.info('Freeing encoding cache', { count: encodingCache.size });
  encodingCache.clear();
}
