/**
 * Chat API Route
 * Main endpoint for AI streaming responses with reasoning support
 */

import { createUIMessageStream, JsonToSseTransformStream } from 'ai';
import { NextResponse } from 'next/server';
import { canUseModel, requiresAuthentication, requiresProSubscription } from '@/ai/models';
import { getChatMode } from '@/ai/config';
import { getUserData } from '@/lib/supabase/auth-utils';
import { ModelAccessError, ChatModeError, ValidationError, StreamingError, ProviderError } from '@/lib/errors';
import { safeValidateChatRequest } from '@/lib/validation/chat-schema';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/error-handler';
import { applyRateLimitHeaders, applyConversationIdHeader } from '@/lib/utils/rate-limit-headers';
import { checkRateLimits } from '@/lib/services/rate-limit-check.service';
import { processMessages } from '@/lib/services/message-processing.service';
import { handleChatDatabaseOperations } from '@/lib/services/chat-database.service';
import { buildStreamConfig } from '@/lib/services/stream-config.service';
import { trimContext } from '@/lib/services/context-manager.service';
import { getUserPreferences } from '@/lib/services/user-preferences';
import { buildSystemPrompt } from '@/lib/services/prompt-builder.service';
import type { User } from '@/lib/types';

const logger = createScopedLogger('api/chat');

/**
 * POST /api/chat
 * Stream AI responses with authentication, access control, and database persistence
 */
