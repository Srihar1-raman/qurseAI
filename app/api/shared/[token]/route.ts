import { NextRequest, NextResponse } from 'next/server';
import { getSharedConversationByToken } from '@/lib/db/conversations.server';
import { getSharedMessagesServerSide } from '@/lib/db/messages.server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import type { SharedConversationData, Conversation, QurseMessage } from '@/lib/types';
import { convertLegacyContentToParts } from '@/lib/utils/message-parts-fallback';
import type { MessageParts } from '@/lib/utils/message-parts-fallback';

const logger = createScopedLogger('api/shared/[token]');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: shareToken } = await params;

    // Validate token format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(shareToken)) {
      return NextResponse.json(
        { error: 'Invalid share token format' },
        { status: 400 }
      );
    }

    // Get shared conversation
    const sharedData = await getSharedConversationByToken(shareToken);
    
    if (!sharedData || !sharedData.conversation) {
      return NextResponse.json(
        { error: 'Shared conversation not found' },
        { status: 404 }
      );
    }

    const { conversation: sharedConv, messageCount } = sharedData;

    // Get messages up to shared_message_count
    let messages: QurseMessage[] = [];
    
    if (messageCount > 0) {
      try {
        const sharedMessages = await getSharedMessagesServerSide(sharedConv.id, messageCount);
        
        // Convert to QurseMessage format
        messages = sharedMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.parts as any, // UIMessagePart<any, any>[]
          metadata: msg.model ? {
            model: msg.model,
            totalTokens: msg.total_tokens,
            inputTokens: msg.input_tokens,
            outputTokens: msg.output_tokens,
            completionTime: msg.completion_time || 0,
          } : undefined,
        }));
      } catch (error) {
        const userMessage = handleDbError(error, 'api/shared/[token]');
        logger.error('Error fetching shared messages', error, { shareToken, conversationId: sharedConv.id });
        return NextResponse.json(
          { error: userMessage },
          { status: 500 }
        );
      }
    }

    // Map conversation to Conversation type
    const conversation: Conversation = {
      id: sharedConv.id,
      title: sharedConv.title,
      updated_at: sharedConv.updated_at,
      created_at: sharedConv.created_at || undefined,
      message_count: messageCount,
      user_id: sharedConv.user_id,
      share_token: sharedConv.share_token,
      shared_at: sharedConv.shared_at || undefined,
      is_shared: sharedConv.is_shared,
      shared_message_count: sharedConv.shared_message_count || undefined,
    };

    const response: SharedConversationData = {
      conversation,
      messages,
      isShared: true,
      canContinue: false, // Client determines based on auth
      shareToken,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching shared conversation', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared conversation' },
      { status: 500 }
    );
  }
}

