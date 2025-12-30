/**
 * Academic Search Result Component
 * Displays academic paper search results with scholarly styling
 */

import React from 'react';

export interface SearchResult {
  index: number;
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  author?: string;
  score?: number;
}

export interface AcademicSearchResultProps {
  query: string;
  results: SearchResult[];
  provider: 'exa' | 'tavily';
}

export function AcademicSearchResult({
  query,
  results,
  provider,
}: AcademicSearchResultProps) {
  if (results.length === 0) {
    return (
      <div className="search-results search-results--academic">
        <div className="search-results__header">
          <span className="search-results__count">0 papers</span>
        </div>
        <div className="search-results__empty">No papers found</div>
      </div>
    );
  }

  return (
    <div className="search-results search-results--academic">
      <div className="search-results__header">
        <span className="search-results__count">
          {results.length} {results.length === 1 ? 'paper' : 'papers'}
        </span>
        <span className="search-results__query">for "{query}"</span>
      </div>
      <div className="search-results__list">
        {results.map((result) => (
          <div key={result.index} className="search-result">
            <div className="search-result__title">
              <a href={result.url} target="_blank" rel="noopener noreferrer">
                {result.title}
              </a>
            </div>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="search-result__url"
            >
              {result.url}
            </a>
            {(result.publishedDate || result.author) && (
              <div className="search-result__meta">
                {result.author && <span className="search-result__author">{result.author}</span>}
                {result.publishedDate && (
                  <span className="search-result__date">{result.publishedDate}</span>
                )}
              </div>
            )}
            <div className="search-result__content">
              {result.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
