import { tool } from 'ai';
import { z } from 'zod';

const ARXIV_API_URL = 'http://export.arxiv.org/api/query';

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: { name: string; affiliation?: string }[];
  published: string;
  updated: string;
  primaryCategory: string;
  categories: string[];
  comment?: string;
  journalRef?: string;
  doi?: string;
  pdfLink?: string;
  absLink: string;
}

interface ArxivSearchResponse {
  entries: ArxivEntry[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
}

function extractArxivId(id: string): string {
  const match = id.match(/abs\/(.+)$/);
  return match ? match[1] : id;
}

function parseAtomResponse(xmlText: string): ArxivSearchResponse {
  const entries: ArxivEntry[] = [];
  
  const totalMatch = xmlText.match(/<opensearch:totalResults[^>]*>(\d+)/);
  const startMatch = xmlText.match(/<opensearch:startIndex[^>]*>(\d+)/);
  const itemsMatch = xmlText.match(/<opensearch:itemsPerPage[^>]*>(\d+)/);
  
  const entryMatches = xmlText.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/g);
  
  for (const match of entryMatches) {
    const entryXml = match[1];
    
    const idMatch = entryXml.match(/<id[^>]*>([^<]+)/);
    const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    const publishedMatch = entryXml.match(/<published[^>]*>([^<]+)/);
    const updatedMatch = entryXml.match(/<updated[^>]*>([^<]+)/);
    const primaryCatMatch = entryXml.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);
    const commentMatch = entryXml.match(/<arxiv:comment[^>]*>([\s\S]*?)<\/arxiv:comment>/);
    const journalRefMatch = entryXml.match(/<arxiv:journal_ref[^>]*>([\s\S]*?)<\/arxiv:journal_ref>/);
    const doiMatch = entryXml.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/);
    
    const authorMatches = entryXml.matchAll(/<author[^>]*>[\s\S]*?<name[^>]*>([^<]+)<\/name>[\s\S]*?(?:<arxiv:affiliation[^>]*>([^<]+)<\/arxiv:affiliation>)?[\s\S]*?<\/author>/g);
    const authors: { name: string; affiliation?: string }[] = [];
    for (const authorMatch of authorMatches) {
      authors.push({
        name: authorMatch[1].trim(),
        affiliation: authorMatch[2]?.trim(),
      });
    }
    
    const categoryMatches = entryXml.matchAll(/<category[^>]*term="([^"]+)"/g);
    const categories: string[] = [];
    for (const catMatch of categoryMatches) {
      categories.push(catMatch[1]);
    }
    
    const linkMatches = entryXml.matchAll(/<link[^>]*href="([^"]+)"[^>]*rel="([^"]+)"[^>]*>/g);
    let pdfLink: string | undefined;
    let absLink = '';
    for (const linkMatch of linkMatches) {
      const href = linkMatch[1];
      const rel = linkMatch[2];
      if (rel === 'related' && href.includes('/pdf/')) {
        pdfLink = href;
      } else if (rel === 'alternate') {
        absLink = href;
      }
    }
    
    const id = idMatch ? idMatch[1].trim() : '';
    const title = titleMatch ? titleMatch[1].trim().replace(/\n/g, ' ') : '';
    const summary = summaryMatch ? summaryMatch[1].trim().replace(/\n/g, ' ') : '';
    
    entries.push({
      id: extractArxivId(id),
      title,
      summary,
      authors,
      published: publishedMatch ? publishedMatch[1].trim() : '',
      updated: updatedMatch ? updatedMatch[1].trim() : '',
      primaryCategory: primaryCatMatch ? primaryCatMatch[1] : categories[0] || '',
      categories,
      comment: commentMatch ? commentMatch[1].trim() : undefined,
      journalRef: journalRefMatch ? journalRefMatch[1].trim() : undefined,
      doi: doiMatch ? doiMatch[1].trim() : undefined,
      pdfLink,
      absLink,
    });
  }
  
  return {
    entries,
    totalResults: totalMatch ? parseInt(totalMatch[1], 10) : entries.length,
    startIndex: startMatch ? parseInt(startMatch[1], 10) : 0,
    itemsPerPage: itemsMatch ? parseInt(itemsMatch[1], 10) : entries.length,
  };
}

