import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMessagesServerSide } from '@/lib/db/queries.server';
import { isValidConversationId } from '@/lib/validation/chat-schema';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('api/conversation/[id]/messages');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    
    // Validate conversation ID
    if (!isValidConversationId(conversationId)) {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }
    
    // Skip temp- conversations (no messages to load)
    if (conversationId.startsWith('temp-')) {
      return NextResponse.json({
        messages: [],
        hasMore: false,
        dbRowCount: 0,
      });
    }
    
    // Get auth user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Load messages
    // Note: RLS policies automatically filter messages to only those from user's conversations
    const { messages, hasMore, dbRowCount } = await getMessagesServerSide(
      conversationId,
      { limit, offset }
    );
    
    return NextResponse.json({
      messages,
      hasMore,
      dbRowCount,
    });
  } catch (error) {
    logger.error('Error loading messages', error);
    
    // Check if it's a database error (conversation doesn't exist or access denied)
    const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
    
    // Return appropriate status code
    if (errorMessage.includes('belongs to another user') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}

