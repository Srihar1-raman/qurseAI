/**
 * Conversation thread component
 * Renders message list, loading indicators, and error messages
 */

import React from 'react';
import ChatMessage from '@/components/chat/ChatMessage';
import type { QurseMessage } from '@/lib/types';
import type { ConversationThreadProps } from './types';

/**
 * Deduplicate messages before display
 * Removes duplicate assistant messages where one has stop text and one doesn't
 * Only removes duplicates if they have similar content (same message, different completion state)
 * 
 * Algorithm: For each assistant message, check if there's a duplicate with similar content.
 * If one has stop text and one doesn't, and they share significant content overlap, keep the one with stop text.
 */
function deduplicateMessages(messages: QurseMessage[]): QurseMessage[] {
  if (messages.length === 0) return messages;
  
  const deduplicated: QurseMessage[] = [];
  const skipIndices = new Set<number>();
  
  // Helper to extract text content without stop text
  const getTextContent = (msg: QurseMessage): string => {
    return msg.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
      .replace(/\*User stopped this message here\*/g, '')
      .replace(/\s+/g, ' ') // Normalize whitespace (multiple spaces/newlines to single space)
      .trim() || '';
  };
  
  // Helper to extract reasoning content
  // Note: Uses parts column (content column will be deprecated)
  const getReasoningContent = (msg: QurseMessage): string => {
    const reasoningParts = msg.parts
      ?.filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning' && typeof p.text === 'string')
      .map((p) => p.text) || [];
    
    if (reasoningParts.length === 0) return '';
    
    // Join all reasoning parts and normalize whitespace aggressively
    // This handles cases where reasoning might be split across multiple parts
    return reasoningParts
      .join(' ')
      .replace(/\s+/g, ' ') // Normalize all whitespace to single space
      .trim();
  };
  
  // Helper to get reasoning prefix (first N chars) for comparison
  // This is useful when one reasoning is complete and one is truncated (streaming vs done)
  const getReasoningPrefix = (reasoning: string, length: number = 200): string => {
    if (!reasoning || reasoning.length === 0) return '';
    return reasoning.substring(0, Math.min(length, reasoning.length)).replace(/\s+/g, ' ').trim();
  };
  
  // Helper to create a normalized reasoning signature for comparison
  // This helps catch cases where reasoning is the same but formatted differently
  const getReasoningSignature = (reasoning: string): string => {
    if (!reasoning || reasoning.length < 10) return '';
    // Take first 200 chars and last 200 chars, normalize, and combine
    // This catches cases where reasoning is the same but middle parts differ slightly
    const firstPart = reasoning.substring(0, Math.min(200, reasoning.length)).replace(/\s+/g, ' ').trim();
    const lastPart = reasoning.length > 200 
      ? reasoning.substring(reasoning.length - 200).replace(/\s+/g, ' ').trim()
      : '';
    return firstPart + (lastPart ? '|' + lastPart : '');
  };
  
  // Helper to check if two messages are duplicates (same content, different stop text)
  // threshold: similarity threshold (0.5 = 50%, 0.7 = 70%, etc.)
  const areDuplicates = (msg1: QurseMessage, msg2: QurseMessage, threshold: number = 0.7): boolean => {
    const text1 = getTextContent(msg1);
    const text2 = getTextContent(msg2);
    const reasoning1 = getReasoningContent(msg1);
    const reasoning2 = getReasoningContent(msg2);
    
    // If both have reasoning, check if reasoning matches first (strong indicator of duplicates)
    // Check for both long (>50 chars) and short reasoning
    const hasLongReasoning = reasoning1 && reasoning2 && reasoning1.length > 50 && reasoning2.length > 50;
    const hasShortReasoning = reasoning1 && reasoning2 && reasoning1.length > 0 && reasoning2.length > 0;
    
    if (hasLongReasoning || hasShortReasoning) {
      // If reasoning is identical (after normalization), they're duplicates regardless of text
      if (reasoning1 === reasoning2) {
        // Reasoning matches exactly - they're duplicates regardless of text
        // One might have full text, the other might only have stop text (empty after removal)
        // This handles the case where Response 1 has full text and Response 2 only has stop text
        return true;
      }
      
      // CRITICAL: Handle truncated reasoning (one complete, one streaming/truncated)
      // If one reasoning is a prefix of the other, they're duplicates
      // This handles: Message 1 has complete reasoning (state: "done"), Message 2 has truncated (state: "streaming")
      const shorterReasoning = reasoning1.length < reasoning2.length ? reasoning1 : reasoning2;
      const longerReasoning = reasoning1.length >= reasoning2.length ? reasoning1 : reasoning2;
      
      // If shorter reasoning is a prefix of longer (and shorter is substantial), they're duplicates
      // This catches: truncated reasoning (200 chars) vs complete reasoning (500 chars)
      if (shorterReasoning.length >= 100 && longerReasoning.startsWith(shorterReasoning)) {
        // Shorter is a prefix of longer - they're duplicates
        // One might be complete, one might be truncated (streaming state)
        return true;
      }
      
      // Handle shorter reasoning (< 100 chars): if one is a prefix of the other and they share significant overlap
      if (shorterReasoning.length >= 50 && shorterReasoning.length < 100) {
        // For shorter reasoning, be more lenient - check if longer starts with shorter
        if (longerReasoning.startsWith(shorterReasoning)) {
          // Shorter is a prefix of longer - they're duplicates
          return true;
        }
        // Or if they share 80%+ of the shorter reasoning as a prefix
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
          // If 80%+ of shorter reasoning matches as prefix, they're duplicates
          if (matchingChars >= shorterReasoning.length * 0.8) {
            return true;
          }
        }
      }
      
      // Handle very short reasoning (< 50 chars): if they're identical or very similar
      if (shorterReasoning.length < 50 && shorterReasoning.length >= 20) {
        // For very short reasoning, exact match or 90%+ similarity
        if (shorterReasoning === longerReasoning.substring(0, shorterReasoning.length)) {
          // Reasoning matches - check if text is also short (both might be minimal)
          // If text is short too, still consider duplicates if reasoning matches
          if (text1.length < 10 && text2.length < 10) {
            // Both reasoning and text are short - if reasoning matches, they're duplicates
            return true;
          }
          // If reasoning matches, they're duplicates regardless of text length
          return true;
        }
        // Or if they share 90%+ similarity
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
          // Reasoning is very similar - if text is also short, they're duplicates
          if (text1.length < 10 && text2.length < 10) {
            return true;
          }
          // Or if one text is empty and reasoning matches
          if ((text1.length < 10 && text2.length >= 10) || (text1.length >= 10 && text2.length < 10)) {
            return true;
          }
          return true;
        }
      }
      
      // Special case: Very short reasoning (< 20 chars) + short text
      // This handles edge cases where both are minimal
      if (shorterReasoning.length < 20 && shorterReasoning.length >= 10) {
        // If reasoning matches exactly and text is also short/empty, they're duplicates
        if (shorterReasoning === longerReasoning.substring(0, shorterReasoning.length)) {
          // Reasoning matches - if text is also short, they're duplicates
          if (text1.length < 10 && text2.length < 10) {
            return true;
          }
          // Or if one has text and one doesn't (stop text case)
          if ((text1.length < 10 && text2.length >= 10) || (text1.length >= 10 && text2.length < 10)) {
            return true;
          }
        }
      }
      
      // Check reasoning signature (first + last parts) for cases where middle differs slightly
      const sig1 = getReasoningSignature(reasoning1);
      const sig2 = getReasoningSignature(reasoning2);
      if (sig1 && sig2 && sig1 === sig2) {
        // Reasoning signatures match - they're duplicates
        return true;
      }
      
      // If reasoning is very similar (90%+ match), they're likely duplicates
      // For long reasoning, use 90% threshold; for short, use 80% threshold
      const similarityThreshold = hasLongReasoning ? 0.9 : 0.8;
      if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= longerReasoning.length * similarityThreshold) {
        // Reasoning is very similar - check text similarity
        const shorterText = text1.length < text2.length ? text1 : text2;
        const longerText = text1.length >= text2.length ? text1 : text2;
        if (longerText.startsWith(shorterText) && shorterText.length >= longerText.length * 0.5) {
          return true;
        }
        // If one text is empty/short and reasoning matches, still consider duplicates
        if (shorterText.length < 10 && longerText.length >= 10) {
          return true;
        }
      }
      
      // Additional check: if reasoning shares significant common prefix
      // This catches cases where reasoning starts the same but one is truncated
      // Use adaptive length based on reasoning size
      const reasoningLength = Math.min(reasoning1.length, reasoning2.length);
      const prefixLength = reasoningLength >= 200 ? 200 : (reasoningLength >= 100 ? 100 : reasoningLength);
      
      const prefix1 = getReasoningPrefix(reasoning1, prefixLength);
      const prefix2 = getReasoningPrefix(reasoning2, prefixLength);
      
      // For longer reasoning (>= 100 chars), require 100+ char prefix match
      // For shorter reasoning (< 100 chars), use the full reasoning length
      const minPrefixLength = reasoningLength >= 100 ? 100 : Math.max(20, Math.floor(reasoningLength * 0.8));
      
      if (prefix1.length >= minPrefixLength && prefix2.length >= minPrefixLength) {
        // Compare prefixes - if they match, they're duplicates (one might be truncated)
        if (prefix1 === prefix2) {
          return true;
        }
        // Or if one is a prefix of the other (80%+ match)
        const shorterPrefix = prefix1.length < prefix2.length ? prefix1 : prefix2;
        const longerPrefix = prefix1.length >= prefix2.length ? prefix1 : prefix2;
        if (longerPrefix.startsWith(shorterPrefix) && shorterPrefix.length >= longerPrefix.length * 0.8) {
          return true;
        }
        // For shorter reasoning, also check character-by-character similarity
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
          // If 85%+ of shorter prefix matches, they're duplicates
          if (matchingChars >= shorterPrefix.length * 0.85) {
            return true;
          }
        }
      }
    }
    
    // Handle case where only ONE has reasoning (Gap 1 fix)
    if ((reasoning1 && !reasoning2) || (!reasoning1 && reasoning2)) {
      const reasoning = reasoning1 || reasoning2;
      // If one has reasoning and one text is empty, check if reasoning matches the other's context
      // This is a weaker match, so require text similarity too
      if (reasoning && reasoning.length > 20) {
        // One has reasoning, one doesn't - check text similarity
        if (text1.length >= 10 && text2.length >= 10) {
          // Both have text - use text comparison
          const shorter = text1.length < text2.length ? text1 : text2;
          const longer = text1.length >= text2.length ? text1 : text2;
          if (longer.startsWith(shorter) && shorter.length >= longer.length * 0.7) {
            return true;
          }
        }
      }
    }
    
    // Handle case where one message has full text and the other only has stop text (empty after removal)
    // If one is empty/short and the other has content, check if reasoning matches
    if ((text1.length < 10 && text2.length >= 10) || (text1.length >= 10 && text2.length < 10)) {
      // One has text, one doesn't - check if reasoning matches (both or one-sided)
      if (reasoning1 && reasoning2) {
        // Both have reasoning
        if (reasoning1 === reasoning2) {
          return true; // Reasoning matches, they're duplicates
        }
        // Check for high similarity (lower threshold for shorter reasoning)
        const minReasoningLength = Math.min(reasoning1.length, reasoning2.length);
        const similarityThreshold = minReasoningLength > 50 ? 0.9 : 0.8;
        const shorterReasoning = reasoning1.length < reasoning2.length ? reasoning1 : reasoning2;
        const longerReasoning = reasoning1.length >= reasoning2.length ? reasoning1 : reasoning2;
        if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= longerReasoning.length * similarityThreshold) {
          return true;
        }
      } else if (reasoning1 || reasoning2) {
        // Only one has reasoning - if reasoning is substantial, consider it a match
        const reasoning = reasoning1 || reasoning2;
        if (reasoning.length > 20) {
          // One has reasoning, one doesn't - if the one with text is similar to reasoning context, match
          const textWithContent = text1.length >= 10 ? text1 : text2;
          // If text is substantial and reasoning exists, likely duplicates
          if (textWithContent.length >= 20) {
            return true;
          }
        }
      }
    }
    
    // If both are empty or very short, they're not duplicates (unless reasoning matches)
    if (text1.length < 10 && text2.length < 10) {
      // Both text are very short - check if reasoning matches (any length)
      if (reasoning1 && reasoning2) {
        // Exact match
        if (reasoning1 === reasoning2) {
          return true;
        }
        
        // Check for similarity even with short reasoning
        if (reasoning1.length > 0 && reasoning2.length > 0) {
          const shorterReasoning = reasoning1.length < reasoning2.length ? reasoning1 : reasoning2;
          const longerReasoning = reasoning1.length >= reasoning2.length ? reasoning1 : reasoning2;
          
          // For short reasoning (< 50 chars), be more lenient
          if (shorterReasoning.length < 50) {
            // If shorter is a prefix of longer (even if very short), they're duplicates
            if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= 10) {
              return true;
            }
            // Or if they share 80%+ similarity
            if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= longerReasoning.length * 0.8) {
              return true;
            }
            // Character-by-character check for very short reasoning
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
              // If 80%+ of shorter matches, they're duplicates
              if (matchingChars >= shorterReasoning.length * 0.8) {
                return true;
              }
            }
          } else {
            // For longer reasoning, use standard 80% threshold
            if (longerReasoning.startsWith(shorterReasoning) && shorterReasoning.length >= longerReasoning.length * 0.8) {
              return true;
            }
          }
        }
      }
      // If only one has reasoning and both text are short, not duplicates
      return false;
    }
    
    // First check: exact match (after removing stop text, they're identical)
    if (text1 === text2) {
      return true;
    }
    
    // Second check: one is a prefix of the other (same message, different completion)
    const shorter = text1.length < text2.length ? text1 : text2;
    const longer = text1.length >= text2.length ? text1 : text2;
    
    // If shorter is at least threshold% of longer and longer starts with shorter, they're duplicates
    if (longer.startsWith(shorter) && shorter.length >= longer.length * threshold) {
      return true;
    }
    
    // Third check: high similarity (for cases where there might be minor differences)
    // Calculate how much of the shorter text is contained in the longer text
    if (shorter.length >= longer.length * threshold && longer.includes(shorter)) {
      return true;
    }
    
    // Fourth check: check if they share a significant common prefix
    // This handles cases where messages are nearly identical but one has slight differences
    const minLength = Math.min(text1.length, text2.length);
    if (minLength >= 50) { // Only for longer messages
      let commonPrefixLength = 0;
      for (let i = 0; i < minLength; i++) {
        if (text1[i] === text2[i]) {
          commonPrefixLength++;
        } else {
          break;
        }
      }
      // If threshold% of the shorter message is a common prefix, they're duplicates
      const prefixThreshold = Math.max(threshold, 0.85); // At least 85% for prefix check
      if (commonPrefixLength >= shorter.length * prefixThreshold) {
        return true;
      }
    }
    
    return false;
  };
  
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
    // Only deduplicate if they have similar content AND different stop text status
    for (let j = i + 1; j < messages.length; j++) {
      if (skipIndices.has(j)) continue;
      
      const otherMessage = messages[j];
      
      // Only check assistant messages
      if (otherMessage.role !== 'assistant') continue;
      
      const otherText = otherMessage.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text)
        .join('') || '';
      
      const otherHasStopText = otherText.includes('*User stopped this message here*');
      
      // Special case: If messages are consecutive (or very close), be more aggressive
      const isConsecutive = j - i <= 2; // Allow 1-2 messages in between (in case of user message)
      
      // For consecutive messages, check if they share a significant prefix (first 100 chars)
      // This catches cases where messages are the same but comparison fails due to minor differences
      let hasSignificantPrefix = false;
      let hasMatchingReasoningPrefix = false;
      
      if (isConsecutive) {
        // Check text prefix
        const text1Prefix = getTextContent(message).substring(0, 100);
        const text2Prefix = getTextContent(otherMessage).substring(0, 100);
        if (text1Prefix.length >= 50 && text2Prefix.length >= 50) {
          // If first 100 chars match (or 80% similarity), they're likely duplicates
          const minPrefix = Math.min(text1Prefix.length, text2Prefix.length);
          let matchingChars = 0;
          for (let k = 0; k < minPrefix; k++) {
            if (text1Prefix[k] === text2Prefix[k]) matchingChars++;
          }
          hasSignificantPrefix = matchingChars >= minPrefix * 0.8;
        }
        
        // Check reasoning prefix for consecutive messages (very aggressive)
        const reasoning1 = getReasoningContent(message);
        const reasoning2 = getReasoningContent(otherMessage);
        if (reasoning1 && reasoning2 && reasoning1.length >= 50 && reasoning2.length >= 50) {
          // If first 100 chars of reasoning match, they're duplicates
          const reasoning1Prefix = reasoning1.substring(0, Math.min(100, reasoning1.length));
          const reasoning2Prefix = reasoning2.substring(0, Math.min(100, reasoning2.length));
          if (reasoning1Prefix === reasoning2Prefix) {
            hasMatchingReasoningPrefix = true;
          } else {
            // Check 80% similarity
            const minPrefix = Math.min(reasoning1Prefix.length, reasoning2Prefix.length);
            let matchingChars = 0;
            for (let k = 0; k < minPrefix; k++) {
              if (reasoning1Prefix[k] === reasoning2Prefix[k]) matchingChars++;
            }
            hasMatchingReasoningPrefix = matchingChars >= minPrefix * 0.8;
          }
        }
      }
      
      // Only deduplicate if:
      // 1. They have different stop text status (one stopped, one not)
      // 2. They have similar content (same message, different completion)
      // OR if they're consecutive and share significant prefix (more aggressive for consecutive messages)
      const shouldDeduplicate = hasStopText !== otherHasStopText && (
        areDuplicates(message, otherMessage) || 
        (isConsecutive && hasSignificantPrefix) || // Consecutive + significant text prefix = likely duplicates
        (isConsecutive && hasMatchingReasoningPrefix) // Consecutive + matching reasoning prefix = duplicates
      );
      
      if (shouldDeduplicate) {
        // They're duplicates - keep the one with stop text, skip the one without
        if (hasStopText) {
          // This one has stop text, skip the other one (full message)
          skipIndices.add(j);
        } else {
          // Other has stop text, skip this one (full message)
          skipIndices.add(i);
          break; // Don't add this message, move to next
        }
      }
      
      // If we've checked a few messages ahead and they're not duplicates, stop looking
      // This optimizes performance and prevents false matches with later different messages
      // Only check up to 5 messages ahead (to catch duplicates that might be separated by user messages)
      if (j - i > 5) {
        break;
      }
    }
    
    // Add message if not skipped
    if (!skipIndices.has(i)) {
      deduplicated.push(message);
    }
  }
  
  return deduplicated;
}

