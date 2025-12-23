/**
 * Title Generation Service
 * Handles AI-powered title generation for conversations
 */

import { after } from 'next/server';
import type { UIMessage } from 'ai';
import { generateTitleFromUserMessage } from '@/lib/utils/convo-title-generation';
import { updateConversationTitle } from '@/lib/db/queries.server';
import { createScopedLogger } from '@/lib/utils/logger';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const logger = createScopedLogger('services/title-generation');

// Constants
export const TITLE_GENERATION_MIN_LENGTH = 50;

// Service-role client for guest title updates (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const serviceSupabase = supabaseUrl && serviceKey
  ? createServiceClient(supabaseUrl, serviceKey)
  : null;

/**
 * Configuration for title generation
 */
export interface TitleGenerationConfig {
  /** Conversation ID to update */
  conversationId: string;
  /** User message to generate title from */
  userMessage: UIMessage;
  /** Text content of user message */
  userMessageText: string;
  /** Whether this is the first message in conversation */
  isFirstMessage: boolean;
  /** Supabase client for authenticated users */
  supabaseClient: SupabaseClient;
  /** Whether this is a guest conversation */
  isGuest?: boolean;
}

/**
 * Generate AI-powered title for a conversation
 * Runs in background using Next.js `after()` to avoid blocking response
 *
 * @param config - Title generation configuration
 */
export function generateConversationTitle(config: TitleGenerationConfig): void {
  const {
    conversationId,
    userMessage,
    userMessageText,
    isFirstMessage,
    supabaseClient,
    isGuest = false,
  } = config;

  // Only generate title for first message (>50 chars)
  if (!isFirstMessage || userMessageText.trim().length <= TITLE_GENERATION_MIN_LENGTH) {
    return;
  }

  // Run in background to avoid blocking response
  after(async () => {
    try {
      const betterTitle = await generateTitleFromUserMessage({ message: userMessage });

      if (isGuest) {
        // Update guest conversation title (bypasses RLS)
        if (serviceSupabase) {
          const { error: updateError } = await serviceSupabase
            .from('guest_conversations')
            .update({ title: betterTitle })
            .eq('id', conversationId);

          if (updateError) {
            logger.error('Failed to update guest conversation title', updateError, { conversationId });
          } else {
            logger.debug('Guest title generated and updated', { conversationId, title: betterTitle });
          }
        } else {
          logger.warn('Service Supabase client not available for guest title update', { conversationId });
        }
      } else {
        // Update authenticated user conversation title
        await updateConversationTitle(conversationId, betterTitle, supabaseClient);
        logger.debug('Title generated and updated', { conversationId, title: betterTitle, isFirstMessage: true });
      }
    } catch (error) {
      logger.error('Background title generation failed', error, { conversationId });
    }
  });
}
