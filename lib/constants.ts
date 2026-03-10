// Search configuration constants
import type { SearchOption } from './types';

// Web search options
export const WEB_SEARCH_OPTIONS: SearchOption[] = [
  { name: 'Chat', enabled: true, icon: 'chat' },
  { name: 'Web Search', enabled: true, icon: 'search' },
  { name: 'Finance', enabled: true, icon: 'trending-up' },
  { name: 'Science & Math', enabled: true, icon: 'science-math' },
  { name: 'arXiv', enabled: true, icon: 'arxiv-logo' },
  { name: 'Scopus', enabled: true, icon: 'scopus' },
  { name: 'Code', enabled: true, icon: 'code' },
  { name: 'GitHub', enabled: true, icon: 'github' }
];

// Export short names for convenience
export const searchOptions = WEB_SEARCH_OPTIONS;

