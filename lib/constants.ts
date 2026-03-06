// Search configuration constants
import type { SearchOption } from './types';

// Web search options
export const WEB_SEARCH_OPTIONS: SearchOption[] = [
  { name: 'Chat', enabled: true, icon: 'chat' },
  { name: 'Web Search', enabled: true, icon: 'search' },
  { name: 'Finance', enabled: true, icon: 'trending-up' }
];

// Export short names for convenience
export const searchOptions = WEB_SEARCH_OPTIONS;

