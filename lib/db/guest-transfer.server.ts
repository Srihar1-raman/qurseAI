/**
 * Guest to User Transfer Service
 * Transfers guest conversations, messages, and rate limits to authenticated user
 * Server-side only (uses service-role client)
 */

import 'server-only';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';
import type { GuestTransferResult } from '@/lib/types';

const logger = createScopedLogger('db/guest-transfer');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

/**
 * Transfer guest data to authenticated user
 * Calls database function transfer_guest_to_user() which:
 * - Copies guest_conversations → conversations
 * - Copies guest_messages → messages
 * - Updates rate_limits (session_hash → user_id)
 * - Cleans up guest staging tables
 * 
 * @param sessionHash - HMAC'd session_id from cookie
 * @param userId - Authenticated user ID
 * @returns Transfer result with counts
 */
export async function transferGuestToUser(
  sessionHash: string,
  userId: string
): Promise<GuestTransferResult> {
  const { data, error } = await serviceSupabase.rpc('transfer_guest_to_user', {
    p_session_hash: sessionHash,
    p_user_id: userId,
  });
  
  if (error) {
    logger.error('Guest transfer failed', error, { sessionHash, userId });
    throw new Error(`Transfer failed: ${error.message || JSON.stringify(error)}`);
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    logger.error('Guest transfer returned no data', { sessionHash, userId, data });
    throw new Error('Transfer function returned no data');
  }
  
  const result = data[0];
  
  if (!result) {
    logger.error('Guest transfer result is null', { sessionHash, userId, data });
    throw new Error('Transfer function returned null result');
  }
  
  logger.info('Guest data transferred to user', {
    sessionHash,
    userId,
    messages: result.messages_transferred,
    rateLimits: result.rate_limits_transferred,
    conversations: result.conversations_transferred,
  });
  
  return {
    messagesTransferred: result.messages_transferred ?? 0,
    rateLimitsTransferred: result.rate_limits_transferred ?? 0,
    conversationsTransferred: result.conversations_transferred ?? 0,
  };
}

