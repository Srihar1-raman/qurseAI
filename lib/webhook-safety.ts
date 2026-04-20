/**
 * Webhook Safety - Minimal but Robust Protection
 *
 * Provides essential safety features for webhook processing:
 * - Idempotency protection against duplicate webhooks
 * - Basic validation to prevent crashes
 * - Simple concurrency protection
 */

import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('webhook-safety');

// Simple in-memory cache for processed webhooks
const processedWebhooks = new Map<string, number>();
const processingLocks = new Map<string, Promise<unknown>>();

// Clean up old entries every hour
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (timestamp < oneHourAgo) {
      processedWebhooks.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Generate unique webhook ID for idempotency
 */
export const generateWebhookId = (payload: { type?: string; data?: Record<string, unknown> }): string => {
  const type = payload.type || 'unknown';
  const data = payload.data || {};
  const id = data.id as string || data.subscription_id as string || data.payment_id as string || 'no-id';
  const timestamp = (data.timestamp || data.created_at) as number || Date.now();

  return `${type}_${id}_${timestamp}`;
};

/**
 * Check if webhook was already processed
 */
export const isWebhookProcessed = (webhookId: string): boolean => {
  return processedWebhooks.has(webhookId);
};

/**
 * Mark webhook as processed
 */
export const markWebhookProcessed = (webhookId: string): void => {
  processedWebhooks.set(webhookId, Date.now());
};

/**
 * Basic webhook payload validation
 */
export const validateWebhookPayload = (payload: Record<string, unknown>): { isValid: boolean; error?: string } => {
  if (!payload) {
    return { isValid: false, error: 'Empty payload' };
  }

  if (!payload.type || typeof payload.type !== 'string') {
    return { isValid: false, error: 'Missing or invalid webhook type' };
  }

  if (!payload.data || typeof payload.data !== 'object') {
    return { isValid: false, error: 'Missing or invalid webhook data' };
  }

  return { isValid: true };
};

/**
 * Extract user ID with validation
 * Tries multiple metadata paths to handle webhook structure variations
 */
export const extractUserIdSafely = (payload: { data?: Record<string, unknown> }): { userId: string | null; error?: string } => {
  if (!payload?.data) {
    return { userId: null, error: 'No data in payload' };
  }

  const data = payload.data;
  const metadata = data.metadata as Record<string, unknown> | undefined;
  const customer = data.customer as Record<string, unknown> | undefined;
  const customerMetadata = customer?.metadata as Record<string, unknown> | undefined;

  // Try all possible metadata paths (Dodo may change structure)
  const userId = (metadata?.user_id as string) ||
                 (metadata?.userId as string) ||
                 (customerMetadata?.user_id as string) ||
                 (customerMetadata?.userId as string) ||
                 null;

  if (!userId) {
    return { userId: null, error: 'No user ID found in webhook metadata' };
  }

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return { userId: null, error: 'Invalid user ID format' };
  }

  return { userId: userId.trim() };
};

/**
 * Process webhook with safety protections
 */
export const processWebhookSafely = async <T>(
  webhookId: string,
  userId: string,
  processor: () => Promise<T>
): Promise<{ success: boolean; result?: T; error?: string }> => {
  // Check if already processed
  if (isWebhookProcessed(webhookId)) {
    logger.warn('Duplicate webhook ignored', { webhookId });
    return { success: true, error: 'Duplicate webhook ignored' };
  }

  // Check if already processing (concurrency protection)
  const lockKey = userId; // Lock by user only to prevent all concurrent webhooks for same user
  if (processingLocks.has(lockKey)) {
    logger.warn('Concurrent webhook processing detected, waiting', { lockKey });
    try {
      await processingLocks.get(lockKey);
    } catch {
      // Ignore errors from concurrent processing
    }

    // Check again if processed while waiting
    if (isWebhookProcessed(webhookId)) {
      return { success: true, error: 'Processed by concurrent request' };
    }
  }

  // Create processing lock
  const processingPromise = (async () => {
    try {
      logger.debug('Processing webhook', { webhookId });
      const result = await processor();

      // Mark as processed only on success
      markWebhookProcessed(webhookId);
      logger.debug('Webhook processed successfully', { webhookId });

      return { success: true, result };
    } catch (error) {
      logger.error('Webhook processing failed', { webhookId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Remove processing lock
      processingLocks.delete(lockKey);
    }
  })();

  processingLocks.set(lockKey, processingPromise);
  return await processingPromise;
};

/**
 * Safe wrapper for webhook handlers
 */
export const createSafeWebhookHandler = <T extends unknown[]>(
  handlerName: string,
  handler: (payload: Record<string, unknown>, ...args: T) => Promise<void>
) => {
  return async (payload: Record<string, unknown>, ...args: T): Promise<void> => {
    try {
      // Basic validation
      const validation = validateWebhookPayload(payload);
      if (!validation.isValid) {
        logger.error(`Invalid ${handlerName} webhook`, { error: validation.error });
        return;
      }

      // Extract user ID safely
      const { userId, error } = extractUserIdSafely(payload);
      if (!userId) {
        logger.error(`${handlerName} webhook missing user ID`, { error });
        return;
      }

      // Generate webhook ID
      const webhookId = generateWebhookId(payload);

      // Process safely with protections
      await processWebhookSafely(webhookId, userId, async () => {
        await handler(payload, ...args);
      });

    } catch (error) {
      logger.error(`Unexpected error in ${handlerName} webhook`, { error });
    }
  };
};