export const arxivSearchTool = tool({
  description: 'Search for scientific papers on arXiv by topic, author, category, or keywords',
  inputSchema: z.object({
    query: z.string().describe('Search query - can use field prefixes like ti: (title), au: (author), cat: (category), abs: (abstract), or all: for all fields. Example: "ti:quantum AND cat:cs.LG"'),
    maxResults: z.number().min(1).max(2000).default(10).describe('Maximum number of results to return (1-2000)'),
    sortBy: z.enum(['relevance', 'lastUpdatedDate', 'submittedDate']).default('relevance').describe('How to sort results'),
    sortOrder: z.enum(['ascending', 'descending']).default('descending').describe('Sort order'),
    start: z.number().min(0).default(0).describe('Index of first result to return (for paging)'),
  }),
  execute: async ({ query, maxResults, sortBy, sortOrder, start }) => {
    try {
      const params = new URLSearchParams({
        search_query: query,
        max_results: maxResults.toString(),
        sortBy,
        sortOrder,
        start: start.toString(),
      });

      const response = await fetch(`${ARXIV_API_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }

      const xmlText = await response.text();
      
      if (xmlText.includes('<entry>') === false) {
        const errorMatch = xmlText.match(/<summary[^>]*>([^<]+)/);
        const errorMsg = errorMatch ? errorMatch[1] : 'No results found';
        return { error: errorMsg };
      }

      const result = parseAtomResponse(xmlText);

      return {
        query,
        totalResults: result.totalResults,
        startIndex: result.startIndex,
        itemsPerPage: result.itemsPerPage,
        entries: result.entries.map(entry => ({
          id: entry.id,
          title: entry.title,
          summary: entry.summary.slice(0, 500) + (entry.summary.length > 500 ? '...' : ''),
          authors: entry.authors.map(a => a.name),
          published: entry.published.split('T')[0],
          updated: entry.updated.split('T')[0],
          primaryCategory: entry.primaryCategory,
          categories: entry.categories,
          pdfLink: entry.pdfLink,
          absLink: entry.absLink,
          htmlLink: `https://arxiv.org/html/${entry.id}`,
        })),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to search arXiv',
      };
    }
  },
});

export const arxivPaperTool = tool({
  description: 'Get detailed information about a specific arXiv paper by its ID',
  inputSchema: z.object({
    arxivId: z.string().describe('arXiv ID (e.g., "2301.12345" or "cond-mat/0207270"). Can include version like "2301.12345v2"'),
  }),
  execute: async ({ arxivId }) => {
    try {
      const params = new URLSearchParams({
        id_list: arxivId,
      });

      const response = await fetch(`${ARXIV_API_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }

      const xmlText = await response.text();

      if (xmlText.includes('<entry>') === false) {
        const errorMatch = xmlText.match(/<summary[^>]*>([^<]+)/);
        const errorMsg = errorMatch ? errorMatch[1] : 'Paper not found';
        return { error: errorMsg };
      }

      const result = parseAtomResponse(xmlText);
      const entry = result.entries[0];

      if (!entry) {
        return { error: 'Paper not found' };
      }

      return {
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        authors: entry.authors,
        published: entry.published,
        updated: entry.updated,
        primaryCategory: entry.primaryCategory,
        categories: entry.categories,
        comment: entry.comment,
        journalRef: entry.journalRef,
        doi: entry.doi,
        pdfLink: entry.pdfLink,
        absLink: entry.absLink,
        htmlLink: `https://arxiv.org/html/${entry.id}`,
        version: entry.id.includes('v') ? entry.id.split('v')[1] : '1',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch paper details',
      };
    }
  },
});
