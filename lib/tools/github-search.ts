import { tool } from 'ai';
import { z } from 'zod';

export const githubSearchTool = tool({
  description: 'Search GitHub repositories, code, issues, and documentation. Use for finding open source projects, libraries, frameworks, tools, or specific repositories by topic, technology, or name.',
  inputSchema: z.object({
    query: z.string().describe('Search query for GitHub repositories (e.g., "react", "machine learning", "python web framework")'),
    limit: z.number().min(1).max(50).default(10).describe('Number of results to return (1-50)'),
    tbs: z.string().optional().describe('Time filter: "qdr:w" (past week), "qdr:m" (past month), "qdr:y" (past year), "sbd:1" (sort by date)'),
  }),
  execute: async ({ query, limit, tbs }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not set');
    }

    const response = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        categories: ['github'],
        limit,
        ...(tbs && { tbs }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      results: data.data.web.map((result: any) => ({
        url: result.url,
        title: result.title,
        description: result.description,
        position: result.position,
        category: result.category,
      })),
    };
  },
});
