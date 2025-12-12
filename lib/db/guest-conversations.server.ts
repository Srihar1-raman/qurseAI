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

