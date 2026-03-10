'use client';

import React from 'react';
import { FileText, ExternalLink, Calendar, User, Quote, BookOpen, Globe } from 'lucide-react';

interface AcademicPaper {
  id?: string;
  eid?: string;
  title: string;
  authors?: string[];
  author?: string;
  summary?: string;
  description?: string;
  published?: string;
  publicationDate?: string;
  coverDate?: string;
  year?: string;
  primaryCategory?: string;
  publicationName?: string;
  citedByCount?: number;
  doi?: string;
  doiUrl?: string;
  scopusUrl?: string;
  pdfUrl?: string;
  absUrl?: string;
  url?: string;
}

interface AcademicPdfSearchResult {
  source: 'arxiv' | 'research' | 'pdf';
  results: AcademicPaper[];
}

interface AcademicPdfSearchCardProps {
  result: AcademicPdfSearchResult;
}

function getSourceIcon(source: string) {
  switch (source) {
    case 'arxiv':
      return <BookOpen size={16} className="academic-paper-icon" />;
    case 'research':
      return <Globe size={16} className="academic-paper-icon" />;
    case 'pdf':
      return <FileText size={16} className="academic-paper-icon" />;
    default:
      return <FileText size={16} className="academic-paper-icon" />;
  }
}

function getSourceName(source: string): string {
  switch (source) {
    case 'arxiv':
      return 'arXiv';
    case 'research':
      return 'Research';
    case 'pdf':
      return 'PDF';
    default:
      return source;
  }
}

export function AcademicPdfSearchCard({ result }: AcademicPdfSearchCardProps) {
  if (!result.results || result.results.length === 0) {
    return null;
  }

  return (
    <div className="academic-card academic-card-compact">
      <div className="academic-card-header academic-header-compact">
        <div className="academic-card-title-section">
          <h3 className="academic-card-title">{getSourceName(result.source)}</h3>
          <p className="academic-card-subtitle">
            {result.results.length} documents found
          </p>
        </div>
      </div>

      <div className="academic-horizontal-scroll">
        {result.results.map((paper, index) => {
          const paperId = paper.id || paper.eid || index;
          const displayUrl = result.source === 'pdf' ? paper.url : (result.source === 'arxiv' ? paper.absUrl : paper.url);
          const pdfUrl = result.source === 'arxiv' ? paper.pdfUrl : undefined;
          const displayAuthors = paper.authors || (paper.author ? [paper.author] : []);
          const displayDate = paper.published || paper.publicationDate || paper.coverDate;
          const publication = paper.publicationName || paper.primaryCategory;

          return (
            <a
              key={paperId}
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="academic-paper-card"
            >
              <div className="academic-paper-card-header">
                {getSourceIcon(result.source)}
                {paper.citedByCount !== undefined && (
                  <div className="academic-paper-citations">
                    <Quote size={10} />
                    <span>{paper.citedByCount}</span>
                  </div>
                )}
              </div>

              <h4 className="academic-paper-title">{paper.title}</h4>

              {displayAuthors.length > 0 && (
                <div className="academic-paper-authors">
                  <User size={12} className="academic-paper-meta-icon" />
                  <span>
                    {displayAuthors.slice(0, 3).map(a => typeof a === 'string' ? a : a).join(', ')}
                    {displayAuthors.length > 3 && '...'}
                  </span>
                </div>
              )}

              {publication && (
                <div className="academic-paper-publication">
                  <BookOpen size={12} className="academic-paper-meta-icon" />
                  <span>{publication}</span>
                </div>
              )}

              {displayDate && (
                <div className="academic-paper-date">
                  <Calendar size={12} className="academic-paper-meta-icon" />
                  <span>
                    {result.source === 'research' && paper.year
                      ? `${paper.year}`
                      : new Date(displayDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                    }
                  </span>
                </div>
              )}

              {(paper.summary || paper.description) && (
                <p className="academic-paper-abstract">
                  {(paper.summary || paper.description || '').slice(0, 150)}...
                </p>
              )}

              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="academic-paper-pdf-link"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <FileText size={12} />
                  <span>PDF</span>
                </a>
              )}

              <ExternalLink size={12} className="academic-paper-link-icon" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
