/**
 * Model Configuration System
 * Centralized model metadata, capabilities, and access control
 */

import type { User } from '@/lib/types';

/**
 * Provider-Specific Option Types
 */

// Groq provider options
export interface GroqOptions {
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  reasoningFormat?: 'visible' | 'hidden';
  parallelToolCalls?: boolean;
  structuredOutputs?: boolean;
}

// XAI provider options
export interface XaiOptions {
  parallel_tool_calls?: boolean;
}

// Anannas (OpenAI-compatible) options
export interface AnannasOptions {
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  parallelToolCalls?: boolean;
}

/**
 * Model Configuration Interface
 * Defines all metadata for an AI model
 */
export interface ModelConfig {
  // ============================================
  // IDENTITY
  // ============================================
  value: string;              // Unique identifier (e.g., 'openai/gpt-oss-120b')
  label: string;              // Display name (e.g., 'GPT OSS 120B')
  description: string;        // User-facing description
  provider: string;           // Provider name (e.g., 'groq', 'xai', 'anannas')
  
  // ============================================
  // CAPABILITIES
  // ============================================
  vision: boolean;            // Supports image inputs
  reasoning: boolean;         // Has reasoning/thinking capabilities
  streaming: boolean;         // Supports streaming responses
  structuredOutput: boolean;  // Supports structured output (JSON mode)
  
  // ============================================
  // ACCESS CONTROL
  // ============================================
  requiresAuth: boolean;      // Requires user authentication
  requiresPro: boolean;       // Requires Pro subscription
  free: boolean;              // Completely free (no rate limits)
  freeUnlimited?: boolean;     // Completely free with no rate limits (infrastructure flag)
  
  // ============================================
  // ADDITIONAL CAPABILITIES
  // ============================================
  experimental?: boolean;     // Is this model experimental/beta?
  pdf?: boolean;              // Supports PDF file inputs
  
  // ============================================
  // LIMITS & PERFORMANCE
  // ============================================
  maxOutputTokens: number;    // Maximum output tokens
  contextWindow: number;      // Total context window size
  
  // ============================================
  // UI METADATA
  // ============================================
  category: 'Free' | 'Pro';
  tags?: Array<'fast' | 'smart' | 'new' | 'reasoning' | 'vision'>;
  
  // ============================================
  // MODEL PARAMETERS (Optional Overrides)
  // ============================================
  parameters?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
  };
  
  // ============================================
  // REASONING CONFIGURATION (NEW)
  // ============================================
  reasoningConfig?: {
    middleware: 'think' | 'thinkWithStart' | 'native' | 'none';
    streamable: boolean;
    format?: 'hidden' | 'visible';
  };
  
  // ============================================
  // PROVIDER CONFIGURATION (NEW)
  // ============================================
  providerConfig?: {
    groq?: GroqOptions;
    xai?: XaiOptions;
    anannas?: AnannasOptions;
  };
}

/**
 * All Available Models
 * When adding a new model:
 * 1. Add to providers.ts first
 * 2. Add configuration here
 * 3. Model becomes available automatically
 */
export const models: ModelConfig[] = [
  // ============================================
  // GROQ MODELS
  // ============================================
  {
    value: 'openai/gpt-oss-120b',
    label: 'GPT OSS 120B',
    description: "OpenAI's flagship open-weight MoE model with 120B total parameters",
    provider: 'groq',
    
    // Capabilities
    vision: false,
    reasoning: true,
    streaming: true,
    structuredOutput: true,
    
    // Access
    requiresAuth: false,
    requiresPro: false,
    free: true,
    freeUnlimited: true,  // Free with no rate limits
    
    // Additional capabilities
    experimental: false,
    pdf: false,
    
    // Limits
    maxOutputTokens: 65536,
    contextWindow: 131072,
    
    // UI
    category: 'Free',
    tags: ['fast', 'reasoning', 'new'],
    
    // Reasoning configuration
    reasoningConfig: {
      middleware: 'think',
      streamable: true,
    },
    
    // Provider configuration
    providerConfig: {
      groq: {
        reasoningEffort: 'high',
        parallelToolCalls: false,
        structuredOutputs: true,
      },
    },
  },
  
  // ============================================
  // XAI MODELS (Grok)
  // ============================================
  {
    value: 'grok-3-mini',
    label: 'Grok 3 Mini',
    description: 'Fast, smart, and great for logic-based tasks that do not require deep domain knowledge',
    provider: 'xai',
    
    // Capabilities
    vision: false,
    reasoning: true,
    streaming: true,
    structuredOutput: true,
    
    // Access
    requiresAuth: true,
    requiresPro: true,
    free: false,
    freeUnlimited: false,
    
    // Additional capabilities
    experimental: false,
    pdf: false,
    
    // Limits
    maxOutputTokens: 16000,
    contextWindow: 131072,
    
    // UI
    category: 'Pro',
    tags: ['smart', 'reasoning'],
    
    // Reasoning configuration
    reasoningConfig: {
      middleware: 'think',
      streamable: true,
      format: 'hidden',
    },
    
    // Provider configuration
    providerConfig: {
      xai: {
        parallel_tool_calls: false,
      },
    },
  },
  
  // ============================================
  // ANANNAS MODELS
  // ============================================
  {
    value: 'moonshotai/kimi-k2-instruct',
    label: 'Kimi K2',
    description: 'State-of-the-art MoE language model with 32 billion parameters',
    provider: 'anannas',
    
    // Capabilities
    vision: false,
    reasoning: false,
    streaming: true,
    structuredOutput: false,
    
    // Access
    requiresAuth: false,
    requiresPro: false,
    free: true,
    freeUnlimited: true,
    
    // Additional capabilities
    experimental: false,
    pdf: false,
    
    // Limits
    maxOutputTokens: 4000,
    contextWindow: 131000,
    
    // UI
    category: 'Free',
    tags: ['fast'],
    
    // Reasoning configuration
    reasoningConfig: {
      middleware: 'none',
      streamable: false,
    },
    
    // Provider configuration (OpenAI-compatible via Anannas)
    providerConfig: {
      anannas: {
        parallelToolCalls: false,
      },
    },
  },
];