function ConversationThreadComponent({
  messages,
  isLoading,
  isLoadingOlderMessages,
  hasMoreMessages,
  error,
  isRateLimited,
  selectedModel,
  conversationEndRef,
  conversationContainerRef,
  conversationThreadRef,
  onShare,
  user,
  isStreaming = false,
}: ConversationThreadProps) {
  // Layer 3: Deduplicate messages before rendering
  const deduplicatedMessages = React.useMemo(
    () => deduplicateMessages(messages),
    [messages]
  );
  
  return (
    <div ref={conversationContainerRef} className="conversation-container">
      <div ref={conversationThreadRef} className="conversation-thread">
        {isLoadingOlderMessages && hasMoreMessages && (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
            }}
          >
            Loading older messages...
          </div>
        )}

        {deduplicatedMessages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isUser={message.role === 'user'}
            model={selectedModel}
            onShare={onShare}
            user={user}
            isStreaming={isStreaming && index === deduplicatedMessages.length - 1} // Only last message streams
          />
        ))}

        {isLoading && (
          <div className="message bot-message">
            <div style={{ maxWidth: '95%', marginRight: 'auto' }}>
              <div className="message-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: '50%',
                      animation: 'reasoning 2s infinite linear',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        animation: 'reasoningPulse 1s infinite ease-in-out',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '14px',
                      fontStyle: 'italic',
                    }}
                  >
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && !isRateLimited && (
          <div className="message bot-message">
            <div style={{ maxWidth: '95%', marginRight: 'auto' }}>
              <div className="message-content" style={{ color: 'var(--color-error)' }}>
                ❌ Error: {error.message}
              </div>
            </div>
          </div>
        )}

        <div ref={conversationEndRef} style={{ height: '1px', minHeight: '1px' }} />
      </div>
    </div>
  );
}

