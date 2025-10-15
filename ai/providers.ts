/**
 * AI Provider System
 * Unified provider abstraction for all AI models across different providers
 */

import { customProvider } from 'ai';
import { groq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { createOpenAI } from '@ai-sdk/openai';

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
    'openai/gpt-oss-120b': groq('openai/gpt-oss-120b'),
    
    // ============================================
    // XAI MODELS (Grok)
    // ============================================
    'grok-3-mini': xai('grok-3-mini'),
    
    // ============================================
    // ANANNAS MODELS (Via OpenAI-compatible API)
    // ============================================
    'moonshotai/kimi-k2-instruct': anannas.chat('moonshotai/kimi-k2-instruct'),
    
    // ============================================
    // FUTURE: Add more models here
    // ============================================
    // 'llama-70b': groq('llama-3.3-70b-versatile'),
    // 'claude-sonnet': anthropic('claude-3-5-sonnet'),
    // 'gemini-flash': google('gemini-2.0-flash-exp'),
  },
});

// Export as default for cleaner imports
export default qurse;