// ============================================
// MODEL CONFIG CACHE
// ============================================

/**
 * Map-based cache for O(1) model config lookups
 * Initialized once at module load time
 */
const modelConfigCache = new Map<string, ModelConfig>();

// Initialize cache with all models at module load
models.forEach((model) => {
  modelConfigCache.set(model.value, model);
});

// ============================================
// ENHANCED HELPER FUNCTIONS
// ============================================

/**
 * Check if model is experimental/beta
 */
export function isExperimentalModel(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.experimental ?? false;
}

/**
 * Check if model supports PDF file inputs
 */
export function hasPdfSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.pdf ?? false;
}

/**
 * Check if model is free with unlimited usage (no rate limits)
 * Infrastructure hook for future rate limiting business logic
 */
export function isFreeUnlimited(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.freeUnlimited ?? false;
}

/**
 * Check if user should bypass rate limits for a model
 * Infrastructure hook - actual rate limiting enforcement is business logic
 * @param modelValue - Model identifier
 * @param user - User object (null if guest)
 * @returns True if rate limits should be bypassed
 */
export function shouldBypassRateLimits(modelValue: string, user: User | null): boolean {
  // If model is free unlimited and user is authenticated, bypass limits
  // Note: This is infrastructure-level check for free unlimited models.
  // Actual subscription-based rate limiting is handled by business logic layer (rate-limiting service).
  const model = getModelConfig(modelValue);
  return Boolean(user && model?.freeUnlimited);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get model configuration by value
 * Uses Map-based cache for O(1) lookup performance
 */
export function getModelConfig(modelValue: string): ModelConfig | undefined {
  return modelConfigCache.get(modelValue);
}

/**
 * Check if model requires authentication
 */
export function requiresAuthentication(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.requiresAuth ?? false;
}

/**
 * Check if model requires Pro subscription
 */
export function requiresProSubscription(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.requiresPro ?? false;
}

/**
 * Check if user can use a specific model
 * @param modelValue - Model identifier
 * @param user - User object (null if guest)
 * @param isPro - Whether user has Pro subscription
 * @returns Object with canUse boolean and optional reason
 */
export function canUseModel(
  modelValue: string,
  user: User | null,
  isPro: boolean
): { canUse: boolean; reason?: string } {
  const model = getModelConfig(modelValue);
  
  if (!model) {
    return { canUse: false, reason: 'Model not found' };
  }
  
  // Check authentication requirement
  if (model.requiresAuth && !user) {
    return { canUse: false, reason: 'Authentication required' };
  }
  
  // Check Pro subscription requirement
  if (model.requiresPro && !isPro) {
    return { canUse: false, reason: 'Pro subscription required' };
  }
  
  return { canUse: true };
}

/**
 * Get all models by category
 */
export function getModelsByCategory(category: ModelConfig['category']): ModelConfig[] {
  return models.filter((m) => m.category === category);
}

/**
 * Get all free models
 */
export function getFreeModels(): ModelConfig[] {
  return models.filter((m) => m.free);
}

/**
 * Check if model supports vision
 */
export function hasVisionSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.vision ?? false;
}

/**
 * Check if model supports reasoning
 */
export function hasReasoningSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.reasoning ?? false;
}

/**
 * Get model's maximum output tokens
 */
export function getMaxOutputTokens(modelValue: string): number {
  const model = getModelConfig(modelValue);
  return model?.maxOutputTokens ?? 8000;
}

/**
 * Get model parameters (for use in streamText)
 */
export function getModelParameters(modelValue: string): ModelConfig['parameters'] {
  const model = getModelConfig(modelValue);
  return model?.parameters ?? {};
}

/**
 * Get provider-specific options for a model
 * Returns configuration for the appropriate provider
 */
export function getProviderOptions(modelValue: string): {
  groq?: GroqOptions;
  xai?: XaiOptions;
  openai?: AnannasOptions;
} {
  const model = getModelConfig(modelValue);
  if (!model?.providerConfig) return {};
  
  // Return provider-specific configs
  const options: {
    groq?: GroqOptions;
    xai?: XaiOptions;
    openai?: AnannasOptions;
  } = {};
  
  if (model.provider === 'groq' && model.providerConfig.groq) {
    options.groq = model.providerConfig.groq;
  }
  
  if (model.provider === 'xai' && model.providerConfig.xai) {
    options.xai = model.providerConfig.xai;
  }
  
  if (model.provider === 'anannas' && model.providerConfig.anannas) {
    options.openai = model.providerConfig.anannas;
  }
  
  return options;
}

