/**
 * Academic Search Tool
 * Searches for academic papers, research articles, and scholarly content
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createSearchStrategy, getDefaultProvider } from './search/factory';
import { registerTool } from './registry';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('tools/academic-search');

/**
 * Academic Search Tool
 * Searches for academic papers, research articles, and scholarly content
 * Uses Exa with academic-specific query formatting
 */
registerTool('academic_search', tool({
  description: 'Search for academic papers, research articles, and scholarly content. Best for finding peer-reviewed sources, citations, and scientific literature.',

  inputSchema: z.object({
    query: z.string().describe('The research topic or paper title to search for'),
    numResults: z.number().optional().describe('Number of results to return (default: 10)'),
  }),

  execute: async ({ query, numResults = 10 }) => {
    logger.info('Executing academic search', { query, numResults });

    try {
      const searchStrategy = createSearchStrategy(getDefaultProvider());

      // Format query for academic search
      // Exa's neural search automatically prioritizes academic sources with appropriate queries
      const academicQuery = `${query} academic research paper scholarly peer-reviewed`;

      const results = await searchStrategy.search({
        query: academicQuery,
        numResults,
        type: 'neural', // Neural search is better for academic content
      });

      logger.info('Academic search completed', {
        resultCount: results.results.length,
        provider: results.provider,
      });

      // Return results with academic-specific formatting
      return {
        results: results.results.map((r, idx) => ({
          index: idx + 1,
          title: r.title,
          url: r.url,
          content: r.text,
          publishedDate: r.publishedDate,
          author: r.author,
        })),
        query: results.query,
        provider: results.provider,
        totalCount: results.totalCount,
      };
    } catch (error) {
      logger.error('Academic search failed', error);

      return {
        error: true,
        message: error instanceof Error ? error.message : 'Academic search failed',
        results: [],
        query,
        totalCount: 0,
      };
    }
  },
}));

// Tool is self-registering, no additional export needed
