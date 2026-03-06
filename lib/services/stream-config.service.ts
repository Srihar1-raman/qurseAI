/**
 * Stream Config Service
 * Builds configuration for AI streaming responses
 */

import type { UIMessage, UIMessageStreamWriter } from 'ai';
import { streamText, stepCountIs } from 'ai';
import { qurse } from '@/ai/providers';
import { getModelParameters, getProviderOptions, getModelConfig } from '@/ai/models';
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
import { webSearchTool } from '@/lib/tools/web-search';
import { weatherTool } from '@/lib/tools/weather';
import {
  stockQuoteTool,
  stockHistoryTool,
  stockIntradayTool,
  companyInfoTool,
  stockNewsTool,
  stockEarningsTool,
  stockComparisonTool,
  marketIndicesTool,
  cryptoPriceTool,
  forexRateTool,
  stockSearchTool,
} from '@/lib/tools/finance';

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
    userLocation?: string;  // User location string (e.g., "San Francisco, US" or "Unknown location")
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
 * Creates a full configuration for createUIMessageStream
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
      // Import convertToModelMessages for use in streamText
      const { convertToModelMessages } = await import('ai');

      // Filter out tool messages and tool-call parts from uiMessages before converting to ModelMessages
      const filteredUiMessages = uiMessages
        .filter((msg: any) => msg.role !== 'tool')
        .map(msg => ({
          ...msg,
          parts: msg.parts.filter((part: any) => !part.type?.startsWith('tool')),
        }));

      console.log('[DEBUG] Server - original uiMessages count:', uiMessages.length);
      console.log('[DEBUG] Server - original uiMessages:', uiMessages.map((m: any) => ({
        id: m.id,
        role: m.role,
        partTypes: m.parts?.map((p: any) => p.type) || [],
      })));
      console.log('[DEBUG] Server - filtered uiMessages count:', filteredUiMessages.length);
      console.log('[DEBUG] Server - filtered uiMessages:', filteredUiMessages.map((m: any) => ({
        id: m.id,
        role: m.role,
        partTypes: m.parts?.map((p: any) => p.type) || [],
      })));

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

      // Inject current date/time if placeholders exist
      const now = new Date();
      const currentDate = now.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      finalSystemPrompt = finalSystemPrompt
        .replace('{currentDate}', currentDate)
        .replace('{currentTime}', currentTime)
        .replace('{userLocation}', modeConfig.userLocation || 'Unknown location');

      // Add memory context first (before custom prompt)
      if (memoryPrompt) {
        finalSystemPrompt = `${finalSystemPrompt}\n\n${memoryPrompt}`;
      }

      // Add custom prompt last
      if (customPrompt) {
        finalSystemPrompt = buildSystemPrompt(finalSystemPrompt, customPrompt);
      }

      // Build tools based on mode configuration
      const tools: Record<string, any> = {};
      if (modeConfig.enabledTools.includes('web_search')) {
        tools.web_search = webSearchTool;
      }
      if (modeConfig.enabledTools.includes('weather')) {
        tools.weather = weatherTool;
      }
      if (modeConfig.enabledTools.includes('stock_quote')) {
        tools.stock_quote = stockQuoteTool;
      }
      if (modeConfig.enabledTools.includes('stock_history')) {
        tools.stock_history = stockHistoryTool;
      }
      if (modeConfig.enabledTools.includes('stock_intraday')) {
        tools.stock_intraday = stockIntradayTool;
      }
      if (modeConfig.enabledTools.includes('company_info')) {
        tools.company_info = companyInfoTool;
      }
      if (modeConfig.enabledTools.includes('stock_news')) {
        tools.stock_news = stockNewsTool;
      }
      if (modeConfig.enabledTools.includes('stock_earnings')) {
        tools.stock_earnings = stockEarningsTool;
      }
      if (modeConfig.enabledTools.includes('stock_comparison')) {
        tools.stock_comparison = stockComparisonTool;
      }
      if (modeConfig.enabledTools.includes('market_indices')) {
        tools.market_indices = marketIndicesTool;
      }
      if (modeConfig.enabledTools.includes('crypto_price')) {
        tools.crypto_price = cryptoPriceTool;
      }
      if (modeConfig.enabledTools.includes('forex_rate')) {
        tools.forex_rate = forexRateTool;
      }
      if (modeConfig.enabledTools.includes('stock_search')) {
        tools.stock_search = stockSearchTool;
      }

      const streamTextOptions: any = {
        model: qurse.languageModel(model),
        messages: convertToModelMessages(filteredUiMessages),
        system: finalSystemPrompt,
        maxRetries: 5,
        ...getModelParameters(model),
        providerOptions: getProviderOptions(model) as StreamTextProviderOptions,
        abortSignal: abortController.signal,
      };

      if (Object.keys(tools).length > 0) {
        streamTextOptions.tools = tools;
        streamTextOptions.stopWhen = stepCountIs(5);
      }

      const result = streamText(streamTextOptions);

      // Merge stream with conditional reasoning
      const modelConfig = getModelConfig(model);
      const shouldSendReasoning = modelConfig?.reasoning || false;

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: shouldSendReasoning,
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

  // DEBUG: Log all parts in assistant message
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
        reasoning_time: completionTime,
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
