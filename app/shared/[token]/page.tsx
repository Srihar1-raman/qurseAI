import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSharedConversationByToken } from '@/lib/db/conversations.server';
import { getSharedMessagesServerSide } from '@/lib/db/messages.server';
import { createScopedLogger } from '@/lib/utils/logger';
import SharedConversationClient from './SharedConversationClient';
import type { Conversation, QurseMessage } from '@/lib/types';

const logger = createScopedLogger('app/shared/[token]/page');

interface PageProps {
  params: Promise<{ token: string }>;
}

// Generate dynamic metadata for shared conversations
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token: shareToken } = await params;
  
  // Validate token format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(shareToken)) {
    // Return default metadata for invalid tokens
    return {
      title: "Qurse - Shared Conversation",
      description: "AI Chat Platform for the fastest",
      openGraph: {
        title: "Qurse - Shared Conversation",
        description: "AI Chat Platform for the fastest",
        url: "https://www.qurse.site",
        siteName: "Qurse",
        images: [
          {
            url: "https://www.qurse.site/images/qurse.jpeg",
            width: 1200,
            height: 630,
            alt: "Qurse",
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Qurse - Shared Conversation",
        description: "AI Chat Platform for the fastest",
        images: ["https://www.qurse.site/images/qurse.jpeg"],
      },
    };
  }

  try {
    const sharedData = await getSharedConversationByToken(shareToken);
    
    if (!sharedData || !sharedData.conversation) {
      return {
        title: "Qurse - Shared Conversation",
        description: "AI Chat Platform for the fastest",
        openGraph: {
          title: "Qurse - Shared Conversation",
          description: "AI Chat Platform for the fastest",
          url: "https://www.qurse.site",
          siteName: "Qurse",
          images: [
            {
              url: "https://www.qurse.site/images/qurse.jpeg",
              width: 1200,
              height: 630,
              alt: "Qurse",
            },
          ],
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: "Qurse - Shared Conversation",
          description: "AI Chat Platform for the fastest",
          images: [
            {
              url: "https://www.qurse.site/images/qurse.jpeg",
              width: 1200,
              height: 630,
              alt: "Qurse",
            },
          ],
        },
      };
    }

    const { conversation, messageCount } = sharedData;
    
    // Get first assistant message for preview text (better than user message)
    let previewText = conversation.title || "Shared Conversation";
    if (messageCount > 0) {
      try {
        const messages = await getSharedMessagesServerSide(conversation.id, messageCount);
        // Find first assistant message (skip user messages for better preview)
        const firstAssistantMessage = messages.find(msg => msg.role === 'assistant');
        if (firstAssistantMessage) {
          const textContent = firstAssistantMessage.parts
            ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
            .map(p => p.text)
            .join('')
            .trim() || '';
          
          if (textContent) {
            // Use first 150 characters of first assistant message as preview
            previewText = textContent.slice(0, 150) + (textContent.length > 150 ? '...' : '');
          }
        } else if (messages.length > 0) {
          // Fallback: use first message if no assistant message found
          const firstMessage = messages[0];
          const textContent = firstMessage.parts
            ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
            .map(p => p.text)
            .join('')
            .trim() || '';
          
          if (textContent) {
            previewText = textContent.slice(0, 150) + (textContent.length > 150 ? '...' : '');
          }
        }
      } catch (error) {
        logger.warn('Error fetching first message for metadata', { error, shareToken });
      }
    }

    // Truncate title to 60 chars for better preview display
    const rawTitle = conversation.title || "Shared Conversation";
    const title = rawTitle.length > 60 ? rawTitle.slice(0, 57) + '...' : rawTitle;
    const description = previewText.length > 200 ? previewText.slice(0, 200) + '...' : previewText;
    const url = `https://www.qurse.site/shared/${shareToken}`;

    return {
      title: `${title} | Qurse`,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "Qurse",
        images: [
          {
            url: "https://www.qurse.site/images/qurse.jpeg",
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [
          {
            url: "https://www.qurse.site/images/qurse.jpeg",
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
    };
  } catch (error) {
    logger.error('Error generating metadata for shared conversation', error, { shareToken });
    // Return default metadata on error
    return {
      title: "Qurse - Shared Conversation",
      description: "AI Chat Platform for the fastest",
      openGraph: {
        title: "Qurse - Shared Conversation",
        description: "AI Chat Platform for the fastest",
        url: "https://www.qurse.site",
        siteName: "Qurse",
        images: [
          {
            url: "https://www.qurse.site/images/qurse.jpeg",
            width: 1200,
            height: 630,
            alt: "Qurse",
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Qurse - Shared Conversation",
        description: "AI Chat Platform for the fastest",
        images: ["https://www.qurse.site/images/qurse.jpeg"],
      },
    };
  }
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

