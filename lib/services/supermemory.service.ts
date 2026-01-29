/**
 * Supermemory Service
 * Handles long-term memory storage and retrieval for authenticated users
 */

import Supermemory from 'supermemory';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/supermemory');

// Initialize Supermemory client
const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY,
});

/**
 * User memory context returned from Supermemory
 */
export interface UserMemoryContext {
  /** Long-term facts about the user */
  static: string[];
  /** Recent context and activity */
  dynamic: string[];
  /** Relevant memories from semantic search */
  memories: string[];
}

/**
 * Fetch user's memory context including profile and relevant memories
 *
 * @param userId - The user's ID from Supabase
 * @param userMessage - The user's current message for semantic search
 * @returns User memory context with static facts, dynamic context, and relevant memories
 */
export async function getUserMemoryContext(
  userId: string,
  userMessage: string
): Promise<UserMemoryContext> {
  try {
    const containerTag = `user_${userId}`;

    // Single API call gets: profile + search results
    const { profile, searchResults } = await client.profile({
      containerTag,
      q: userMessage, // Search for relevant memories
    });

    // Extract memories from search results
    const memories = searchResults?.results
      ?.map((r: unknown) => (r as { memory?: string }).memory)
      .filter((m): m is string => typeof m === 'string' && m.length > 0) || [];

    logger.debug('Memory context fetched', {
      userId,
      staticCount: profile.static.length,
      dynamicCount: profile.dynamic.length,
      memoriesCount: memories.length,
    });

    return {
      static: profile.static,
      dynamic: profile.dynamic,
      memories,
    };
  } catch (error) {
    // Log but don't throw - memory failure shouldn't break chat
    logger.warn('Failed to fetch memory context', { error: error as Error, userId });
    // Return empty context on failure
    return {
      static: [],
      dynamic: [],
      memories: [],
    };
  }
}

/**
 * Save a conversation to Supermemory for future context
 *
 * @param userId - The user's ID from Supabase
 * @param userMessage - The user's message text
 * @param aiResponse - The AI's response text
 */
export async function saveConversation(
  userId: string,
  userMessage: string,
  aiResponse: string
): Promise<void> {
  try {
    const containerTag = `user_${userId}`;

    // Format conversation for storage
    const content = `user: ${userMessage}\nassistant: ${aiResponse}`;

    logger.info('Saving conversation to Supermemory', {
      userId,
      containerTag,
      contentLength: content.length,
    });

    const result = await client.add({
      content,
      containerTag,
      metadata: {
        timestamp: new Date().toISOString(),
        type: 'conversation',
        source: 'qurse',
      },
    });

    logger.info('Conversation saved to memory successfully', {
      userId,
      result,
    });
  } catch (error) {
    // Log but don't throw - memory save failure shouldn't break chat
    logger.error('Failed to save conversation to memory', {
      error: error as Error,
      userId,
      errorMessage: (error as Error).message,
      errorStack: (error as Error).stack,
    });
  }
}

/**
 * Check if Supermemory is properly configured
 */
export function isSupermemoryConfigured(): boolean {
  const configured = Boolean(process.env.SUPERMEMORY_API_KEY);
  logger.info('Supermemory configuration check', {
    configured,
    hasKey: !!process.env.SUPERMEMORY_API_KEY,
    keyPrefix: process.env.SUPERMEMORY_API_KEY?.substring(0, 10),
  });
  return configured;
}
