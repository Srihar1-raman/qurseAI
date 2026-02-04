'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import '@/styles/components/tool-call-block.css';

interface SearchResultImage {
  url: string;
  alt?: string;
}

interface SearchResult {
  title: string;
  url: string;
  text: string;
  publishedDate?: string | null;
  images: SearchResultImage[];
}

interface ToolCallResult {
  results: SearchResult[];
}

interface WebSearchExecution {
  toolCallId: string;
  query: string;
  status: 'loading' | 'complete' | 'error';
  result?: ToolCallResult;
}

interface WebSearchResultsProps {
  executions: WebSearchExecution[];
  isStreaming: boolean;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const domain = getDomain(result.url);
  const faviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  const snippet = result.text.slice(0, 120) + (result.text.length > 120 ? '...' : '');
  const firstImage = result.images && result.images.length > 0 ? result.images[0] : null;
  const hasExaImage = !!firstImage?.url;
  const [fetchedPreview, setFetchedPreview] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (hasExaImage) return;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(result.url)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.image) {
            setFetchedPreview(data.image);
          }
        }
      } catch (e) {
        // Silent fail - no preview
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [hasExaImage, result.url]);

  const imageUrl = hasExaImage ? firstImage?.url : (fetchedPreview || faviconUrl);

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="search-result-card"
      style={{ backgroundImage: `url(${imageUrl})` }}
    >
      <div className="search-result-card-overlay" />
      <div className="search-result-card-header">
        {!hasExaImage && !fetchedPreview && <img src={faviconUrl} alt="" className="search-result-favicon" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        <span className="search-result-domain">{domain}</span>
      </div>
      <div className="search-result-card-title">{result.title}</div>
      <div className="search-result-card-snippet">{snippet}</div>
      {result.publishedDate && (
        <div className="search-result-card-date">
          {new Date(result.publishedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}
    </a>
  );
}

function WebSearchQuerySection({ execution }: { execution: WebSearchExecution }) {
  const hasResults = execution.result?.results && execution.result.results.length > 0;

  return (
    <div className="web-search-query-section">
      <div className="web-search-query-header">
        <span className="web-search-query-label">Query:</span>
        <span className="web-search-query-text">&ldquo;{execution.query}&rdquo;</span>
        {execution.status === 'error' && <span className="web-search-error">failed</span>}
      </div>

      {execution.status === 'error' && (
        <div className="web-search-error-message">
          {execution.result && typeof execution.result === 'object' && 'error' in execution.result
            ? (execution.result as { error: string }).error
            : 'Search failed'}
        </div>
      )}

      {hasResults && (
        <div className="search-results-scroll">
          {execution.result!.results.map((searchResult, index) => (
            <SearchResultCard key={index} result={searchResult} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WebSearchResults({ executions, isStreaming }: WebSearchResultsProps) {
  const { resolvedTheme, mounted } = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsedByUser, setIsCollapsedByUser] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  const allComplete = useMemo(() => {
    return executions.every(e => e.status !== 'loading');
  }, [executions]);

  const hasErrors = useMemo(() => {
    return executions.some(e => e.status === 'error');
  }, [executions]);

  const allResults = useMemo(() => {
    return executions.filter(e => e.status === 'complete' && e.result?.results);
  }, [executions]);

  useEffect(() => {
    if (executions.length > 0 && startTime === null) {
      setStartTime(Date.now());
    }
  }, [executions.length]);

  useEffect(() => {
    if (isStreaming) {
      setDuration(null);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (startTime && allComplete && duration === null) {
      const elapsed = Date.now() - startTime;
      const seconds = Math.max(1, Math.round(elapsed / 1000));
      setDuration(`~${seconds}s`);
    }
  }, [allComplete, startTime, duration]);

  useEffect(() => {
    if (!isStreaming && allComplete && !isExpanded && !isCollapsedByUser) {
      setIsExpanded(false);
    }
  }, [isStreaming, allComplete, isExpanded, isCollapsedByUser]);

  const toggleExpanded = useCallback(() => {
    if (isStreaming) {
      setIsCollapsedByUser(prev => !prev);
    } else {
      setIsExpanded(prev => !prev);
    }
  }, [isStreaming]);

  const totalResults = useMemo(() => {
    return executions.reduce((acc, e) => acc + (e.result?.results.length || 0), 0);
  }, [executions]);

  const headerText = useMemo(() => {
    if (isStreaming) return 'Searching the web...';
    if (isExpanded) return 'Web Research';
    return 'Web Result';
  }, [isStreaming, isExpanded]);

  const headerSubtext = useMemo(() => {
    if (isStreaming) return null;
    if (isExpanded && totalResults > 0) {
      return `${totalResults} result${totalResults !== 1 ? 's' : ''}`;
    }
    return null;
  }, [isStreaming, isExpanded, totalResults]);

  const showStreamingBox = isStreaming && !isCollapsedByUser;
  const showCollapsed = isCollapsedByUser || (!isStreaming && !isExpanded);
  const showExpanded = !isStreaming && isExpanded;

  return (
    <div className="web-search-results-block">
      {showStreamingBox && (
        <>
          <div
            className="reasoning-header"
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
            <span className="reasoning-header-text streaming">
              {headerText}
            </span>
          </div>
          <div className="reasoning-content streaming">
            <div className="web-search-preview">
              {executions.map((exec, i) => (
                <div key={exec.toolCallId} className="web-search-preview-item">
                  <span className="web-search-preview-query">&ldquo;{exec.query}&rdquo;</span>
                  <span className={`web-search-preview-status ${exec.status}`}>
                    {exec.status === 'loading' ? 'searching...' : exec.status === 'complete' ? 'found' : 'failed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showCollapsed && (
        <div
          className="reasoning-collapsed"
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
          <span className="reasoning-collapsed-text streaming">
            {headerText}
          </span>
          {!isStreaming && (
            <Image
              src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
              alt=""
              width={16}
              height={16}
              className="reasoning-chevron"
            />
          )}
        </div>
      )}

      {showExpanded && (
        <>
          <div
            className="reasoning-header web-search-header-expanded"
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
            <span className="reasoning-header-text">
              {headerText}
            </span>
            {headerSubtext && (
              <span className="web-search-header-subtext">{headerSubtext}</span>
            )}
            <Image
              src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
              alt=""
              width={16}
              height={16}
              className="reasoning-chevron expanded"
            />
          </div>

          <div className="reasoning-content">
            <div className="web-search-full">
              {executions.map((exec) => (
                <WebSearchQuerySection key={exec.toolCallId} execution={exec} />
              ))}
            </div>
            <button
              className="reasoning-show-less"
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
