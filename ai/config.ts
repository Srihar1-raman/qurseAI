/**
 * Chat Mode Configuration System
 * Registry pattern for managing different chat modes (chat, web, deep, etc.)
 */

/**
 * Chat Mode Identifier
 * String type for flexibility - modes can be added dynamically
 */
export type ChatMode = string;

/**
 * Chat Mode Configuration
 * Defines how a specific chat mode behaves
 */
export interface ChatModeConfig {
  id: ChatMode;
  name: string;
  description: string;
  systemPrompt: string;        // Instructions sent to the AI
  enabledTools: string[];       // Tool IDs to make available
  defaultModel: string;         // Default model for this mode
  
  // Future expansion fields
  // icon?: string;
  // color?: string;
  // requiresPro?: boolean;
}

/**
 * Chat Mode Registry
 * Internal storage for all registered chat modes
 */
const chatModeRegistry = new Map<ChatMode, ChatModeConfig>();

/**
 * Register a new chat mode
 * @param config - Chat mode configuration
 */
export function registerChatMode(config: ChatModeConfig): void {
  chatModeRegistry.set(config.id, config);
}

/**
 * Get chat mode configuration by ID
 * @param id - Chat mode identifier
 * @returns Chat mode config or undefined if not found
 */
export function getChatMode(id: ChatMode): ChatModeConfig | undefined {
  return chatModeRegistry.get(id);
}

/**
 * Get all registered chat modes
 * @returns Array of all chat mode configurations
 */
export function getAllChatModes(): ChatModeConfig[] {
  return Array.from(chatModeRegistry.values());
}

/**
 * Check if a chat mode exists
 * @param id - Chat mode identifier
 * @returns True if mode is registered
 */
export function chatModeExists(id: ChatMode): boolean {
  return chatModeRegistry.has(id);
}

// ============================================
// DEFAULT CHAT MODES
// ============================================

/**
 * Basic Chat Mode
 * General conversation with no tools
 */
registerChatMode({
  id: 'chat',
  name: 'Chat',
  description: 'General conversation and assistance',
  systemPrompt: `You are Qurse, a helpful and knowledgeable AI assistant.

Your capabilities:
- Provide clear, accurate, and conversational responses
- Help with a wide range of topics including coding, writing, analysis, and general knowledge
- Explain complex concepts in simple terms
- Be honest when you don't know something

Guidelines:
- Be concise but thorough
- Use examples when helpful
- Admit uncertainty rather than guessing
- Stay friendly and professional`,
  enabledTools: [],
  defaultModel: 'openai/gpt-oss-120b',
});

// ============================================
// FUTURE: Add more modes here
// ============================================

// Example of how to add new modes:
/*
registerChatMode({
  id: 'web',
  name: 'Web Search',
  description: 'Search the web for current information',
  systemPrompt: 'You are Qurse with web search capabilities...',
  enabledTools: ['web_search'],
  defaultModel: 'openai/gpt-oss-120b',
});

registerChatMode({
  id: 'arxiv',
  name: 'Academic',
  description: 'Search academic papers and research',
  systemPrompt: 'You are Qurse specialized in academic research...',
  enabledTools: ['arxiv_search'],
  defaultModel: 'grok-3-mini',
});

registerChatMode({
  id: 'deep',
  name: 'Deep Research',
  description: 'Multi-step research with reasoning',
  systemPrompt: 'You are Qurse in deep research mode...',
  enabledTools: ['web_search', 'arxiv_search', 'reasoning'],
  defaultModel: 'grok-3-mini',
});
*/

