'use client';

import React from 'react';
import { User, Calendar, ExternalLink, Quote, Eye, Book, Globe } from 'lucide-react';

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
  return (
    <div className="scopus-card scopus-card-compact">
      <div className="arxiv-card-header arxiv-header-compact">
        <div className="arxiv-card-title-section">
          <h3 className="arxiv-card-title">Scopus</h3>
          <p className="arxiv-card-subtitle">
            {result.entries.length} papers for "{result.query}" ({result.totalResults.toLocaleString()} total)
          </p>
        </div>
      </div>

      {result.message && (
        <div className="arxiv-paper-message">
          <p>{result.message}</p>
        </div>
      )}

      <div className="scopus-horizontal-scroll">
        {result.entries.map((entry, index) => (
          <div key={entry.eid} className="scopus-paper-card-compact">
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
                  <User size={10} />
                  <span>{entry.author}</span>
                </div>
                <div className="arxiv-paper-meta-item">
                  <Book size={10} />
                  <span>{entry.publicationName}</span>
                </div>
                <div className="arxiv-paper-meta-item">
                  <Calendar size={10} />
                  <span>{entry.coverDate}</span>
                </div>
                {entry.citedByCount > 0 && (
                  <div className="arxiv-paper-meta-item scopus-citations">
                    <Quote size={10} />
                    <span>{entry.citedByCount.toLocaleString()}</span>
                  </div>
                )}
                {entry.issn && (
                  <div className="arxiv-paper-meta-item">
                    <span className="arxiv-issn-compact">ISSN: {entry.issn}</span>
                  </div>
                )}
                {entry.openAccess && (
                  <div className="arxiv-paper-meta-item scopus-openaccess">
                    <Eye size={10} />
                    <span>OA</span>
                  </div>
                )}
              </div>
              {(entry.volume || entry.issue || entry.pages || entry.type) && (
                <div className="scopus-paper-details-compact">
                  {entry.volume && <span className="scopus-detail-badge">v{entry.volume}</span>}
                  {entry.issue && <span className="scopus-detail-badge">i{entry.issue}</span>}
                  {entry.pages && <span className="scopus-detail-badge">{entry.pages}</span>}
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
                className="arxiv-link-text"
              >
                <ExternalLink size={10} />
                Scopus
              </a>
              {entry.doiUrl && (
                <>
                  <a
                    href={entry.doiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="arxiv-link-text"
                  >
                    <Globe size={10} />
                    DOI
                  </a>
                  <button
                    className="arxiv-link-compact arxiv-link-ask"
                    onClick={() => {
                      const msg = "Tell me about the paper " + entry.title + " by " + entry.author + " from " + entry.publicationName;
                      onSetInput?.(msg);
                    }}
                  >
                    Ask
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScopusPaperCardComponent({ paper }: ScopusPaperCardProps) {
  return (
    <div className="arxiv-card arxiv-card-detail scopus-paper-detail">
      <div className="arxiv-card-header">
        <div className="arxiv-card-title-section">
          <h3 className="arxiv-card-title">Scopus Paper</h3>
          <p className="arxiv-card-subtitle">{paper.eid}</p>
        </div>
      </div>
      <div className="arxiv-paper-detail-content">
        <h1 className="arxiv-detail-title">{paper.title}</h1>

        <div className="arxiv-paper-meta-info">
          <div className="arxiv-detail-authors">
            <User size={12} />
            <span>{paper.author}</span>
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
