import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSessionId } from '@/lib/utils/session';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import type { Conversation } from '@/lib/types';

const logger = createScopedLogger('api/guest/conversations');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

/**
 * GET /api/guest/conversations
 * Returns guest conversations for the session_hash from cookie
 * Mirror of /api/user/conversations for auth users
 */
export async function GET(request: NextRequest) {
  try {
    // Get session_hash from cookie (server-side)
    const sessionId = getOrCreateSessionId(request);
    const sessionHash = hmacSessionId(sessionId);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Query guest conversations (service-role client required)
    const { data, error } = await serviceSupabase
      .from('guest_conversations')
      .select('id, title, created_at, updated_at, session_hash')
      .eq('session_hash', sessionHash)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      const userMessage = handleDbError(error, 'api/guest/conversations');
      logger.error('Error fetching guest conversations', error, { sessionHash, limit, offset });
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

    // Get message counts (separate query for performance)
    const conversationIds = (data || []).map(conv => conv.id);
    let messageCounts: Record<string, number> = {};
    
    if (conversationIds.length > 0) {
      const { data: counts, error: countError } = await serviceSupabase
        .from('guest_messages')
        .select('guest_conversation_id')
        .in('guest_conversation_id', conversationIds);

      if (!countError && counts) {
        messageCounts = counts.reduce((acc, msg) => {
          acc[msg.guest_conversation_id] = (acc[msg.guest_conversation_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Map to Conversation type (same format as auth users)
    const conversations: Conversation[] = (data || []).map(conv => ({
      id: conv.id,
      title: conv.title,
      updated_at: conv.updated_at,
      created_at: conv.created_at,
      message_count: messageCounts[conv.id] || 0,
    }));

    const hasMore = (data?.length || 0) >= limit;

    logger.debug('Guest conversations fetched', { 
      sessionHash, 
      count: conversations.length, 
      hasMore 
    });

    return NextResponse.json({
      conversations,
      hasMore,
    });
  } catch (error) {
    logger.error('Unexpected error in guest conversations API', error);
    return NextResponse.json(
      { error: 'Failed to fetch guest conversations' },
      { status: 500 }
    );
  }
}

