import { tool } from 'ai';
import { z } from 'zod';

export const webSearchTool = tool({
  description: 'Search the web for current information, news, and facts',
  inputSchema: z.object({
    query: z.string().describe('The search query to perform'),
    type: z.enum(['auto', 'keyword', 'neural', 'fast', 'deep']).default('auto').describe('Search algorithm type'),
    numResults: z.number().min(1).max(100).default(10).describe('Number of results to return'),
    userLocation: z.string().optional().describe('ISO country code for localized results (e.g., US, GB)'),
    category: z.enum(['company', 'research paper', 'news', 'pdf', 'github', 'personal site', 'linkedin profile', 'financial report']).optional().describe('Content category to focus search on'),
    startPublishedDate: z.string().optional().describe('Only links with a published date after this will be returned. ISO 8601 format (e.g., 2023-01-01T00:00:00.000Z)'),
    endPublishedDate: z.string().optional().describe('Only links with a published date before this will be returned. ISO 8601 format (e.g., 2023-12-31T00:00:00.000Z)'),
  }),
  execute: async ({ query, type, numResults, userLocation, category, startPublishedDate, endPublishedDate }) => {
    const exaApiKey = process.env.EXA_API_KEY;

    if (!exaApiKey) {
      throw new Error('EXA_API_KEY is not set');
    }

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': exaApiKey,
      },
      body: JSON.stringify({
        query,
        type: type || 'auto',
        numResults: numResults || 10,
        userLocation: userLocation || undefined,
        category: category || undefined,
        startPublishedDate: startPublishedDate || undefined,
        endPublishedDate: endPublishedDate || undefined,
        contents: {
          text: true,
          maxCharacters: 500,
        },
        extras: {
          imageLinks: 1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Exa API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      results: data.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        text: result.text,
        publishedDate: result.publishedDate,
        images: result.extras?.images || [],
      })),
    };
  },
});
