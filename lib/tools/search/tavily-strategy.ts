/**
 * Tavily Search Strategy
 * Fallback search provider implementation
 */

import type { SearchStrategy, SearchResults, SearchParams } from './types';

const TAVILY_API_BASE = 'https://api.tavily.com/search';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const REQUEST_TIMEOUT = 30000; // 30 seconds

export class TavilySearchStrategy implements SearchStrategy {
  readonly provider = 'tavily' as const;

  async search(params: SearchParams): Promise<SearchResults> {
    if (!TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY environment variable is not set');
    }

    const { query, numResults = 10, searchDepth = 'basic' } = params;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(TAVILY_API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          max_results: numResults,
          search_depth: searchDepth, // Now configurable
          include_images: false,
          include_answer: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Better error handling for specific status codes
      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new Error('Invalid Tavily API key');
          case 429:
            throw new Error('Tavily API rate limit exceeded');
          case 400:
            throw new Error('Invalid search parameters for Tavily API');
          case 500:
          case 502:
          case 503:
            throw new Error('Tavily API service error, please try again');
          default:
            throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      // Validate response structure
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid Tavily API response format');
      }

      // Normalize Tavily response to unified format
      // Note: Tavily uses 'content' field, we map it to 'text' for consistency
      const results = data.results.map((item: any) => ({
        title: item.title || 'Untitled',
        url: item.url,
        text: item.content || '', // Tavily uses 'content' field
        publishedDate: item.publishedDate,
        score: item.score,
      }));

      return {
        results,
        query,
        provider: 'tavily',
        totalCount: results.length,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Tavily search request timed out');
        }
        // Re-throw our custom errors
        if (error.message.startsWith('Tavily')) {
          throw error;
        }
        throw new Error(`Tavily search failed: ${error.message}`);
      }
      throw new Error('Tavily search failed: Unknown error');
    }
  }
}
