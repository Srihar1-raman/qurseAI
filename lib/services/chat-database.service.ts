/**
 * Chat Database Service
 * Handles all database operations for chat messages and conversations
 */

import type { UIMessage } from 'ai';
import { ensureConversationServerSide, checkConversationAccess } from '@/lib/db/queries.server';
import { saveUserMessageServerSide } from '@/lib/db/messages.server';
import { ensureGuestConversation } from '@/lib/db/guest-conversations.server';
import { saveGuestMessage, getGuestMessageCount } from '@/lib/db/guest-messages.server';
import { generateConversationTitle } from './title-generation.service';
import { createScopedLogger } from '@/lib/utils/logger';
import type { User } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const logger = createScopedLogger('services/chat-database');

/**
 * Configuration for chat database operations
 */
export interface DatabaseOperationsConfig {
  /** Conversation ID (undefined for new conversations) */
  conversationId: string | undefined;
  /** Authenticated user (null for guests) */
  user: User | null;
  /** Guest session hash */
  sessionHash?: string;
  /** Last user message to save */
  lastUserMessage: UIMessage | null;
  /** Title for conversation */
  title: string;
  /** User message text for title generation */
  userMessageText: string;
  /** Supabase client for database operations */
  supabaseClient: SupabaseClient;
}

/**
 * Result of database operations
 */
export interface DatabaseOperationsResult {
  /** Resolved conversation ID (may be new) */
  resolvedConversationId: string;
  /** Whether message save was successful */
  saveSuccess: boolean;
}

/**
 * Handle all database operations for chat message
 * - Ensures conversation exists
 * - Saves user message
 * - Triggers title generation if needed
 *
 * @param config - Database operations configuration
 * @returns Database operation result with conversation ID
 */
export async function handleChatDatabaseOperations(
  config: DatabaseOperationsConfig
): Promise<DatabaseOperationsResult> {
  const {
    conversationId,
    user,
    sessionHash,
    lastUserMessage,
    title,
    userMessageText,
    supabaseClient,
  } = config;

  // Authenticated flow
  if (user && conversationId && lastUserMessage) {
    return handleAuthenticatedDatabaseOperations({
      conversationId,
      user,
      lastUserMessage,
      title,
      userMessageText,
      supabaseClient,
    });
  }

  // Guest flow
  if (!user && sessionHash && lastUserMessage) {
    return handleGuestDatabaseOperations({
      conversationId,
      sessionHash,
      lastUserMessage,
      title,
      userMessageText,
    });
  }

  // Fallback: no valid flow
  logger.warn('No valid database flow', { hasUser: !!user, hasSessionHash: !!sessionHash, conversationId });
  return {
    resolvedConversationId: conversationId || '',
    saveSuccess: false,
  };
}

/**
 * Handle database operations for authenticated users
 */
async function handleAuthenticatedDatabaseOperations(config: {
  conversationId: string;
  user: User;
  lastUserMessage: UIMessage;
  title: string;
  userMessageText: string;
  supabaseClient: SupabaseClient;
}): Promise<DatabaseOperationsResult> {
  const { conversationId, user, lastUserMessage, title, userMessageText, supabaseClient } = config;

  // Check if conversation exists before creating/validating
  if (!user.id) {
    logger.error('User ID is required for authenticated flow', { userId: user.id });
    return {
      resolvedConversationId: conversationId,
      saveSuccess: false,
    };
  }

  const accessCheck = await checkConversationAccess(conversationId, user.id, supabaseClient);
  const isNewConversation = !accessCheck.exists;

  logger.debug('Title generation check', {
    conversationId,
    isNewConversation,
    dbHasMessages: accessCheck.exists,
  });

  // Ensure conversation exists
  await ensureConversationServerSide(conversationId, user.id, title, supabaseClient);

  // Generate title for first message if needed (FIX: Use database state, not request payload)
  generateConversationTitle({
    conversationId,
    userMessage: lastUserMessage,
    userMessageText,
    isFirstMessage: isNewConversation,
    supabaseClient,
    isGuest: false,
  });

  // Save user message
  const saveSuccess = await saveUserMessageServerSide(conversationId, lastUserMessage, supabaseClient);

  if (!saveSuccess) {
    logger.error('Failed to save user message', undefined, { conversationId });
  }

  return {
    resolvedConversationId: conversationId,
    saveSuccess,
  };
}

/**
 * Handle database operations for guest users
 */
async function handleGuestDatabaseOperations(config: {
  conversationId: string | undefined;
  sessionHash: string;
  lastUserMessage: UIMessage;
  title: string;
  userMessageText: string;
}): Promise<DatabaseOperationsResult> {
  const { conversationId, sessionHash, lastUserMessage, title, userMessageText } = config;

  // Ensure guest conversation exists
  const guestConversationId = await ensureGuestConversation(sessionHash, title, conversationId);

  // Check database for existing messages BEFORE saving (FIX: Use database count, not request payload)
  const messageCount = await getGuestMessageCount(guestConversationId);
  const isFirstMessage = messageCount === 0;

  // Save guest message
  await saveGuestMessage({
    conversationId: guestConversationId,
    message: lastUserMessage,
    role: 'user',
    sessionHash,
  });

  // Generate title for first guest message if needed
  generateConversationTitle({
    conversationId: guestConversationId,
    userMessage: lastUserMessage,
    userMessageText,
    isFirstMessage,
    supabaseClient: null as any, // Not used for guest flow
    isGuest: true,
  });

  return {
    resolvedConversationId: guestConversationId,
    saveSuccess: true,
  };
}