export async function POST(req: Request) {
  const requestStartTime = Date.now();

  try {
    // ============================================
    // Stage 1: Fast authentication check
    // ============================================
    const { lightweightUser, fullUser, supabaseClient } = await getUserData();
    const fullUserData = fullUser;

    // ============================================
    // Stage 2: Parse and validate request body
    // ============================================
    const body = await req.json();
    const validationResult = safeValidateChatRequest(body);

    if (!validationResult.success) {
      const zodError = validationResult.errors!;
      const validationErrors = zodError.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      throw new ValidationError(
        'Request validation failed',
        validationErrors
      );
    }

    const {
      messages,
      conversationId,
      model,
      chatMode,
    } = validationResult.data!;

    // ============================================
    // Stage 2.5: Smart context trimming
    // ============================================
    const trimResult = trimContext(messages, model);

    if (trimResult.metadata.warning) {
      logger.info('Context trimmed', {
        conversationId,
        model,
        originalTokens: trimResult.metadata.originalTokenCount,
        trimmedTokens: trimResult.metadata.trimmedTokenCount,
        droppedMessages: trimResult.metadata.droppedMessages,
        removedReasoningFrom: trimResult.metadata.removedReasoningFrom,
      });
    }

    // Use trimmed messages for AI processing
    const messagesToSend = trimResult.messages;

    // ============================================
    // Stage 3: Early exit checks
    // ============================================
    if (requiresAuthentication(model) && !lightweightUser) {
      logger.warn('Early exit: Auth required', { model, userId: null });
      throw new ModelAccessError('Authentication required', 401);
    }

    if (requiresProSubscription(model) && (!lightweightUser || !lightweightUser.isProUser)) {
      logger.warn('Early exit: Pro required', { model, userId: lightweightUser?.userId });
      throw new ModelAccessError('Pro subscription required', 403);
    }

    // ============================================
    // Stage 4: Rate limiting
    // ============================================
    const rateLimitResult = await checkRateLimits(req, lightweightUser, conversationId);

    if (rateLimitResult.earlyResponse) {
      logger.warn('Rate limit exceeded', {
        userId: lightweightUser?.userId || 'guest',
      });
      return rateLimitResult.earlyResponse;
    }

    // ============================================
    // Stage 5: Access control check
    // ============================================
    const modeConfig = getChatMode(chatMode);
    if (!modeConfig) {
      throw new ChatModeError(`Chat mode '${chatMode}' not found`);
    }

    const isPro = lightweightUser?.isProUser ?? false;
    const userForCheck: User | null = lightweightUser ? {
      id: lightweightUser.userId,
      email: lightweightUser.email,
    } : null;

    const accessCheck = await canUseModel(model, userForCheck, isPro);

    if (!accessCheck.canUse) {
      const statusCode = accessCheck.reason === 'Authentication required' ? 401 : 403;
      logger.warn('Model access denied', { model, reason: accessCheck.reason, userId: lightweightUser?.userId });
      throw new ModelAccessError(accessCheck.reason || 'Access denied', statusCode);
    }

    logger.debug('Setup complete', { duration: `${Date.now() - requestStartTime}ms` });

    // ============================================
    // Stage 6: Fetch user preferences
    // ============================================
    let userPreferences = null;
    if (fullUserData) {
      try {
        userPreferences = await getUserPreferences(fullUserData.id);
      } catch (error: unknown) {
        logger.warn('Failed to load user preferences, using defaults', error as Record<string, unknown>);
        // Continue without preferences - will use defaults
      }
    }

    // ============================================
    // Stage 7: Process messages
    // ============================================
    const messageData = processMessages(messagesToSend);

    // ============================================
    // Stage 8: Database operations
    // ============================================
    const resolvedConversationIdRef = { current: conversationId };

    const dbOperationsPromise = handleChatDatabaseOperations({
      conversationId,
      user: fullUserData,
      sessionHash: rateLimitResult.sessionHash,
      lastUserMessage: messageData.lastUserMessage,
      userMessageText: messageData.userMessageText,
      title: messageData.title,
      supabaseClient,
      userPreferences,
    });

    // ============================================
    // Stage 8: Create AbortController
    // ============================================
    const abortController = new AbortController();

    if (req.signal) {
      if (req.signal.aborted) {
        abortController.abort();
      } else {
        req.signal.addEventListener('abort', () => {
          abortController.abort();
        });
      }
    }

    // ============================================
    // Stage 9: Build stream configuration
    // ============================================
    const streamConfig = buildStreamConfig({
      uiMessages: messageData.uiMessages,
      modeConfig: {
        systemPrompt: modeConfig.systemPrompt,
        enabledTools: modeConfig.enabledTools,
      },
      model,
      user: fullUserData,
      resolvedConversationIdRef,
      sessionHash: rateLimitResult.sessionHash,
      supabaseClient,
      fullUserData,
      requestStartTime,
      dbOperationsPromise,
      abortController,
      conversationId,
      contextMetadata: trimResult.metadata,
      customPrompt: userPreferences?.custom_prompt,
    });

    // ============================================
    // Stage 10: Create stream
    // ============================================
    const stream = createUIMessageStream(streamConfig);

    // ============================================
    // Stage 11: Return SSE response
    // ============================================
    const sseHeaders = new Headers({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });
    applyRateLimitHeaders(sseHeaders, rateLimitResult.rateLimitHeaders.headers, rateLimitResult.rateLimitHeaders.setCookieHeader);
    applyConversationIdHeader(sseHeaders, resolvedConversationIdRef.current ?? conversationId);

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
      headers: sseHeaders,
    });

  } catch (error) {
    // Handle custom errors first
    if (error instanceof ValidationError) {
      logger.error('Chat API validation error', error);
      return NextResponse.json(
        {
          error: error.message,
          validationErrors: error.validationErrors,
        },
        { status: error.statusCode }
      );
    }

    if (error instanceof ModelAccessError ||
        error instanceof ChatModeError ||
        error instanceof StreamingError ||
        error instanceof ProviderError) {
      logger.error('Chat API custom error', error);
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    // Handle unknown errors with sanitization
    const sanitizedMessage = handleApiError(error, 'api/chat');

    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat
 * Return API information
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '2.0.0',
    features: {
      reasoning: true,
      streaming: true,
      parallelOperations: true,
      providerConfigs: true,
    },
    endpoints: {
      POST: 'Stream AI chat responses with reasoning support',
    },
  });
}
