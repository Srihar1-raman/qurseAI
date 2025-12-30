/**
 * Search Provider Types
 * Unified types for all search providers (Exa, Tavily, etc.)
 */

/**
 * Normalized search result from any provider
 */
export interface SearchResult {
  title: string;
  url: string;
  text: string; // Markdown-formatted content
  publishedDate?: string;
  score?: number;
  author?: string;
}

/**
 * Search response (normalized across providers)
 */
export interface SearchResults {
  results: SearchResult[];
  query: string;
  provider: 'exa' | 'tavily';
  totalCount: number;
}

/**
 * Search parameters (common interface)
 * Note: 'type' is Exa-specific, Tavily will ignore it
 */
export interface SearchParams {
  query: string;
  numResults?: number;
  type?: 'auto' | 'neural' | 'keyword'; // Exa-specific: auto, neural, keyword, deep, fast
  searchDepth?: 'basic' | 'advanced'; // Tavily-specific
}

/**
 * Academic search parameters (extends base)
 */
export interface AcademicSearchParams extends SearchParams {
  // Exa doesn't require extra params for academic
  // Query formatting happens in tool execute function
}

/**
 * Search strategy interface
 * All providers must implement this interface
 */
export interface SearchStrategy {
  readonly provider: 'exa' | 'tavily';
  search(params: SearchParams): Promise<SearchResults>;
}
