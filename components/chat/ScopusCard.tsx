'use client';

import React, { useState } from 'react';
import { User, Calendar, ExternalLink, Quote, Database, Eye, Book, Globe } from 'lucide-react';

interface ScopusPaperEntry {
  eid: string;
  title: string;
  author: string;
  publicationName: string;
  coverDate: string;
  year: string;
  volume: string;
  issue: string;
  pages: string;
  citedByCount: number;
  doi: string;
  doiUrl: string;
  scopusUrl: string;
  issn: string;
  openAccess: boolean;
  type: string;
}

interface ScopusSearchResult {
  query: string;
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  entries: ScopusPaperEntry[];
  message?: string;
}

interface ScopusSearchCardProps {
  result: ScopusSearchResult;
  onSetInput?: (text: string) => void;
}

interface ScopusPaperCardProps {
  paper: ScopusPaperEntry;
}

function ScopusSearchCardComponent({ result, onSetInput }: ScopusSearchCardProps) {
  const [showIframe, setShowIframe] = useState<string | null>(null);

  return (
    <div className="scopus-card">
      <div className="arxiv-card-header arxiv-header-compact">
        <div className="arxiv-card-title-section">
          <h3 className="arxiv-card-title">Scopus Search Results</h3>
          <p className="arxiv-card-subtitle">
            {result.entries.length} papers found for &quot;{result.query}&quot; ({result.totalResults.toLocaleString()} total)
          </p>
        </div>
        <div className="scopus-logo-badge">
          <Database size={14} />
          <span>Scopus</span>
        </div>
      </div>

      {result.message && (
        <div className="scopus-message">
          <p>{result.message}</p>
        </div>
      )}

      <div className="arxiv-search-results">
        {result.entries.map((entry, index) => (
          <div key={entry.eid} className="arxiv-paper-item scopus-paper-item">
            <div className="arxiv-paper-item-content">
              <div className="arxiv-paper-main">
                <a
                  href={entry.scopusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arxiv-paper-title"
                >
                  {index + 1}. {entry.title}
                </a>
                <div className="arxiv-paper-meta-compact">
                  <div className="arxiv-paper-meta-item">
                    <User size={11} />
                    <span>{entry.author}</span>
                  </div>
                  <div className="arxiv-paper-meta-item">
                    <Book size={11} />
                    <span className="scopus-journal">{entry.publicationName}</span>
                  </div>
                  <div className="arxiv-paper-meta-item">
                    <Calendar size={11} />
                    <span>{entry.coverDate}</span>
                  </div>
                  {entry.citedByCount > 0 && (
                    <div className="arxiv-paper-meta-item scopus-citations">
                      <Quote size={11} />
                      <span>{entry.citedByCount.toLocaleString()} citations</span>
                    </div>
                  )}
                  {entry.openAccess && (
                    <div className="arxiv-paper-meta-item scopus-openaccess">
                      <Eye size={11} />
                      <span>Open Access</span>
                    </div>
                  )}
                </div>
                {(entry.volume || entry.issue || entry.pages) && (
                  <div className="scopus-paper-details-compact">
                    {entry.volume && <span className="scopus-detail-badge">Vol. {entry.volume}</span>}
                    {entry.issue && <span className="scopus-detail-badge">Issue {entry.issue}</span>}
                    {entry.pages && <span className="scopus-detail-badge">pp. {entry.pages}</span>}
                    {entry.type && entry.type !== 'Article' && (
                      <span className="scopus-detail-badge scopus-type-badge">{entry.type}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="arxiv-paper-links-compact">
                <a
                  href={entry.scopusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arxiv-link-compact arxiv-link-abs scopus-link-main"
                >
                  <ExternalLink size={12} />
                  Scopus
                </a>
                {entry.doiUrl && (
                  <a
                    href={entry.doiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="arxiv-link-compact scopus-link-doi"
                  >
                    <Globe size={12} />
                    DOI
                  </a>
                )}
                {entry.issn && (
                  <span className="scopus-issn">ISSN: {entry.issn}</span>
                )}
                <button
                  className="arxiv-link-compact arxiv-link-ask"
                  onClick={() => onSetInput?.(`Tell me about the paper "${entry.title}" by ${entry.author} from ${entry.publicationName}`)}
                >
                  Ask Qurse
                </button>
              </div>

              {showIframe === entry.eid && entry.doiUrl && (
                <div className="scopus-paper-iframe-container">
                  <button
                    className="scopus-iframe-close"
                    onClick={() => setShowIframe(null)}
                  >
                    × Close
                  </button>
                  <div className="scopus-iframe-note">
                    <p>Viewing via DOI publisher site. If no preview loads, the paper may require subscription access.</p>
                  </div>
                  <iframe
                    src={entry.doiUrl}
                    title={`Paper: ${entry.title}`}
                    className="scopus-paper-iframe"
                    loading="lazy"
                  />
                </div>
              )}

              {entry.doiUrl && showIframe !== entry.eid && (
                <button
                  className="scopus-preview-toggle"
                  onClick={() => setShowIframe(entry.eid)}
                >
                  <Eye size={12} />
                  Preview
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {result.totalResults > result.entries.length && (
        <div className="scopus-paging-info">
          <p>
            Showing {result.startIndex + 1}-{result.startIndex + result.entries.length} of {result.totalResults.toLocaleString()} results
          </p>
          <p className="scopus-paging-note">
            Use specific queries to narrow down results, or contact your institution for full access.
          </p>
        </div>
      )}
    </div>
  );
}

function ScopusPaperCardComponent({ paper }: ScopusPaperCardProps) {
  const [showIframe, setShowIframe] = useState(false);

  return (
    <div className="arxiv-card arxiv-card-detail scopus-card-detail">
      <div className="arxiv-card-header">
        <div className="arxiv-card-title-section">
          <h3 className="arxiv-card-title">Scopus Paper</h3>
          <p className="arxiv-card-subtitle">{paper.eid}</p>
        </div>
        <div className="arxiv-detail-links">
          <a
            href={paper.scopusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="arxiv-link arxiv-link-abs scopus-link-main"
          >
            <ExternalLink size={13} />
            <span>Scopus</span>
          </a>
          {paper.doiUrl && (
            <a
              href={paper.doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="arxiv-link scopus-link-doi"
            >
              <Globe size={13} />
              <span>DOI</span>
            </a>
          )}
        </div>
      </div>

      <div className="arxiv-paper-detail-content">
        <h1 className="arxiv-detail-title">{paper.title}</h1>

        <div className="arxiv-paper-meta-info">
          <div className="arxiv-detail-authors">
            <User size={12} />
            <span className="scopus-author">{paper.author}</span>
          </div>

          <div className="arxiv-detail-meta">
            <div className="arxiv-meta-item">
              <Book size={12} />
              <span>{paper.publicationName}</span>
            </div>
            <div className="arxiv-meta-item">
              <Calendar size={12} />
              <span>{paper.coverDate}</span>
            </div>
            {paper.citedByCount > 0 && (
              <div className="arxiv-meta-item scopus-citations-detail">
                <Quote size={12} />
                <span>{paper.citedByCount.toLocaleString()} citations</span>
              </div>
            )}
            {paper.openAccess && (
              <div className="arxiv-meta-item scopus-openaccess-detail">
                <Eye size={12} />
                <span>Open Access</span>
              </div>
            )}
          </div>
        </div>

        <div className="scopus-detail-publication-info">
          {(paper.volume || paper.issue || paper.pages) && (
            <div className="scopus-pub-details">
              <span className="scopus-detail-label">Publication:</span>
              {paper.volume && <span className="scopus-detail-value">Volume {paper.volume}</span>}
              {paper.issue && <span className="scopus-detail-value">Issue {paper.issue}</span>}
              {paper.pages && <span className="scopus-detail-value">Pages {paper.pages}</span>}
              {paper.issn && <span className="scopus-detail-value scopus-issn-detail">ISSN: {paper.issn}</span>}
            </div>
          )}
          {paper.doi && (
            <div className="scopus-doi-detail">
              <span className="scopus-detail-label">DOI:</span>
              <a
                href={paper.doiUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {paper.doi}
              </a>
            </div>
          )}
          {paper.type && paper.type !== 'Article' && (
            <div className="scopus-type-detail">
              <span className="scopus-detail-label">Type:</span>
              <span className="scopus-type-badge">{paper.type}</span>
            </div>
          )}
        </div>

        {paper.doiUrl && (
          <div className="scopus-detail-reader-toggle">
            <button
              className="scopus-reader-button"
              onClick={() => setShowIframe(!showIframe)}
            >
              <Eye size={14} />
              {showIframe ? 'Hide Preview' : 'Preview via Publisher Site'}
            </button>
            <span className="scopus-reader-note">
              Opens publisher site - may require subscription access
            </span>
          </div>
        )}

        {showIframe && paper.doiUrl && (
          <div className="scopus-paper-reader">
            <div className="scopus-iframe-note scopus-iframe-note-detail">
              <p>Viewing paper via publisher site. If the content is not accessible, your institution may not have a subscription.</p>
            </div>
            <iframe
              src={paper.doiUrl}
              title={`Paper: ${paper.title}`}
              className="scopus-paper-reader-iframe"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ScopusSearchCard({ result, onSetInput }: ScopusSearchCardProps) {
  return <ScopusSearchCardComponent result={result} onSetInput={onSetInput} />;
}

export function ScopusPaperCard({ paper }: ScopusPaperCardProps) {
  return <ScopusPaperCardComponent paper={paper} />;
}