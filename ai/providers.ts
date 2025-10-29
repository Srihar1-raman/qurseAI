/**
 * AI Provider System
 * Unified provider abstraction for all AI models across different providers
 */

import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { groq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Reasoning Middleware
 * Extracts reasoning/thinking content from model responses
 * Uses <think> tags which are standardized across providers
 */
const reasoningMiddleware = extractReasoningMiddleware({
  tagName: 'think',
});

/**
 * Helper function to wrap models with reasoning middleware
 * Used for models that support reasoning/thinking capabilities
 * Accepts any language model type (groq, xai, anannas, etc.)
 */
function wrapReasoningModel(model: Parameters<typeof wrapLanguageModel>[0]['model']) {
  return wrapLanguageModel({
    model,
    middleware: [reasoningMiddleware],
  });
}

/**
 * Anannas AI - OpenAI-compatible provider with access to multiple models
 * Cheaper alternative to direct API access for many models
 */
const anannas = createOpenAI({
  baseURL: 'https://api.anannas.ai/v1',
  apiKey: process.env.ANANNAS_API_KEY || '',
  headers: {
    'HTTP-Referer': 'https://qurse.app',
    'X-Title': 'Qurse',
    'Content-Type': 'application/json',
  },
});

/**
 * Qurse Unified Provider
 * All models accessible through qurse.languageModel('model-id')
 * 
 * Adding new models:
 * 1. Add model to languageModels below
 * 2. Add configuration to ai/models.ts
 * 3. Done! No other changes needed.
 */
export const qurse = customProvider({
  languageModels: {
    // ============================================
    // GROQ MODELS (Free, Fast)
    // ============================================
    'openai/gpt-oss-120b': wrapReasoningModel(groq('openai/gpt-oss-120b')),
    
    // ============================================
    // XAI MODELS (Grok)
    // ============================================
    'grok-3-mini': wrapReasoningModel(xai('grok-3-mini')),
    
    // ============================================
    // ANANNAS MODELS (Via OpenAI-compatible API)
    // ============================================
    // Kimi K2 does not support reasoning, keep unwrapped
    'moonshotai/kimi-k2-instruct': anannas.chat('moonshotai/kimi-k2-instruct'),
    
    // ============================================
    // FUTURE: Add more models here
    // ============================================
    // For reasoning models: wrapReasoningModel(groq('model-name'))
    // For non-reasoning models: groq('model-name') or xai('model-name')
    // 'llama-70b': groq('llama-3.3-70b-versatile'),
    // 'claude-sonnet': wrapReasoningModel(anthropic('claude-3-5-sonnet')),
    // 'gemini-flash': google('gemini-2.0-flash-exp'),
  },
});

// Export as default for cleaner imports
export default qurse;

