/**
 * Message Deduplication Utility
 * 
 * Removes duplicate assistant messages where one has stop text and one doesn't.
 * Only removes duplicates if they have similar content (same message, different completion state).
 * 
 * Algorithm: For each assistant message, check if there's a duplicate with similar content.
 * If one has stop text and one doesn't, and they share significant content overlap, keep the one with stop text.
 */

import type { QurseMessage } from '@/lib/types';

// ============================================
// Content Extraction Helpers
// ============================================

/**
 * Extract text content from message parts, removing stop text and normalizing whitespace
 */
function getTextContent(msg: QurseMessage): string {
  return msg.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .replace(/\*User stopped this message here\*/g, '')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim() || '';
}

/**
 * Extract reasoning content from message parts
 * Note: Uses parts column (content column will be deprecated)
 */
function getReasoningContent(msg: QurseMessage): string {
  const reasoningParts = msg.parts
    ?.filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning' && typeof p.text === 'string')
    .map((p) => p.text) || [];
  
  if (reasoningParts.length === 0) return '';
  
  return reasoningParts
    .join(' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Get reasoning prefix (first N chars) for comparison
 * Useful when one reasoning is complete and one is truncated (streaming vs done)
 */
function getReasoningPrefix(reasoning: string, length: number = 200): string {
  if (!reasoning || reasoning.length === 0) return '';
  return reasoning.substring(0, Math.min(length, reasoning.length)).replace(/\s+/g, ' ').trim();
}

/**
 * Create a normalized reasoning signature for comparison
 * Takes first 200 chars and last 200 chars to catch cases where middle differs slightly
 */
function getReasoningSignature(reasoning: string): string {
  if (!reasoning || reasoning.length < 10) return '';
  const firstPart = reasoning.substring(0, Math.min(200, reasoning.length)).replace(/\s+/g, ' ').trim();
  const lastPart = reasoning.length > 200 
    ? reasoning.substring(reasoning.length - 200).replace(/\s+/g, ' ').trim()
    : '';
  return firstPart + (lastPart ? '|' + lastPart : '');
}

// ============================================
// Reasoning Comparison Logic
// ============================================

/**
 * Check if two reasoning strings match (exact, prefix, or high similarity)
 */
function compareReasoning(
  reasoning1: string,
  reasoning2: string,
  text1: string,
  text2: string
): boolean {
  const hasLongReasoning = reasoning1 && reasoning2 && reasoning1.length > 50 && reasoning2.length > 50;
  const hasShortReasoning = reasoning1 && reasoning2 && reasoning1.length > 0 && reasoning2.length > 0;
  
  if (!hasLongReasoning && !hasShortReasoning) return false;
  
  // Exact match
  if (reasoning1 === reasoning2) {
    return true;
  }
  
  const shorterReasoning = reasoning1.length < reasoning2.length ? reasoning1 : reasoning2;
  const longerReasoning = reasoning1.length >= reasoning2.length ? reasoning1 : reasoning2;
  
  // Handle truncated reasoning (prefix check)
  if (shorterReasoning.length >= 100 && longerReasoning.startsWith(shorterReasoning)) {
    return true;
  }
  
  // Handle shorter reasoning (50-100 chars)
  if (shorterReasoning.length >= 50 && shorterReasoning.length < 100) {
    if (longerReasoning.startsWith(shorterReasoning)) return true;
    
    const minLength = Math.min(shorterReasoning.length, longerReasoning.length);
    if (minLength >= 50) {
      let matchingChars = 0;
      for (let i = 0; i < minLength; i++) {
        if (shorterReasoning[i] === longerReasoning[i]) {
          matchingChars++;
        } else {
          break;
        }
      }
      if (matchingChars >= shorterReasoning.length * 0.8) return true;
    }
  }
  
  // Handle very short reasoning (20-50 chars)
  if (shorterReasoning.length < 50 && shorterReasoning.length >= 20) {
    if (shorterReasoning === longerReasoning.substring(0, shorterReasoning.length)) {
      if (text1.length < 10 && text2.length < 10) return true;
      return true;
    }
    
    const minLength = Math.min(shorterReasoning.length, longerReasoning.length);
    let matchingChars = 0;
    for (let i = 0; i < minLength; i++) {
      if (shorterReasoning[i] === longerReasoning[i]) {
        matchingChars++;
      } else {
        break;
      }
    }
    if (matchingChars >= shorterReasoning.length * 0.9) {
      if (text1.length < 10 && text2.length < 10) return true;
      if ((text1.length < 10 && text2.length >= 10) || (text1.length >= 10 && text2.length < 10)) {
        return true;
      }
      return true;
    }
  }
  
  // Handle very short reasoning (< 20 chars)
  if (shorterReasoning.length < 20 && shorterReasoning.length >= 10) {
    if (shorterReasoning === longerReasoning.substring(0, shorterReasoning.length)) {
      if (text1.length < 10 && text2.length < 10) return true;
      if ((text1.length < 10 && text2.length >= 10) || (text1.length >= 10 && text2.length < 10)) {
        return true;
      }
    }
  }
  
  // Check reasoning signature
  const sig1 = getReasoningSignature(reasoning1);
  const sig2 = getReasoningSignature(reasoning2);
  if (sig1 && sig2 && sig1 === sig2) {
    return true;
  }
  
  // High similarity check
  const similarityThreshold = hasLongReasoning ? 0.9 : 0.8;
  if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= longerReasoning.length * similarityThreshold) {
    const shorterText = text1.length < text2.length ? text1 : text2;
    const longerText = text1.length >= text2.length ? text1 : text2;
    if (longerText.startsWith(shorterText) && shorterText.length >= longerText.length * 0.5) {
      return true;
    }
    if (shorterText.length < 10 && longerText.length >= 10) {
      return true;
    }
  }
  
  // Adaptive prefix comparison
  const reasoningLength = Math.min(reasoning1.length, reasoning2.length);
  const prefixLength = reasoningLength >= 200 ? 200 : (reasoningLength >= 100 ? 100 : reasoningLength);
  const prefix1 = getReasoningPrefix(reasoning1, prefixLength);
  const prefix2 = getReasoningPrefix(reasoning2, prefixLength);
  const minPrefixLength = reasoningLength >= 100 ? 100 : Math.max(20, Math.floor(reasoningLength * 0.8));
  
  if (prefix1.length >= minPrefixLength && prefix2.length >= minPrefixLength) {
    if (prefix1 === prefix2) return true;
    
    const shorterPrefix = prefix1.length < prefix2.length ? prefix1 : prefix2;
    const longerPrefix = prefix1.length >= prefix2.length ? prefix1 : prefix2;
    if (longerPrefix.startsWith(shorterPrefix) && shorterPrefix.length >= longerPrefix.length * 0.8) {
      return true;
    }
    
    if (shorterPrefix.length < 100) {
      let matchingChars = 0;
      const minLen = Math.min(shorterPrefix.length, longerPrefix.length);
      for (let i = 0; i < minLen; i++) {
        if (shorterPrefix[i] === longerPrefix[i]) {
          matchingChars++;
        } else {
          break;
        }
      }
      if (matchingChars >= shorterPrefix.length * 0.85) {
        return true;
      }
    }
  }
  
  return false;
}

// ============================================
// Text Comparison Logic
// ============================================

/**
 * Check if two text strings are similar (exact match, prefix, or high similarity)
 */
function compareText(text1: string, text2: string, threshold: number = 0.7): boolean {
  // Exact match
  if (text1 === text2) {
    return true;
  }
  
  const shorter = text1.length < text2.length ? text1 : text2;
  const longer = text1.length >= text2.length ? text1 : text2;
  
  // Prefix check
  if (longer.startsWith(shorter) && shorter.length >= longer.length * threshold) {
    return true;
  }
  
  // High similarity
  if (shorter.length >= longer.length * threshold && longer.includes(shorter)) {
    return true;
  }
  
  // Common prefix check (for longer messages)
  const minLength = Math.min(text1.length, text2.length);
  if (minLength >= 50) {
    let commonPrefixLength = 0;
    for (let i = 0; i < minLength; i++) {
      if (text1[i] === text2[i]) {
        commonPrefixLength++;
      } else {
        break;
      }
    }
    const prefixThreshold = Math.max(threshold, 0.85);
    if (commonPrefixLength >= shorter.length * prefixThreshold) {
      return true;
    }
  }
  
  return false;
}

// ============================================
// Main Duplicate Detection
// ============================================

/**
 * Check if two messages are duplicates (same content, different stop text)
 */
function areDuplicates(msg1: QurseMessage, msg2: QurseMessage, threshold: number = 0.7): boolean {
  const text1 = getTextContent(msg1);
  const text2 = getTextContent(msg2);
  const reasoning1 = getReasoningContent(msg1);
  const reasoning2 = getReasoningContent(msg2);
  
  // Both have reasoning - check reasoning first (strongest indicator)
  if (reasoning1 && reasoning2 && (reasoning1.length > 50 || reasoning2.length > 50 || (reasoning1.length > 0 && reasoning2.length > 0))) {
    if (compareReasoning(reasoning1, reasoning2, text1, text2)) {
      return true;
    }
  }
  
  // One has reasoning, one doesn't
  if ((reasoning1 && !reasoning2) || (!reasoning1 && reasoning2)) {
    const reasoning = reasoning1 || reasoning2;
    if (reasoning && reasoning.length > 20) {
      if (text1.length >= 10 && text2.length >= 10) {
        const shorter = text1.length < text2.length ? text1 : text2;
        const longer = text1.length >= text2.length ? text1 : text2;
        if (longer.startsWith(shorter) && shorter.length >= longer.length * 0.7) {
          return true;
        }
      }
    }
  }
  
  // One has text, one doesn't (stop text case)
  if ((text1.length < 10 && text2.length >= 10) || (text1.length >= 10 && text2.length < 10)) {
    if (reasoning1 && reasoning2) {
      if (reasoning1 === reasoning2) return true;
      
      const minReasoningLength = Math.min(reasoning1.length, reasoning2.length);
      const similarityThreshold = minReasoningLength > 50 ? 0.9 : 0.8;
      const shorterReasoning = reasoning1.length < reasoning2.length ? reasoning1 : reasoning2;
      const longerReasoning = reasoning1.length >= reasoning2.length ? reasoning1 : reasoning2;
      if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= longerReasoning.length * similarityThreshold) {
        return true;
      }
    } else if (reasoning1 || reasoning2) {
      const reasoning = reasoning1 || reasoning2;
      if (reasoning && reasoning.length > 20) {
        const textWithContent = text1.length >= 10 ? text1 : text2;
        if (textWithContent.length >= 20) {
          return true;
        }
      }
    }
  }
  
  // Both text are short - check reasoning
  if (text1.length < 10 && text2.length < 10) {
    if (reasoning1 && reasoning2) {
      if (reasoning1 === reasoning2) return true;
      
      if (reasoning1.length > 0 && reasoning2.length > 0) {
        const shorterReasoning = reasoning1.length < reasoning2.length ? reasoning1 : reasoning2;
        const longerReasoning = reasoning1.length >= reasoning2.length ? reasoning1 : reasoning2;
        
        if (shorterReasoning.length < 50) {
          if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= 10) {
            return true;
          }
          if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= longerReasoning.length * 0.8) {
            return true;
          }
          
          const minLen = Math.min(shorterReasoning.length, longerReasoning.length);
          if (minLen >= 10) {
            let matchingChars = 0;
            for (let i = 0; i < minLen; i++) {
              if (shorterReasoning[i] === longerReasoning[i]) {
                matchingChars++;
              } else {
                break;
              }
            }
            if (matchingChars >= shorterReasoning.length * 0.8) {
              return true;
            }
          }
        } else {
          if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= longerReasoning.length * 0.8) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  // Text comparison (fallback)
  return compareText(text1, text2, threshold);
}

// ============================================
// Consecutive Message Checks
// ============================================

/**
 * Check if two consecutive messages share significant prefix
 */
function checkConsecutivePrefix(
  message1: QurseMessage,
  message2: QurseMessage
): { hasTextPrefix: boolean; hasReasoningPrefix: boolean } {
  const text1 = getTextContent(message1);
  const text2 = getTextContent(message2);
  const reasoning1 = getReasoningContent(message1);
  const reasoning2 = getReasoningContent(message2);
  
  let hasTextPrefix = false;
  let hasReasoningPrefix = false;
  
  // Check text prefix
  const text1Prefix = text1.substring(0, 100);
  const text2Prefix = text2.substring(0, 100);
  if (text1Prefix.length >= 50 && text2Prefix.length >= 50) {
    const minPrefix = Math.min(text1Prefix.length, text2Prefix.length);
    let matchingChars = 0;
    for (let k = 0; k < minPrefix; k++) {
      if (text1Prefix[k] === text2Prefix[k]) matchingChars++;
    }
    hasTextPrefix = matchingChars >= minPrefix * 0.8;
  }
  
  // Check reasoning prefix
  if (reasoning1 && reasoning2 && reasoning1.length >= 50 && reasoning2.length >= 50) {
    const reasoning1Prefix = reasoning1.substring(0, Math.min(100, reasoning1.length));
    const reasoning2Prefix = reasoning2.substring(0, Math.min(100, reasoning2.length));
    if (reasoning1Prefix === reasoning2Prefix) {
      hasReasoningPrefix = true;
    } else {
      const minPrefix = Math.min(reasoning1Prefix.length, reasoning2Prefix.length);
      let matchingChars = 0;
      for (let k = 0; k < minPrefix; k++) {
        if (reasoning1Prefix[k] === reasoning2Prefix[k]) matchingChars++;
      }
      hasReasoningPrefix = matchingChars >= minPrefix * 0.8;
    }
  }
  
  return { hasTextPrefix, hasReasoningPrefix };
}

// ============================================
// Main Deduplication Function
// ============================================

/**
 * Deduplicate messages by removing duplicate assistant messages
 * Keeps messages with stop text, removes full duplicates
 */
export function deduplicateMessages(messages: QurseMessage[]): QurseMessage[] {
  if (messages.length === 0) return messages;
  
  const deduplicated: QurseMessage[] = [];
  const skipIndices = new Set<number>();
  const MAX_LOOKAHEAD = 5; // Only check up to 5 messages ahead
  
  for (let i = 0; i < messages.length; i++) {
    // Skip if already marked for removal
    if (skipIndices.has(i)) continue;
    
    const message = messages[i];
    
    // Always include user messages
    if (message.role !== 'assistant') {
      deduplicated.push(message);
      continue;
    }
    
    const messageText = message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('') || '';
    
    const hasStopText = messageText.includes('*User stopped this message here*');
    
    // Check if this message has a duplicate later in the array
    for (let j = i + 1; j < messages.length && j - i <= MAX_LOOKAHEAD; j++) {
      if (skipIndices.has(j)) continue;
      
      const otherMessage = messages[j];
      
      // Only check assistant messages
      if (otherMessage.role !== 'assistant') continue;
      
      const otherText = otherMessage.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text)
        .join('') || '';
      
      const otherHasStopText = otherText.includes('*User stopped this message here*');
      
      // Only deduplicate if they have different stop text status
      if (hasStopText === otherHasStopText) continue;
      
      // Check if they're consecutive (or very close)
      const isConsecutive = j - i <= 2;
      const { hasTextPrefix, hasReasoningPrefix } = isConsecutive
        ? checkConsecutivePrefix(message, otherMessage)
        : { hasTextPrefix: false, hasReasoningPrefix: false };
      
      // Check if they're duplicates
      const shouldDeduplicate = areDuplicates(message, otherMessage) ||
        (isConsecutive && hasTextPrefix) ||
        (isConsecutive && hasReasoningPrefix);
      
      if (shouldDeduplicate) {
        // Keep the one with stop text, skip the one without
        if (hasStopText) {
          skipIndices.add(j);
        } else {
          skipIndices.add(i);
          break; // Don't add this message, move to next
        }
      }
    }
    
    // Add message if not skipped
    if (!skipIndices.has(i)) {
      deduplicated.push(message);
    }
  }
  
  return deduplicated;
}

