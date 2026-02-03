/**
 * Stream Config Service
 * Builds configuration for AI streaming responses
 */

import type { UIMessage, UIMessageStreamWriter } from 'ai';
import { streamText } from 'ai';
import { qurse } from '@/ai/providers';
import { getModelParameters, getProviderOptions, getModelConfig } from '@/ai/models';
import { getToolsByIds } from '@/lib/tools';
import { saveUserMessageServerSide } from '@/lib/db/messages.server';
import { saveGuestMessage } from '@/lib/db/guest-messages.server';
import { createScopedLogger } from '@/lib/utils/logger';
import { StreamingError, ProviderError } from '@/lib/errors';
import { buildSystemPrompt } from './prompt-builder.service';
import { saveConversation } from './supermemory.service';
import { extractMessageText } from '@/lib/utils/memory-prompt';
import type { StreamTextProviderOptions } from '@/lib/utils/message-adapters';
import type { User } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const logger = createScopedLogger('services/stream-config');

/**
 * Configuration for building stream
 */
export interface StreamConfig {
  /** Messages in UI format */
  uiMessages: UIMessage[];
  /** Chat mode configuration */
  modeConfig: {
    systemPrompt?: string;
    enabledTools: string[];
  };
  /** Model identifier */
  model: string;
  /** Authenticated user */
  user: User | null;
  /** Resolved conversation ID ref (mutated by DB ops) */
  resolvedConversationIdRef: { current: string | undefined };
  /** Guest session hash */
  sessionHash?: string;
  /** Supabase client for database operations */
  supabaseClient: SupabaseClient;
  /** Full user data for message saving */
  fullUserData: User | null;
  /** Request start time for timing */
  requestStartTime: number;
  /** Database operations promise */
  dbOperationsPromise: Promise<{ resolvedConversationId: string; saveSuccess: boolean } | null>;
  /** Abort controller for stream cancellation */
  abortController: AbortController;
  /** Conversation ID from request (fallback) */
  conversationId: string | undefined;
  /** Context trimming metadata */
  contextMetadata?: {
    originalTokenCount: number;
    trimmedTokenCount: number;
    removedReasoningFrom: number;
    droppedMessages: number;
    warning?: string;
  };
  /** User's custom system prompt (optional) */
  customPrompt?: string | null;
  /** Memory context from Supermemory (for authenticated users) */
  memoryPrompt?: string;
  /** User message text for saving to memory */
  userMessageText?: string;
  /** Whether Supermemory is enabled for this user */
  enableSupermemory?: boolean;
}

/**
 * Build stream configuration object
 * Creates the full configuration for createUIMessageStream
 *
 * @param config - Stream configuration inputs
 * @returns Configuration object for createUIMessageStream
 */
