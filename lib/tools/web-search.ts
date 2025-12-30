/**
 * Web Search Tool
 * Searches the web using Exa (primary) or Tavily (fallback)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createSearchStrategy, getDefaultProvider } from './search/factory';
import { registerTool } from './registry';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('tools/web-search');

/**
 * Web Search Tool
 * Searches the web for current information, news, and general knowledge
 */
registerTool('web_search', tool({
  description: 'Search the web for current information, news, and general knowledge. Returns relevant web pages with markdown-formatted content.',

  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant information'),
    numResults: z.number().optional().describe('Number of results to return (default: 10)'),
  }),

  execute: async ({ query, numResults = 10 }) => {
    logger.info('Executing web search', { query, numResults });

    try {
      const searchStrategy = createSearchStrategy(getDefaultProvider());
      const results = await searchStrategy.search({
        query,
        numResults,
        type: 'auto',
      });

      logger.info('Web search completed', {
        resultCount: results.results.length,
        provider: results.provider,
      });

      // Return results in format AI can easily process
      return {
        results: results.results.map((r, idx) => ({
          index: idx + 1,
          title: r.title,
          url: r.url,
          content: r.text,
          publishedDate: r.publishedDate,
        })),
        query: results.query,
        provider: results.provider,
        totalCount: results.totalCount,
      };
    } catch (error) {
      logger.error('Web search failed', error);

      // Return error in a format the AI can understand
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Search failed',
        results: [],
        query,
        totalCount: 0,
      };
    }
  },
}));

// Tool is self-registering, no additional export needed
