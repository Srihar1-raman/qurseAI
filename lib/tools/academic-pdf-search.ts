import { tool } from 'ai';
import { z } from 'zod';

interface FirecrawlResult {
  url: string;
  title: string;
  description: string;
  position: number;
  category: string;
}

export const academicPdfSearchTool = tool({
  description: 'Search academic papers and PDFs using Firecrawl. Use for finding research papers, academic documents, or PDF files on specific topics. Supports arXiv (preprints), research (academic websites), and PDF search.',
  inputSchema: z.object({
    query: z.string().describe('Search query for academic papers or PDFs'),
    source: z.enum(['arxiv', 'research', 'pdf']).describe('Source to search: "arxiv" for arXiv preprints, "research" for academic/research websites, "pdf" for PDF documents'),
    maxResults: z.number().min(1).max(50).default(10).describe('Number of results to return (1-50)'),
    tbs: z.string().optional().describe('Time filter: "qdr:w" (past week), "qdr:m" (past month), "qdr:y" (past year), "sbd:1" (sort by date)'),
  }),
  execute: async ({ query, source, maxResults, tbs }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not set');
    }

    let categories: string[] = [];
    let searchQuery = query;

    if (source === 'arxiv') {
      categories = ['research'];
      searchQuery = `site:arxiv.org ${query}`;
    } else if (source === 'research') {
      categories = ['research'];
    } else if (source === 'pdf') {
      categories = ['pdf'];
    }

    const response = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        categories,
        limit: maxResults,
        ...(tbs && { tbs }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      source,
      results: data.data.web.map((result: FirecrawlResult) => ({
        url: result.url,
        title: result.title,
        description: result.description,
        position: result.position,
        category: result.category,
      })),
    };
  },
});