export function buildStreamConfig(config: StreamConfig) {
  const {
    uiMessages,
    modeConfig,
    model,
    user,
    resolvedConversationIdRef,
    sessionHash,
    supabaseClient,
    fullUserData,
    requestStartTime,
    dbOperationsPromise,
    abortController,
    conversationId,
    contextMetadata,
    customPrompt,
    memoryPrompt,
    userMessageText,
    enableSupermemory,
  } = config;

  return {
    execute: async ({ writer: dataStream }: { writer: UIMessageStreamWriter<UIMessage> }) => {
      // Load tools synchronously (fast operation, no need for promise)
      const tools = getToolsByIds(modeConfig.enabledTools);

      // Import convertToModelMessages for use in streamText
      const { convertToModelMessages } = await import('ai');

      // Await DB operations (user message must be saved before streaming)
      const dbResult = await dbOperationsPromise;

      // Extract convId from DB result
      let convId = conversationId;
      if (dbResult && typeof dbResult === 'object' && !Array.isArray(dbResult) && 'resolvedConversationId' in dbResult) {
        convId = dbResult.resolvedConversationId;
        resolvedConversationIdRef.current = convId || resolvedConversationIdRef.current;
        if (dbResult.saveSuccess) {
          logger.debug('Conversation validated and user message saved', { conversationId: convId });
        } else {
          logger.debug('Conversation validated but user message save failed', { conversationId: convId });
        }
      }

      // Start streaming
      // Merge prompts: Mode system prompt + Memory prompt + Custom prompt
      let finalSystemPrompt = modeConfig.systemPrompt || '';

      // Add memory context first (before custom prompt)
      if (memoryPrompt) {
        finalSystemPrompt = `${finalSystemPrompt}\n\n${memoryPrompt}`;
      }

      // Add custom prompt last
      if (customPrompt) {
        finalSystemPrompt = buildSystemPrompt(finalSystemPrompt, customPrompt);
      }

      const result = streamText({
        model: qurse.languageModel(model),
        messages: convertToModelMessages(uiMessages),
        system: finalSystemPrompt,
        maxRetries: 5,
        ...getModelParameters(model),
        providerOptions: getProviderOptions(model) as StreamTextProviderOptions,
        tools: Object.keys(tools).length > 0 ? tools : undefined,
        abortSignal: abortController.signal,
        onError: (err) => {
          logger.error('Stream error', err.error, { model });
          const errorMessage = err.error instanceof Error ? err.error.message : String(err.error);
          if (errorMessage.includes('API key')) {
            throw new ProviderError(
              'Provider authentication failed',
              model.split('/')[0] || 'unknown',
              false
            );
          }
        },
        onAbort: ({ steps }) => {
          logger.info('Stream aborted (streamText onAbort)', {
            conversationId: resolvedConversationIdRef.current,
            stepsCount: steps.length,
            hasSteps: steps.length > 0,
          });
        },
        onFinish: async ({ usage }) => {
          const processingTime = (Date.now() - requestStartTime) / 1000;
          logger.info('Stream completed', {
            duration: `${processingTime.toFixed(2)}s`,
            tokens: usage?.totalTokens || 0,
          });
        },
      });

      // Merge stream with conditional reasoning
      const modelConfig = getModelConfig(model);
      const shouldSendReasoning = modelConfig?.reasoning || false;

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: shouldSendReasoning,
          // Note: Tool parts (tool-call, tool-result) are sent by default
          messageMetadata: ({ part }) => {
            if (part.type === 'finish') {
              const processingTime = (Date.now() - requestStartTime) / 1000;
              return {
                model: model,
                completionTime: processingTime,
                totalTokens: part.totalUsage?.totalTokens ?? null,
                inputTokens: part.totalUsage?.inputTokens ?? null,
                outputTokens: part.totalUsage?.outputTokens ?? null,
                // Include context metadata if available
                ...(contextMetadata && {
                  contextMetadata: contextMetadata,
                }),
              };
            }
          },
        })
      );
    },
    onFinish: async ({ messages }: { messages: UIMessage[] }) => {
      await saveAssistantMessages({
        messages,
        conversationId: conversationId,
        resolvedConversationId: resolvedConversationIdRef.current,
        user,
        fullUserData,
        sessionHash,
        model,
        requestStartTime,
        supabaseClient,
        userMessageText,
        enableSupermemory,
      });
    },
  };
}

/**
 * Save assistant messages after streaming completes
 */
