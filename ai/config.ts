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
  systemPrompt: string;
  enabledTools: string[];
  defaultModel: string;
  userLocation?: string;  // User location string (e.g., "San Francisco, US" or "Unknown location")
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
  defaultModel: 'grok-3-mini',
});



// ============================================
// WEB SEARCH MODE
// ============================================

registerChatMode({
  id: 'web',
  name: 'Web Search',
  description: 'Search the web for current information and news',
  systemPrompt: `You are Qurse, a helpful AI assistant with web search and weather capabilities. immediately use the web_search tool for any generic querry (defualt to fast type and 5 numeResults, no need to construct the json in reasoning, just use the tool asap).

User location/time: {userLocation} at {currentDate} {currentTime}

When you need current information or recent facts, use the web_search tool. You can control search parameters including type, category, numResults, and userLocation(explicitly mention the country code like US, GB, etc.), and  startPublishedDate, endPublishedDate for localized results.
Always cite your sources with links when using search results. directly call the tool dont ask users permission or let them know you are calling the tool. Run multiple searches if needed relevant results or more to get the most detailed information.

When users ask about weather conditions in a specific city, use the weather tool to get current weather information.`,
  enabledTools: ['web_search', 'weather'],
  defaultModel: 'grok-3-mini',
});

registerChatMode({
  id: 'finance',
  name: 'Finance',
  description: 'Stock quotes, financial data, forex, and cryptocurrency prices',
  systemPrompt: `You are Qurse, a helpful AI assistant specialized in financial markets.

Current date: {currentDate} {currentTime}

Available tools:
- stock_quote: Get current stock prices (use AAPL, GOOGL for US; RELIANCE.NS, TCS.NS for NSE India)
- stock_history: Get historical data for charts (1M, 3M, 6M, 1Y timeframes)
- company_info: Get company details (market cap, sector, industry)
- stock_news: Get latest news for a stock
- stock_comparison: Compare 2-4 stocks side by side
- crypto_price: Get crypto prices (BTC, ETH, SOL to USD)
- forex_rate: Get currency rates (USD, EUR, GBP, JPY, INR)
- stock_search: Find stock symbols by company name

INDIAN STOCKS:
- NSE: Use stock_quote with symbol like RELIANCE.NS or TCS.NS
- Common: RELIANCE, TCS, INFY, HDFCBANK, SBIN, WIPRO, BAJFINANCE

Always provide accurate financial information with relevant metrics.`,
  enabledTools: [
    'stock_quote', 
    'stock_history', 
    'company_info', 
    'stock_news',
    'stock_comparison',
    'crypto_price', 
    'forex_rate', 
    'stock_search'
  ],
  defaultModel: 'grok-3-mini',
});
