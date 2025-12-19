/**
 * Chat Mode Utilities
 * Maps between chat mode IDs (used internally) and UI option names (displayed to users)
 */

/**
 * Mapping from chat mode ID to UI option name
 */
const CHAT_MODE_TO_OPTION: Record<string, string> = {
  'chat': 'Chat',
  'web': 'Web Search (Exa)',
  'arxiv': 'arXiv',
};

/**
 * Mapping from UI option name to chat mode ID
 */
const OPTION_TO_CHAT_MODE: Record<string, string> = {
  'Chat': 'chat',
  'Web Search (Exa)': 'web',
  'arXiv': 'arxiv',
};

/**
 * Convert chat mode ID to UI option name
 * @param chatMode - Chat mode ID (e.g., 'chat', 'web', 'arxiv')
 * @returns UI option name (e.g., 'Chat', 'Web Search (Exa)', 'arXiv')
 */
export function getOptionFromChatMode(chatMode: string): string {
  return CHAT_MODE_TO_OPTION[chatMode] || 'Chat';
}

/**
 * Convert UI option name to chat mode ID
 * @param optionName - UI option name (e.g., 'Chat', 'Web Search (Exa)', 'arXiv')
 * @returns Chat mode ID (e.g., 'chat', 'web', 'arxiv')
 */
export function getChatModeFromOption(optionName: string): string {
  return OPTION_TO_CHAT_MODE[optionName] || 'chat';
}