async function saveAssistantMessages(config: {
  messages: UIMessage[];
  conversationId: string | undefined;
  resolvedConversationId: string | undefined;
  user: User | null;
  fullUserData: User | null;
  sessionHash?: string;
  model: string;
  requestStartTime: number;
  supabaseClient: SupabaseClient;
  userMessageText?: string;
  enableSupermemory?: boolean;
}): Promise<void> {
  const {
    messages,
    resolvedConversationId,
    user,
    fullUserData,
    sessionHash,
    model,
    requestStartTime,
    supabaseClient,
    userMessageText,
    enableSupermemory,
  } = config;

  logger.info('onFinish called', {
    messagesLength: messages.length,
    conversationId: resolvedConversationId,
    hasUser: !!fullUserData,
    hasSessionHash: !!sessionHash,
  });

  const assistantMessage = messages[messages.length - 1];

  // DEBUG: Log all parts in the assistant message
  if (assistantMessage?.parts) {
    logger.info('Assistant message parts', {
      messageId: assistantMessage.id,
      partsCount: assistantMessage.parts.length,
      partTypes: assistantMessage.parts.map(p => p.type),
      // Log full parts for debugging
      parts: assistantMessage.parts.map(p => ({
        type: p.type,
        keys: Object.keys(p),
      })),
    });
  }

  // Early return if no valid assistant message
  if (!assistantMessage || assistantMessage.role !== 'assistant' || !assistantMessage.parts || assistantMessage.parts.length === 0) {
    logger.warn('Early return - invalid assistant message', {
      hasAssistantMessage: !!assistantMessage,
      role: assistantMessage?.role,
      hasParts: !!assistantMessage?.parts,
      partsLength: assistantMessage?.parts?.length
    });
    return;
  }

  // Validate parts array
  if (!Array.isArray(assistantMessage.parts)) {
    logger.error('Invalid parts array', { conversationId: resolvedConversationId, parts: assistantMessage.parts });
    return;
  }

  // Extract text content for save
  const messageContentText = assistantMessage.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('') || '';

  // Authenticated assistant save
  logger.debug('Checking authenticated save conditions', {
    hasUser: !!user,
    hasResolvedId: !!resolvedConversationId,
    willSave: !!(user && resolvedConversationId)
  });

  if (user && resolvedConversationId) {
    try {
      interface MessageWithMetadata extends UIMessage {
        metadata?: {
          inputTokens?: number | null;
          outputTokens?: number | null;
          totalTokens?: number | null;
          completionTime?: number;
          model?: string;
        };
      }
      const messageWithMetadata = assistantMessage as MessageWithMetadata;
      const metadata = messageWithMetadata.metadata;
      const inputTokens = metadata?.inputTokens ?? null;
      const outputTokens = metadata?.outputTokens ?? null;
      const totalTokens = metadata?.totalTokens ?? null;
      const completionTime = metadata?.completionTime ?? (Date.now() - requestStartTime) / 1000;

      const { error: assistantMsgError } = await supabaseClient.from('messages').insert({
        conversation_id: resolvedConversationId,
        role: 'assistant',
        parts: assistantMessage.parts,
        content: messageContentText || null,
        model: model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        completion_time: completionTime,
      });

      if (assistantMsgError) {
        logger.error('Assistant message save failed', assistantMsgError, { conversationId: resolvedConversationId });
      } else {
        logger.info('Assistant message saved', {
          conversationId: resolvedConversationId,
          messageId: assistantMessage.id,
          tokens: totalTokens,
          model,
        });

        // Save conversation to Supermemory (only for authenticated users)
        if (user && user.id && enableSupermemory !== false) {
          logger.info('Attempting to save conversation to Supermemory', {
            userId: user.id,
            conversationId: resolvedConversationId,
          });

          try {
            logger.info('Extracted message texts for Supermemory', {
              userId: user.id,
              userMessageLength: userMessageText?.length || 0,
              assistantMessageLength: messageContentText.length,
            });

            if (userMessageText && messageContentText) {
              await saveConversation(user.id, userMessageText, messageContentText);
              logger.info('Supermemory save completed', { userId: user.id });
            } else {
              logger.warn('Skipped Supermemory save - empty message text', {
                userId: user.id,
                hasUserMessage: !!userMessageText,
                hasAssistantMessage: !!messageContentText,
              });
            }
          } catch (error) {
            // Log but don't fail - memory save failure shouldn't break chat
            logger.error('Failed to save conversation to Supermemory', {
              error: error as Error,
              userId: user.id,
              conversationId: resolvedConversationId,
              errorMessage: (error as Error).message,
            });
          }
        } else {
          logger.debug('Skipping Supermemory save - no authenticated user', {
            hasUser: !!user,
            hasUserId: !!user?.id,
          });
        }
      }
    } catch (error) {
      logger.error('Assistant message save error', error, { conversationId: resolvedConversationId });
    }
  }

  // Guest assistant save
  logger.debug('Checking guest save conditions', {
    hasUser: !!user,
    hasSessionHash: !!sessionHash,
    hasResolvedId: !!resolvedConversationId,
    willSave: !!(!user && sessionHash && resolvedConversationId)
  });

  if (!user && sessionHash && resolvedConversationId) {
    try {
      await saveGuestMessage({
        conversationId: resolvedConversationId,
        message: assistantMessage,
        role: 'assistant',
        sessionHash: sessionHash,
      });
      logger.info('Guest assistant message saved', {
        conversationId: resolvedConversationId,
        messageId: assistantMessage.id,
      });
    } catch (error) {
      logger.error('Guest assistant message save error', error, { conversationId: resolvedConversationId, sessionHash });
    }
  }
}

// Re-export convertToModelMessages for use in stream config
export { convertToModelMessages } from 'ai';
