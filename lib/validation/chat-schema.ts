/**
 * Chat API Request Validation Schema
 * Industry-standard validation using Zod for request body validation
 */

import { z } from 'zod';
import { getModelConfig } from '@/ai/models';
import { chatModeExists } from '@/ai/config';

/**
 * UUID v4 validation regex (RFC 4122)
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates UUID format
 */
const uuidSchema = z.string().regex(UUID_REGEX, {
  message: 'Conversation ID must be a valid UUID format',
});

/**
 * Validate UUID format (helper function for route params)
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Validate conversation ID (supports regular UUID or temp-UUID format)
 */
export function isValidConversationId(id: string): boolean {
  if (id.startsWith('temp-')) {
    const uuidPart = id.slice(5);
    return UUID_REGEX.test(uuidPart);
  }
  return UUID_REGEX.test(id);
}

/**
 * Message part schema for UIMessage format
 */
const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

/**
 * Message schema - supports both UIMessage and ModelMessage formats
 */
const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']).optional(),
  // UIMessage format: parts array
  parts: z.array(messagePartSchema).optional(),
  // ModelMessage format: content string
  content: z.string().optional(),
}).refine(
  (data) => {
    // Must have either parts or content
    return (data.parts && data.parts.length > 0) || (data.content && data.content.length > 0);
  },
  {
    message: 'Message must have either parts array or content string',
  }
).refine(
  (data) => {
    // Validate total content length
    if (data.parts && Array.isArray(data.parts)) {
      const totalLength = data.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text || '')
        .join('').length;
      return totalLength <= 10000;
    }
    if (data.content) {
      return data.content.length <= 10000;
    }
    return true;
  },
  {
    message: 'Message content must not exceed 10,000 characters',
  }
);

/**
 * Custom validation for model names
 * Validates that the model exists in the model registry
 */
const modelSchema = z.string().refine(
  (model) => {
    const modelConfig = getModelConfig(model);
    return modelConfig !== undefined;
  },
  {
    message: 'Invalid model name. Model must exist in the model registry.',
  }
);

/**
 * Custom validation for chat modes
 * Validates that the chat mode exists in the registry
 */
const chatModeSchema = z.string().refine(
  (mode) => {
    return chatModeExists(mode);
  },
  {
    message: 'Invalid chat mode. Mode must exist in the chat mode registry.',
  }
);

/**
 * Main chat API request schema
 */
export const chatRequestSchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1, 'At least one message is required')
    .max(100, 'Maximum 100 messages per request'),
  
  conversationId: z
    .string()
    .optional()
    .refine(
      (id) => {
        // If conversationId is provided, it must be a valid UUID
        // Guest users can have temp- prefixed IDs
        if (!id) return true;
        if (id.startsWith('temp-')) {
          // Validate the part after temp- is a valid UUID
          const uuidPart = id.slice(5);
          return UUID_REGEX.test(uuidPart);
        }
        return UUID_REGEX.test(id);
      },
      {
        message: 'Conversation ID must be a valid UUID or temp-UUID format',
      }
    ),
  
  model: modelSchema.default('openai/gpt-oss-120b'),
  
  chatMode: chatModeSchema.default('chat'),
});

/**
 * Type inference for validated request
 */
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Validation helper function
 * Validates request body and returns typed data or throws ValidationError
 */
export function validateChatRequest(body: unknown): ChatRequest {
  return chatRequestSchema.parse(body);
}

/**
 * Safe validation that returns result instead of throwing
 * Useful for error handling
 */
export function safeValidateChatRequest(body: unknown): {
  success: boolean;
  data?: ChatRequest;
  errors?: z.ZodError;
} {
  const result = chatRequestSchema.safeParse(body);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * URL Search Params Schema
 * Validates URL query parameters
 */
export const urlSearchParamsSchema = z.object({
  message: z
    .string()
    .max(10000, 'Message parameter must not exceed 10,000 characters')
    .optional(),
  model: modelSchema.optional(),
  mode: chatModeSchema.optional(),
});

/**
 * Type inference for URL search params
 */
export type UrlSearchParams = z.infer<typeof urlSearchParamsSchema>;

/**
 * Validate URL search parameters
 */
export function validateUrlSearchParams(
  params: Record<string, string | undefined>
): { success: boolean; data?: UrlSearchParams; errors?: z.ZodError } {
  const result = urlSearchParamsSchema.safeParse(params);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Safely decode URI component with error handling
 */
export function safeDecodeURIComponent(encoded: string): string | null {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

