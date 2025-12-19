import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import type { Conversation } from '@/lib/types';

const logger = createScopedLogger('api/conversations/search');

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query')?.trim() || '';

    // Validate query (min length 1)
    if (!query || query.length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Search conversations (server-side, searches entire database)
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, updated_at, created_at, user_id, pinned')
      .eq('user_id', user.id)
      .ilike('title', `%${query}%`)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (error) {
      const userMessage = handleDbError(error, 'api/conversations/search');
      logger.error('Error searching conversations', error, { userId: user.id, query });
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

    // Map to Conversation type
    const conversations: Conversation[] = (data || []).map(conv => ({
      id: conv.id,
      title: conv.title,
      updated_at: conv.updated_at,
      created_at: conv.created_at,
      message_count: 0, // Not needed for search results
      pinned: conv.pinned || false,
    }));

    logger.debug('Search completed', { userId: user.id, query, resultCount: conversations.length });

    return NextResponse.json({ conversations });
  } catch (error) {
    logger.error('Unexpected error in search', error);
    return NextResponse.json(
      { error: 'Failed to search conversations' },
      { status: 500 }
    );
  }
}

