/**
 * Server-Side Guest Conversation Queries
 * Guest conversation-related database operations
 * Uses service-role client (required for guest tables)
 */

import 'server-only';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('db/guest-conversations.server');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

/**
 * Ensure guest conversation exists (server-side)
 * Creates conversation if it doesn't exist, with the provided ID
 * Handles race conditions gracefully
 */
export async function ensureGuestConversation(
  sessionHash: string,
  title: string,
  conversationId?: string
): Promise<string> {
  const supabase = serviceSupabase;

  // If conversationId provided, validate it belongs to this session_hash
  if (conversationId) {
    // First check if conversation exists and belongs to this session
    const { data: existing, error } = await supabase
      .from('guest_conversations')
      .select('id, session_hash')
      .eq('id', conversationId)
      .eq('session_hash', sessionHash)
      .maybeSingle();

    if (error) {
      logger.error('Error checking guest conversation', error, { conversationId, sessionHash });
      throw error;
    }

    if (existing?.id) {
      // Conversation exists and belongs to this session - return it
      return existing.id;
    }

    // Conversation doesn't exist or doesn't belong to this session
    // Check if it exists with different session_hash (security check)
    const { data: existsWithOtherSession, error: checkError } = await supabase
      .from('guest_conversations')
      .select('id, session_hash')
      .eq('id', conversationId)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking guest conversation existence', checkError, { conversationId });
      throw checkError;
    }

    if (existsWithOtherSession?.id) {
      // Conversation exists but belongs to another session - security violation
      logger.warn('Attempted to access guest conversation from different session', {
        conversationId,
        requestedSessionHash: sessionHash,
        actualSessionHash: existsWithOtherSession.session_hash,
      });
      throw new Error('Conversation belongs to another session');
    }

    // Conversation doesn't exist - create new one with the provided ID
    const { data: inserted, error: insertError } = await supabase
      .from('guest_conversations')
      .insert({
        id: conversationId,
        session_hash: sessionHash,
        title: title || 'New Chat',
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle race condition (conversation created between check and insert)
      if (insertError.code === '23505') {
        // ID already exists - verify ownership (race condition)
        const { data: verify } = await supabase
          .from('guest_conversations')
          .select('id')
          .eq('id', conversationId)
          .eq('session_hash', sessionHash)
          .maybeSingle();
        
        if (verify?.id) {
          logger.debug('Guest conversation created by concurrent request', { conversationId, sessionHash });
          return verify.id;
        }
        // Race condition: conversation created by another session
        throw new Error('Conversation ID conflict');
      }
      throw insertError;
    }

    return inserted.id;
  }

  // No conversationId provided - create new conversation (NEW CHAT)
  // This is correct behavior - don't change this
  const { data: created, error: createError } = await supabase
    .from('guest_conversations')
    .insert({
      session_hash: sessionHash,
      title: title || 'New Chat',
    })
    .select('id')
    .single();

  if (createError) {
    logger.error('Failed to create guest conversation', createError, { sessionHash });
    throw createError;
  }

  return created.id;
}

/**
 * Get guest conversation title by ID (server-side)
 * Uses service role client for guest conversations
 * Used for metadata generation
 * @param conversationId - Conversation ID
 * @param sessionHash - Session hash for verification
 * @returns Title or null if not found
 */
export async function getGuestConversationTitleById(
  conversationId: string,
  sessionHash: string
): Promise<string | null> {
  try {
    const { data, error } = await serviceSupabase
      .from('guest_conversations')
      .select('title')
      .eq('id', conversationId)
      .eq('session_hash', sessionHash)
      .maybeSingle();

    if (error) throw error;
    return data?.title || null;
  } catch (error) {
    logger.error('Error fetching guest conversation title', error, { conversationId });
    return null;
  }
}

/**
 * Check guest conversation access (read-only)
 * Validates if conversation exists and belongs to session_hash
 * Mirror of checkConversationAccess for auth users
 */
export async function checkGuestConversationAccess(
  conversationId: string,
  sessionHash: string
): Promise<{
  exists: boolean;
  belongsToSession: boolean;
  error?: boolean;
  conversation?: { id: string; session_hash: string };
}> {
  try {
    const { data: conversation, error } = await serviceSupabase
      .from('guest_conversations')
      .select('id, session_hash')
      .eq('id', conversationId)
      .maybeSingle();

    if (error) {
      logger.error('Error checking guest conversation access', error, { conversationId, sessionHash });
      return { exists: false, belongsToSession: false, error: true };
    }

    if (!conversation) {
      return { exists: false, belongsToSession: false, error: false };
    }

    const belongsToSession = conversation.session_hash === sessionHash;

    return {
      exists: true,
      belongsToSession,
      error: false,
      conversation: {
        id: conversation.id,
        session_hash: conversation.session_hash,
      },
    };
  } catch (error) {
    logger.error('Error in checkGuestConversationAccess', error, { conversationId, sessionHash });
    return { exists: false, belongsToSession: false, error: true };
  }
}

