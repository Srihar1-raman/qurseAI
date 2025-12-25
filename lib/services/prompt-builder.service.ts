/**
 * Prompt Builder Service
 * Handles merging of mode-specific prompts with user custom prompts
 */

import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/prompt-builder');

/**
 * Build final system prompt by merging mode prompt with user custom prompt
 *
 * Strategy: Append custom prompt after mode prompt
 * This allows mode-specific behavior while preserving user customization
 *
 * @param modePrompt - Base system prompt from chat mode configuration
 * @param customPrompt - User's custom prompt (optional)
 * @returns Merged system prompt
 */
export function buildSystemPrompt(
  modePrompt: string,
  customPrompt?: string | null
): string {
  // If no custom prompt, return mode prompt as-is
  if (!customPrompt?.trim()) {
    logger.debug('Using mode prompt only (no custom prompt)');
    return modePrompt;
  }

  // Trim and validate custom prompt
  const trimmedCustom = customPrompt.trim();

  if (!trimmedCustom) {
    logger.debug('Custom prompt is empty, using mode prompt only');
    return modePrompt;
  }

  // Merge prompts: Mode prompt + Custom Instructions
  // Format: [Mode System Prompt]\n\n[Custom Instructions]
  const mergedPrompt = `${modePrompt}\n\nCustom Instructions:\n${trimmedCustom}`;

  logger.debug('Built merged system prompt', {
    modePromptLength: modePrompt.length,
    customPromptLength: trimmedCustom.length,
    mergedPromptLength: mergedPrompt.length,
  });

  return mergedPrompt;
}

/**
 * Validate custom prompt content
 * Checks for common issues that might cause problems
 *
 * @param customPrompt - Custom prompt to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateCustomPrompt(
  customPrompt: string
): { isValid: boolean; error?: string } {
  if (!customPrompt || !customPrompt.trim()) {
    return { isValid: true }; // Empty is valid
  }

  const trimmed = customPrompt.trim();

  // Check length
  if (trimmed.length > 5000) {
    return { isValid: false, error: 'Custom prompt cannot exceed 5000 characters' };
  }

  // Check for obvious prompt injection attempts (basic heuristic)
  // This is NOT comprehensive security, just basic sanity checking
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous\s+)?(instructions?|prompts?)/i,
    /disregard\s+(all\s+)?(previous\s+)?(instructions?|prompts?)/i,
    /override\s+(system\s+)?prompt/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmed)) {
      logger.warn('Potential prompt injection detected', { customPrompt: trimmed });
      return {
        isValid: false,
        error: 'Custom prompt contains potentially problematic content',
      };
    }
  }

  return { isValid: true };
}
