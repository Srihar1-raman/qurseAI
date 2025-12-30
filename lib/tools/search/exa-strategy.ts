/**
 * Exa Search Strategy
 * Primary search provider implementation
 */

import type { SearchStrategy, SearchResults, SearchParams } from './types';

const EXA_API_BASE = 'https://api.exa.ai/search';
const EXA_API_KEY = process.env.EXA_API_KEY;
const REQUEST_TIMEOUT = 30000; // 30 seconds

export class ExaSearchStrategy implements SearchStrategy {
  readonly provider = 'exa' as const;

  async search(params: SearchParams): Promise<SearchResults> {
    if (!EXA_API_KEY) {
      throw new Error('EXA_API_KEY environment variable is not set');
    }

    const { query, numResults = 10, type = 'auto' } = params;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(EXA_API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': EXA_API_KEY,
        },
        body: JSON.stringify({
          query,
          numResults,
          type,
          text: true, // Include markdown content (Exa API uses 'text' not 'contents')
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Better error handling for specific status codes
      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new Error('Invalid Exa API key');
          case 429:
            throw new Error('Exa API rate limit exceeded');
          case 400:
            throw new Error('Invalid search parameters for Exa API');
          case 500:
          case 502:
          case 503:
            throw new Error('Exa API service error, please try again');
          default:
            throw new Error(`Exa API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      // Validate response structure
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid Exa API response format');
      }

      // Normalize Exa response to unified format
      const results = data.results.map((item: any) => ({
        title: item.title || 'Untitled',
        url: item.url,
        text: item.text || '', // Markdown content
        publishedDate: item.publishedDate,
        score: item.score,
        author: item.author,
      }));

      return {
        results,
        query,
        provider: 'exa',
        totalCount: results.length,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Exa search request timed out');
        }
        // Re-throw our custom errors
        if (error.message.startsWith('Exa')) {
          throw error;
        }
        throw new Error(`Exa search failed: ${error.message}`);
      }
      throw new Error('Exa search failed: Unknown error');
    }
  }
}
