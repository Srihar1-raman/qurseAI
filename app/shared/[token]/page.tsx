import { redirect } from 'next/navigation';
import { getSharedConversationByToken } from '@/lib/db/conversations.server';
import { getSharedMessagesServerSide } from '@/lib/db/messages.server';
import { createScopedLogger } from '@/lib/utils/logger';
import SharedConversationClient from './SharedConversationClient';
import type { Conversation, QurseMessage } from '@/lib/types';

const logger = createScopedLogger('app/shared/[token]/page');

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedConversationPage({ params }: PageProps) {
  const { token: shareToken } = await params;

  // Validate token format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(shareToken)) {
    logger.warn('Invalid share token format', { shareToken });
    redirect('/');
  }

  try {
    // Get shared conversation
    const sharedData = await getSharedConversationByToken(shareToken);
    
    if (!sharedData || !sharedData.conversation) {
      logger.warn('Shared conversation not found', { shareToken });
      redirect('/');
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
        logger.error('Error fetching shared messages', error, { shareToken, conversationId: sharedConv.id });
        redirect('/');
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
      share_token: sharedConv.share_token || undefined,
      shared_at: sharedConv.shared_at || undefined,
      is_shared: sharedConv.is_shared,
      shared_message_count: sharedConv.shared_message_count || undefined,
    };

    return (
      <SharedConversationClient
        conversation={conversation}
        messages={messages}
        shareToken={shareToken}
      />
    );
  } catch (error) {
    logger.error('Error loading shared conversation', error, { shareToken });
    redirect('/');
  }
}

