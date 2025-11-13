/**
 * Conversation Title Generation Utility
 * Generates smart, concise titles for conversations using AI
 * 
 * Unique approach: Focuses on creating conversation titles that are:
 * - Descriptive enough to identify the topic
 * - Concise enough to scan quickly
 * - Natural language that flows well
 */

import { generateText } from 'ai';
import { qurse } from '@/ai/providers';
import { createScopedLogger } from './logger';
import type { UIMessage } from 'ai';

const logger = createScopedLogger('convo-title-generation');

/**
 * Extract the core topic from a message
 * Identifies the main subject/question being discussed
 */
function extractCoreTopic(messageText: string): string {
  // Remove common question starters and filler words
  const cleaned = messageText
    .replace(/^(how|what|why|when|where|can|could|should|would|is|are|do|does|did)\s+/i, '')
    .replace(/\?+$/, '')
    .trim();
  
  // Take first sentence or first 100 chars, whichever is shorter
  const firstSentence = cleaned.split(/[.!?]\s+/)[0];
  return firstSentence.length <= 100 ? firstSentence : firstSentence.slice(0, 100);
}

/**
 * Generate a smart title from a user message
 * Uses a fast Groq model optimized for quick, accurate title generation
 * 
 * @param message - The user's first message (UIMessage format)
 * @returns Generated title (max 60 characters for better UI display)
 */
export async function generateTitleFromUserMessage({ 
  message 
}: { 
  message: UIMessage 
}): Promise<string> {
  try {
    // Extract text content from message parts
    const messageText = message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('') || '';

    if (!messageText.trim()) {
      logger.warn('Empty message text for title generation');
      return 'New Chat';
    }

    // Extract core topic for context (helps AI understand the focus)
    const coreTopic = extractCoreTopic(messageText);

    // Use fast Groq Llama model optimized for title generation
    // This model is specifically chosen for speed and accuracy in short text generation
    const { text: title } = await generateText({
      model: qurse.languageModel('llama-3.1-8b-instant'),
      system: `You are a conversation title specialist. Your job is to create short, scannable titles that help users quickly identify what a conversation is about.

Your titles should:
- Capture the main topic or question in 3-8 words
- Use natural, conversational language (not formal or academic)
- Be specific enough to distinguish from similar conversations
- Avoid generic words like "help", "question", "about" unless necessary
- Never include quotes, colons, or special formatting
- Stay under 60 characters for optimal display

Think of it like a newspaper headline - informative but concise.`,
      prompt: `Create a title for this conversation starter:

"${messageText}"

Core topic: ${coreTopic}

Title:`,
      temperature: 0.5, // Lower temperature for more consistent, focused titles
    });

    // Clean and normalize the title
    let cleanTitle = title
      .trim()
      // Remove common unwanted patterns
      .replace(/^["'`]|["'`]$/g, '') // Remove surrounding quotes
      .replace(/^title:?\s*/i, '') // Remove "Title:" prefix if AI added it
      .replace(/[:\-]\s*$/, '') // Remove trailing colons/dashes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Hard limit to 60 characters (better for UI than 80)
    cleanTitle = cleanTitle.slice(0, 60);

    // Validate the result
    if (!cleanTitle || cleanTitle.length < 3) {
      logger.warn('Generated title too short or empty', { originalTitle: title, cleanTitle });
      // Fallback: Use core topic or smart truncation
      const fallback = coreTopic.length > 0 && coreTopic.length <= 60 
        ? coreTopic 
        : messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '');
      return fallback || 'New Chat';
    }

    logger.debug('Title generated successfully', { 
      originalLength: messageText.length,
      coreTopicLength: coreTopic.length,
      titleLength: cleanTitle.length,
      title: cleanTitle
    });

    return cleanTitle;
  } catch (error) {
    logger.error('Error generating title', error, { messageId: message.id });
    
    // Fallback: Extract core topic or use smart truncation
    try {
      const messageText = message.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text)
        .join('') || '';
      
      if (messageText.trim()) {
        const coreTopic = extractCoreTopic(messageText);
        // Use core topic if it's reasonable length, otherwise truncate
        if (coreTopic.length > 0 && coreTopic.length <= 60) {
          return coreTopic;
        }
        return messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '');
      }
    } catch (fallbackError) {
      logger.error('Fallback title generation also failed', fallbackError);
    }
    
    return 'New Chat';
  }
}


