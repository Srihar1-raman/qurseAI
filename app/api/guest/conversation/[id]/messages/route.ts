import { NextRequest, NextResponse } from 'next/server';
import { getGuestMessagesServerSide } from '@/lib/db/messages.server';
import { checkGuestConversationAccess } from '@/lib/db/guest-conversations.server';
import { isValidConversationId } from '@/lib/validation/chat-schema';
import { parseCookie, isValidUUID } from '@/lib/utils/session';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('api/guest/conversation/[id]/messages');
const SESSION_COOKIE_NAME = 'session_id';

/**
 * GET /api/guest/conversation/[id]/messages
 * Load messages for a guest conversation
 * Mirrors /api/conversation/[id]/messages for auth users
 */
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
    
    // Get session_id from cookie
    const cookieHeader = request.headers.get('cookie') ?? '';
    const sessionId = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
    
    if (!sessionId || !isValidUUID(sessionId)) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }
    
    // Derive session_hash from session_id
    const sessionHash = hmacSessionId(sessionId);
    
    // Check conversation access (security: verify ownership)
    const accessCheck = await checkGuestConversationAccess(conversationId, sessionHash);
    
    if (accessCheck.error) {
      logger.error('Database error during guest access check', { conversationId, sessionHash });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    if (!accessCheck.exists) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    if (!accessCheck.belongsToSession) {
      logger.warn('Unauthorized guest conversation access', { conversationId, sessionHash });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Load messages
    const { messages, hasMore, dbRowCount } = await getGuestMessagesServerSide(
      conversationId,
      { limit, offset }
    );
    
    logger.debug('Guest messages loaded via API', { 
      conversationId, 
      messageCount: messages.length,
      hasMore,
      dbRowCount,
    });
    
    return NextResponse.json({
      messages,
      hasMore,
      dbRowCount,
    });
  } catch (error) {
    logger.error('Error loading guest messages', error);
    
    // Check if it's a database error (conversation doesn't exist or access denied)
    const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
    
    // Return appropriate status code
    if (errorMessage.includes('belongs to another session') || errorMessage.includes('Unauthorized')) {
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

