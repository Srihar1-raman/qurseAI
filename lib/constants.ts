// Search configuration constants
import type { SearchOption } from './types';

// Web search options
export const WEB_SEARCH_OPTIONS: SearchOption[] = [
  { name: 'Chat', enabled: false, icon: 'chat' },
  { name: 'Web Search (Exa)', enabled: true, icon: 'exa' },
  { name: 'arXiv', enabled: false, icon: 'arxiv-logo' }
];

// Export short names for convenience
export const searchOptions = WEB_SEARCH_OPTIONS;

