/**
 * Search Strategy Factory
 * Creates search strategy instances
 */

import type { SearchStrategy } from './types';
import { ExaSearchStrategy } from './exa-strategy';
import { TavilySearchStrategy } from './tavily-strategy';

export type SearchProvider = 'exa' | 'tavily';

// Export strategy classes for direct access if needed
export { ExaSearchStrategy, TavilySearchStrategy };

/**
 * Create search strategy instance
 * @param provider - Search provider to use
 * @returns SearchStrategy instance
 */
export function createSearchStrategy(provider: SearchProvider = 'exa'): SearchStrategy {
  switch (provider) {
    case 'exa':
      return new ExaSearchStrategy();
    case 'tavily':
      return new TavilySearchStrategy();
    default:
      // Fallback to Exa
      return new ExaSearchStrategy();
  }
}

/**
 * Get default search provider
 */
export function getDefaultProvider(): SearchProvider {
  return 'exa'; // Exa is primary
}
