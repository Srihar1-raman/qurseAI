'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import MarkdownRenderer from '@/components/markdown';
import '@/styles/components/tool-call-block.css';

interface SearchResult {
  title: string;
  url: string;
  text: string;
  publishedDate?: string | null;
}

interface ToolCallResult {
  results: SearchResult[];
}

interface ToolCallBlockProps {
  toolName: string;
  status: 'loading' | 'complete' | 'error';
  result?: unknown;
  query?: string;
}

export function ToolCallBlock({ toolName, status, result, query }: ToolCallBlockProps) {
  const { resolvedTheme, mounted } = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsedByUser, setIsCollapsedByUser] = useState(false);

  const toggleExpanded = useCallback(() => {
    if (status === 'loading') {
      setIsCollapsedByUser(prev => !prev);
    } else {
      setIsExpanded(prev => !prev);
    }
  }, [status]);

  const searchResults = result && typeof result === 'object' && 'results' in result
    ? (result as ToolCallResult).results
    : [];

  const getToolDisplayName = () => {
    if (toolName === 'web_search') return 'Web Search';
    return toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const headerText = useMemo(() => {
    if (status === 'loading') return 'Searching...';
    if (status === 'complete') return 'Search completed';
    if (status === 'error') return 'Search failed';
    return `${getToolDisplayName()} called`;
  }, [status, toolName]);

  const showStreamingBox = status === 'loading' && !isCollapsedByUser;
  const showCollapsed = isCollapsedByUser || (status !== 'loading' && !isExpanded);
  const showExpanded = status !== 'loading' && isExpanded;

  return (
    <div className="tool-call-block">
      {showStreamingBox && (
        <>
          <div
            className="tool-call-header"
            onClick={toggleExpanded}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpanded();
              }
            }}
          >
            <span className="tool-call-header-text streaming">
              {headerText}
            </span>
          </div>

          <div className="tool-call-content streaming">
            <div className="tool-call-preview">
              {query && <div className="tool-call-query-preview">Query: {query}</div>}
            </div>
          </div>
        </>
      )}

      {showCollapsed && (
        <div
          className="tool-call-collapsed"
          onClick={toggleExpanded}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleExpanded();
            }
          }}
        >
          <span className="tool-call-collapsed-text streaming">
            {headerText}
          </span>
          <Image
            src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
            alt=""
            width={16}
            height={16}
            className="tool-call-chevron"
          />
        </div>
      )}

      {showExpanded && (
        <>
          <div
            className="tool-call-header"
            onClick={toggleExpanded}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpanded();
              }
            }}
          >
            <span className="tool-call-header-text">
              {headerText}
            </span>
            <Image
              src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
              alt=""
              width={16}
              height={16}
              className="tool-call-chevron"
            />
          </div>

          <div className="tool-call-content">
            <div className="tool-call-full">
              {query && (
                <div className="tool-call-query">
                  <span className="tool-call-label">Query:</span>
                  <span className="tool-call-query-text">{query}</span>
                </div>
              )}

              {status === 'error' && (
                <div className="tool-call-error">
                  {result && typeof result === 'object' && 'error' in result
                    ? (result as { error: string }).error
                    : 'An error occurred while executing this tool.'}
                </div>
              )}

              {status === 'complete' && searchResults.length > 0 && (
                <div className="tool-call-results">
                  <div className="tool-call-results-header">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </div>
                  {searchResults.map((searchResult, index) => (
                    <div key={index} className="tool-call-result-item">
                      <div className="tool-call-result-title">
                        <a
                          href={searchResult.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tool-call-result-link"
                        >
                          {searchResult.title}
                        </a>
                      </div>
                      {searchResult.publishedDate && (
                        <div className="tool-call-result-date">
                          {new Date(searchResult.publishedDate).toLocaleDateString()}
                        </div>
                      )}
                      <div className="tool-call-result-snippet">
                        <MarkdownRenderer
                          content={searchResult.text.slice(0, 200)}
                          isUserMessage={false}
                          isStreaming={false}
                          minimalMode={true}
                        />
                      </div>
                      <a
                        href={searchResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tool-call-result-url"
                      >
                        {searchResult.url}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              className="tool-call-show-less"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded();
              }}
            >
              Show less
            </button>
          </div>
        </>
      )}
    </div>
  );
}
