/**
 * Chat mode utility functions
 * Maps between internal chat mode values and UI option names
 */

/**
 * Map internal chat mode to WebSearchSelector option name
 */
export function getOptionFromChatMode(mode: string): string {
  const mapping: Record<string, string> = {
    chat: 'Chat',
    web: 'Web Search (Exa)',
    'web-search': 'Web Search (Exa)',
    arxiv: 'arXiv',
  };
  return mapping[mode] || 'Chat';
}

/**
 * Map WebSearchSelector option name to internal chat mode
 */
export function getChatModeFromOption(optionName: string): string {
  const mapping: Record<string, string> = {
    'Chat': 'chat',
    'Web Search (Exa)': 'web',
    'arXiv': 'arxiv',
  };
  return mapping[optionName] || 'chat';
}