// Memoize to prevent Safari re-render flash - only re-render when content actually changes
export const ConversationThread = React.memo(ConversationThreadComponent, (prevProps, nextProps) => {
  // Only re-render if messages actually changed (by content, not reference)
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false; // Re-render
  }
  
  // Check if any message content changed
  for (let i = 0; i < prevProps.messages.length; i++) {
    const prevMsg = prevProps.messages[i];
    const nextMsg = nextProps.messages[i];
    
    if (prevMsg.id !== nextMsg.id) {
      return false; // Re-render
    }
    
    // Check if parts content changed
    const prevContent = prevMsg.parts?.map(p => ('text' in p ? p.text : '')).join('') || '';
    const nextContent = nextMsg.parts?.map(p => ('text' in p ? p.text : '')).join('') || '';
    
    if (prevContent !== nextContent) {
      return false; // Re-render
    }
  }
  
  // Check other props
  if (
    prevProps.isLoading !== nextProps.isLoading ||
    prevProps.isLoadingOlderMessages !== nextProps.isLoadingOlderMessages ||
    prevProps.hasMoreMessages !== nextProps.hasMoreMessages ||
    prevProps.isRateLimited !== nextProps.isRateLimited ||
    prevProps.selectedModel !== nextProps.selectedModel ||
    prevProps.error?.message !== nextProps.error?.message ||
    prevProps.user?.id !== nextProps.user?.id ||
    prevProps.isStreaming !== nextProps.isStreaming
  ) {
    return false; // Re-render
  }
  
  // Note: onShare is a function, so we don't compare it (functions are always different references)
  // This is fine - the share button will only show for authenticated users anyway
  
  // Props are equal - skip re-render
  return true;
});
