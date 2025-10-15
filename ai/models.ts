/**
 * Model Configuration System
 * Centralized model metadata, capabilities, and access control
 */

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
  
  // ============================================
  // LIMITS & PERFORMANCE
  // ============================================
  maxOutputTokens: number;    // Maximum output tokens
  contextWindow: number;      // Total context window size
  
  // ============================================
  // UI METADATA
  // ============================================
  category: 'Free' | 'Pro' | 'Premium';
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
    
    // Limits
    maxOutputTokens: 65536,
    contextWindow: 131072,
    
    // UI
    category: 'Free',
    tags: ['fast', 'reasoning', 'new'],
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
    
    // Limits
    maxOutputTokens: 16000,
    contextWindow: 131072,
    
    // UI
    category: 'Pro',
    tags: ['smart', 'reasoning'],
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
    
    // Limits
    maxOutputTokens: 4000,
    contextWindow: 131000,
    
    // UI
    category: 'Free',
    tags: ['fast'],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get model configuration by value
 */
export function getModelConfig(modelValue: string): ModelConfig | undefined {
  return models.find((m) => m.value === modelValue);
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
  user: any,
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
  
  // TODO: Enable Pro enforcement when business model is ready
  // if (model.requiresPro && !isPro) {
  //   return { canUse: false, reason: 'Pro subscription required' };
  // }
  
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

