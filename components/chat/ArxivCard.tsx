'use client';

import React, { useState } from 'react';
import { FileText, User, Calendar, Tag, ExternalLink, BookOpen } from 'lucide-react';

interface ArxivPaperEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated: string;
  primaryCategory: string;
  categories: string[];
  pdfLink?: string;
  absLink: string;
  htmlLink?: string;
}

interface ArxivSearchResult {
  query: string;
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  entries: ArxivPaperEntry[];
}

interface ArxivPaperDetail {
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
  htmlLink?: string;
  version: string;
}

interface ArxivSearchCardProps {
  result: ArxivSearchResult;
}

interface ArxivPaperCardProps {
  paper: ArxivPaperDetail;
}

function ArxivSearchCardComponent({ result }: ArxivSearchCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="arxiv-card">
      <div className="arxiv-card-header arxiv-header-compact">
        <div className="arxiv-card-title-section">
          <h3 className="arxiv-card-title">arXiv Search Results</h3>
          <p className="arxiv-card-subtitle">
            {result.entries.length} papers found for &quot;{result.query}&quot;
          </p>
        </div>
      </div>

      <div className="arxiv-search-results">
        {result.entries.map((entry) => (
          <div key={entry.id} className="arxiv-paper-item">
            <div className="arxiv-paper-item-content">
              <div className="arxiv-paper-main">
                <a 
                  href={entry.absLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="arxiv-paper-title"
                >
                  {entry.title}
                </a>
                <div className="arxiv-paper-meta-compact">
                  <div className="arxiv-paper-meta-item">
                    <Calendar size={11} />
                    <span>{entry.published}</span>
                  </div>
                  <div className="arxiv-paper-meta-item">
                    <Tag size={11} />
                    <span className="arxiv-category">{entry.primaryCategory}</span>
                  </div>
                  <div className="arxiv-paper-authors">
                    <User size={11} />
                    <span>{entry.authors.slice(0, 3).join(', ')}{entry.authors.length > 3 ? ` +${entry.authors.length - 3}` : ''}</span>
                  </div>
                </div>
              </div>

              <div className="arxiv-paper-abstract">
                <p className={expandedId === entry.id ? '' : 'truncated'}>
                  {entry.summary}
                </p>
                {entry.summary.length > 200 && (
                  <button 
                    className="arxiv-abstract-toggle"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    {expandedId === entry.id ? 'Show less' : 'More'}
                  </button>
                )}
              </div>

              <div className="arxiv-paper-links-compact">
                {entry.pdfLink && (
                  <a 
                    href={entry.pdfLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="arxiv-link-compact arxiv-link-pdf"
                  >
                    <FileText size={12} />
                    PDF
                  </a>
                )}
                {entry.htmlLink && (
                  <a 
                    href={entry.htmlLink}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="arxiv-link-compact arxiv-link-html"
                  >
                    <BookOpen size={12} />
                    HTML
                  </a>
                )}
                <a 
                  href={entry.absLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="arxiv-link-compact arxiv-link-abs"
                >
                  <ExternalLink size={12} />
                  arXiv
                </a>
              </div>
            </div>

            {entry.pdfLink && (
              <div className="arxiv-paper-preview">
                <iframe 
                  src={entry.pdfLink}
                  title={`PDF Preview: ${entry.title}`}
                  className="arxiv-paper-preview-iframe"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArxivPaperCardComponent({ paper }: ArxivPaperCardProps) {
  const [showFullAbstract, setShowFullAbstract] = useState(false);

  return (
    <div className="arxiv-card arxiv-card-detail">
      <div className="arxiv-card-header">
        <div className="arxiv-card-title-section">
          <h3 className="arxiv-card-title">arXiv Paper</h3>
          <p className="arxiv-card-subtitle">{paper.id} (v{paper.version})</p>
        </div>
        <div className="arxiv-detail-links">
          {paper.pdfLink && (
            <a
              href={paper.pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="arxiv-link arxiv-link-pdf"
            >
              <FileText size={13} />
              <span>PDF</span>
            </a>
          )}
          {paper.htmlLink && (
            <a
              href={paper.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="arxiv-link arxiv-link-html"
            >
              <BookOpen size={13} />
              <span>HTML</span>
            </a>
          )}
          <a
            href={paper.absLink}
            target="_blank"
            rel="noopener noreferrer"
            className="arxiv-link arxiv-link-abs"
          >
            <ExternalLink size={13} />
            <span>arXiv</span>
          </a>
        </div>
      </div>

      <div className="arxiv-paper-detail-content">
        <h1 className="arxiv-detail-title">{paper.title}</h1>

        <div className="arxiv-paper-meta-info">
          <div className="arxiv-detail-authors">
            <User size={12} />
            <div className="arxiv-author-list">
              {paper.authors.slice(0, 5).map((author, index) => (
                <span key={index} className="arxiv-author">
                  {author.name}
                  {author.affiliation && <span className="arxiv-author-affiliation"> ({author.affiliation})</span>}
                  {index < Math.min(4, paper.authors.length - 1) && <span className="arxiv-author-sep"> · </span>}
                </span>
              ))}
              {paper.authors.length > 5 && <span className="arxiv-author-more"> +{paper.authors.length - 5} more</span>}
            </div>
          </div>

          <div className="arxiv-detail-meta">
            <div className="arxiv-meta-item">
              <Calendar size={12} />
              <span>{paper.published.split('T')[0]}</span>
              {paper.updated !== paper.published && (
                <span className="arxiv-meta-updated"> (updated {paper.updated.split('T')[0]})</span>
              )}
            </div>
            <div className="arxiv-detail-categories">
              <span className="arxiv-category-tag arxiv-category-primary">{paper.primaryCategory}</span>
              {paper.categories.filter(cat => cat !== paper.primaryCategory).map((cat) => (
                <span key={cat} className="arxiv-category-tag">{cat}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="arxiv-detail-abstract">
          <p className={showFullAbstract ? '' : 'truncated'}>
            {paper.summary}
          </p>
          {paper.summary.length > 400 && (
            <button
              className="arxiv-abstract-toggle"
              onClick={() => setShowFullAbstract(!showFullAbstract)}
            >
              {showFullAbstract ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        <div className="arxiv-detail-info">
          {paper.comment && (
            <div className="arxiv-detail-comment">
              <span className="arxiv-detail-label">Comments:</span>
              <span>{paper.comment}</span>
            </div>
          )}

          {paper.journalRef && (
            <div className="arxiv-detail-journal">
              <span className="arxiv-detail-label">Journal Reference:</span>
              <span>{paper.journalRef}</span>
            </div>
          )}

          {paper.doi && (
            <div className="arxiv-detail-doi">
              <span className="arxiv-detail-label">DOI:</span>
              <a
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {paper.doi}
              </a>
            </div>
          )}
        </div>

        {paper.pdfLink && (
          <div className="arxiv-detail-reader">
            <iframe
              src={paper.pdfLink}
              title={`PDF: ${paper.title}`}
              className="arxiv-detail-reader-iframe"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ArxivSearchCard({ result }: ArxivSearchCardProps) {
  return <ArxivSearchCardComponent result={result} />;
}

export function ArxivPaperCard({ paper }: ArxivPaperCardProps) {
  return <ArxivPaperCardComponent paper={paper} />;
}
