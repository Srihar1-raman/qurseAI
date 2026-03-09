'use client';

import React, { useState } from 'react';
import { FileText, User, Calendar, Tag, ExternalLink, BookOpen, Eye, X, Maximize2 } from 'lucide-react';

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
  const [previewPaper, setPreviewPaper] = useState<{ id: string; title: string; htmlLink: string } | null>(null);

  return (
    <div className="arxiv-card">
      <div className="arxiv-card-header">
        <div className="arxiv-card-icon">
          <BookOpen size={18} />
        </div>
        <div className="arxiv-card-title-section">
          <h3 className="arxiv-card-title">arXiv Search Results</h3>
          <p className="arxiv-card-subtitle">
            {result.totalResults} papers found for &quot;{result.query}&quot;
          </p>
        </div>
      </div>

      <div className="arxiv-search-results">
        {result.entries.map((entry, index) => (
          <div key={entry.id} className="arxiv-paper-item">
            <div className="arxiv-paper-header">
              <span className="arxiv-paper-number">{index + 1}</span>
              <div className="arxiv-paper-main">
                <a 
                  href={entry.absLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="arxiv-paper-title"
                >
                  {entry.title}
                </a>
                <div className="arxiv-paper-authors">
                  <User size={12} />
                  <span>{entry.authors.slice(0, 3).join(', ')}{entry.authors.length > 3 ? ` +${entry.authors.length - 3} more` : ''}</span>
                </div>
              </div>
              {entry.htmlLink && (
                <button 
                  className="arxiv-preview-btn"
                  onClick={() => setPreviewPaper({ id: entry.id, title: entry.title, htmlLink: entry.htmlLink! })}
                  title="Preview Paper"
                >
                  <Eye size={16} />
                </button>
              )}
            </div>

            <div className="arxiv-paper-meta">
              <div className="arxiv-paper-meta-item">
                <Calendar size={12} />
                <span>{entry.published}</span>
              </div>
              <div className="arxiv-paper-meta-item">
                <Tag size={12} />
                <span className="arxiv-category">{entry.primaryCategory}</span>
              </div>
              <div className="arxiv-paper-meta-item">
                <span className="arxiv-id">{entry.id}</span>
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
                  {expandedId === entry.id ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>

            <div className="arxiv-paper-links">
              {entry.pdfLink && (
                <a 
                  href={entry.pdfLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="arxiv-link arxiv-link-pdf"
                >
                  <FileText size={14} />
                  <span>PDF</span>
                </a>
              )}
              {entry.htmlLink && (
                <a 
                  href={entry.htmlLink}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="arxiv-link arxiv-link-html"
                >
                  <ExternalLink size={14} />
                  <span>HTML</span>
                </a>
              )}
              <a 
                href={entry.absLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="arxiv-link arxiv-link-abs"
              >
                <ExternalLink size={14} />
                <span>arXiv</span>
              </a>
            </div>

            {entry.categories.length > 1 && (
              <div className="arxiv-paper-categories">
                {entry.categories.slice(1).map((cat) => (
                  <span key={cat} className="arxiv-category-tag">{cat}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {previewPaper && (
        <div className="arxiv-preview-modal">
          <div className="arxiv-preview-modal-header">
            <div className="arxiv-preview-modal-title">
              <Maximize2 size={16} />
              <span>{previewPaper.title}</span>
            </div>
            <button 
              className="arxiv-preview-modal-close"
              onClick={() => setPreviewPaper(null)}
            >
              <X size={20} />
            </button>
          </div>
          <iframe 
            src={previewPaper.htmlLink}
            title={previewPaper.title}
            className="arxiv-preview-iframe"
          />
        </div>
      )}
    </div>
  );
}

function ArxivPaperCardComponent({ paper }: ArxivPaperCardProps) {
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  const [showReader, setShowReader] = useState(false);

  return (
    <div className="arxiv-card arxiv-card-detail">
      <div className="arxiv-card-header">
        <div className="arxiv-card-icon arxiv-card-icon-detail">
          <FileText size={20} />
        </div>
        <div className="arxiv-card-title-section">
          <h3 className="arxiv-card-title">arXiv Paper</h3>
          <p className="arxiv-card-subtitle">{paper.id} (v{paper.version})</p>
        </div>
      </div>

      <div className="arxiv-paper-detail-content">
        <h2 className="arxiv-detail-title">{paper.title}</h2>

        <div className="arxiv-detail-authors">
          <User size={14} />
          <div className="arxiv-author-list">
            {paper.authors.map((author, index) => (
              <span key={index} className="arxiv-author">
                {author.name}
                {author.affiliation && <span className="arxiv-author-affiliation"> ({author.affiliation})</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="arxiv-detail-meta">
          <div className="arxiv-meta-item">
            <Calendar size={14} />
            <span>Submitted {paper.published.split('T')[0]}</span>
            {paper.updated !== paper.published && (
              <span className="arxiv-meta-updated"> (updated {paper.updated.split('T')[0]})</span>
            )}
          </div>
          <div className="arxiv-meta-item">
            <Tag size={14} />
            <span className="arxiv-category-primary">{paper.primaryCategory}</span>
          </div>
        </div>

        {paper.categories.length > 1 && (
          <div className="arxiv-detail-categories">
            {paper.categories.map((cat) => (
              <span key={cat} className="arxiv-category-tag">{cat}</span>
            ))}
          </div>
        )}

        <div className="arxiv-detail-abstract">
          <h4>Abstract</h4>
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

        <div className="arxiv-detail-links">
          {paper.pdfLink && (
            <a 
              href={paper.pdfLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="arxiv-link arxiv-link-pdf arxiv-link-large"
            >
              <FileText size={18} />
              <span>View PDF</span>
            </a>
          )}
          {paper.htmlLink && (
            <button 
              className="arxiv-link arxiv-link-html arxiv-link-large"
              onClick={() => setShowReader(!showReader)}
            >
              <ExternalLink size={18} />
              <span>{showReader ? 'Close Reader' : 'Read Online'}</span>
            </button>
          )}
          <a 
            href={paper.absLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="arxiv-link arxiv-link-abs arxiv-link-large"
          >
            <ExternalLink size={18} />
            <span>arXiv Page</span>
          </a>
        </div>

        {showReader && paper.htmlLink && (
          <div className="arxiv-reader">
            <iframe 
              src={paper.htmlLink}
              title={`Read ${paper.title}`}
              className="arxiv-reader-iframe"
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
