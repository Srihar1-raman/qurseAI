import { tool } from 'ai';
import { z } from 'zod';

const SCOPUS_API_URL = 'https://api.elsevier.com/content/search/scopus';
const API_KEY = process.env.ELSEVIER_API_KEY || '';

interface ScopusAffiliation {
  'affilname'?: string;
  'affiliation-city'?: string;
  'affiliation-country'?: string;
}

interface ScopusLink {
  '@ref'?: string;
  '@href'?: string;
}

interface ScopusEntry {
  'prism:url'?: string;
  'dc:title'?: string;
  'dc:creator'?: string;
  'dc:description'?: string;
  'prism:publicationName'?: string;
  'prism:coverDate'?: string;
  'prism:coverDisplayDate'?: string;
  'prism:volume'?: string;
  'prism:issueIdentifier'?: string;
  'prism:pageRange'?: string;
  'prism:doi'?: string;
  'prism:eIssn'?: string;
  'prism:issn'?: string;
  'citedby-count'?: string;
  'eid'?: string;
  'openaccess'?: string;
  'openaccessFlag'?: boolean;
  'subtype'?: string;
  'subtypeDescription'?: string;
  'link'?: ScopusLink[];
  'affiliation'?: ScopusAffiliation[];
}

interface ScopusSearchResults {
  'opensearch:totalResults': string;
  'opensearch:startIndex': string;
  'opensearch:itemsPerPage': string;
  'link'?: ScopusLink[];
  'entry': ScopusEntry[];
}

interface ScopusSearchResponse {
  'search-results': ScopusSearchResults;
}

interface ScopusServiceError {
  'service-error': {
    status: {
      statusCode: string;
      statusText: string;
    };
  };
}

export const scopusSearchTool = tool({
  description: 'Search for scientific papers from Scopus, the largest abstract and citation database covering 50M+ papers from all publishers. Filter by date with date=YYYY-YYYY or date=YYYY-MM-YYYY. Sort by citedby-count for most cited, or coverDate for newest. Filter by subject area with subjectArea="COMP" for Computer Science, subjectArea="MATH" for Mathematics, etc.',
  inputSchema: z.object({
    query: z.string().describe('Search query. Examples: "machine learning", "neural networks", "climate change", "quantum cryptography", "protein expression"'),
    date: z.string().optional().describe('Date range in format YYYY-YYYY or YYYY-MM-YYYY. Example: "2020-2024" for years, or "2023-01-01" for specific date'),
    maxResults: z.number().min(1).max(100).default(10).describe('Number of results to return (10, 25, 50, or 100)'),
    sort: z.enum(['relevancy', 'citedby-count', 'coverDate', 'pubyear', 'creator', 'publicationName']).default('relevancy').describe('Sort field'),
    sortOrder: z.enum(['ascending', 'descending']).default('descending').describe('Sort order: descending (default) or ascending'),
    subjectArea: z.string().optional().describe('Filter by subject area code: AGRI, ARTS, BIOC, BUSI, CENG, CHEM, COMP, DECI, DENT, EART, ECON, ENER, ENGI, ENVI, HEAL, IMMU, MATE, MATH, MEDI, NEUR, NURS, PHAR, PHYS, PSYC, SOCI, VETE, MULT'),
    contentType: z.enum(['all', 'core', 'dummy']).default('all').describe('Content type to search: all (default), core, or dummy'),
  }),
  execute: async ({ query, date, maxResults, sort, sortOrder, subjectArea, contentType }) => {
    try {
      if (!API_KEY) {
        return { error: 'Scopus API key not configured' };
      }

      const params = new URLSearchParams({
        apiKey: API_KEY,
        query: encodeURIComponent(query),
        count: maxResults.toString(),
        httpAccept: 'application/json',
        view: 'STANDARD',
        sort: sortOrder === 'ascending' ? `+${sort}` : `-${sort}`,
        content: contentType,
      });

      if (date) {
        params.append('date', date);
      }

      if (subjectArea) {
        params.append('subj', subjectArea);
      }

      const response = await fetch(`${SCOPUS_API_URL}?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          return { error: 'Authentication failed. Check API key.' };
        } else if (response.status === 429) {
          return { error: 'API quota exceeded. Please try again later.' };
        } else if (response.status === 400) {
          return { error: 'Invalid request. Check query parameters.' };
        }
        return { error: `Scopus API error: ${response.status} - ${errorText}` };
      }

      const json = await response.json();

      if ('service-error' in json) {
        const errorResponse = json as ScopusServiceError;
        return {
          error: errorResponse['service-error'].status.statusText,
        };
      }

      const data: ScopusSearchResponse = json;
      const searchResults = data['search-results'];

      if (!searchResults.entry || searchResults.entry.length === 0) {
        return {
          query,
          totalResults: 0,
          entries: [],
          message: 'No results found for your query. Try different keywords or expand your search.',
        };
      }

      const entries = searchResults.entry.map((entry: ScopusEntry) => {
        const scopusLink = entry.link?.find((link) => link['@ref'] === 'scopus');
        const scopusUrl = scopusLink?.['@href'] || '';

        let doiUrl = '';
        if (entry['prism:doi']) {
          doiUrl = `https://doi.org/${entry['prism:doi']}`;
        }

        return {
          eid: entry.eid || '',
          title: entry['dc:title'] || 'No title available',
          author: entry['dc:creator'] || 'Unknown author',
          publicationName: entry['prism:publicationName'] || 'Unknown publication',
          coverDate: entry['prism:coverDisplayDate'] || entry['prism:coverDate'] || 'Unknown date',
          year: entry['prism:coverDate']?.substring(0, 4) || '',
          volume: entry['prism:volume'] || '',
          issue: entry['prism:issueIdentifier'] || '',
          pages: entry['prism:pageRange'] || '',
          citedByCount: parseInt(entry['citedby-count'] || '0', 10),
          doi: entry['prism:doi'] || '',
          doiUrl,
          scopusUrl,
          issn: entry['prism:eIssn'] || entry['prism:issn'] || '',
          openAccess: entry['openaccessFlag'] || false,
          type: entry['subtypeDescription'] || 'Article',
        };
      });

      return {
        query,
        totalResults: parseInt(searchResults['opensearch:totalResults'], 10),
        startIndex: parseInt(searchResults['opensearch:startIndex'], 10),
        itemsPerPage: parseInt(searchResults['opensearch:itemsPerPage'], 10),
        entries,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to search Scopus',
      };
    }
  },
});