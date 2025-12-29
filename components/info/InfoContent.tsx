'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { mdxComponents } from '@/components/mdx/MDXComponents';
import ActivityGraph from '@/components/settings/ActivityGraph';
import type { InfoSection } from '@/lib/types';

const SECTION_PATHS: Record<InfoSection, string> = {
  about: '',
  terms: '/TERMS_OF_SERVICE.md',
  privacy: '/PRIVACY_POLICY.md',
  cookies: '/COOKIE_POLICY.md',
};

interface InfoContentProps {
  sectionId: InfoSection;
}

/**
 * Info content renderer component
 * For policy sections: Fetches markdown client-side and renders with proper styling
 * About section: Uses hardcoded content (placeholder for future enhancement)
 */
export function InfoContent({ sectionId }: InfoContentProps) {
  const [markdown, setMarkdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the path to avoid unnecessary re-renders
  const filePath = useMemo(() => SECTION_PATHS[sectionId], [sectionId]);

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setError(null);

      if (sectionId === 'about') {
        setMarkdown(''); // About section uses hardcoded content
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error('Failed to load content');
        }
        const content = await response.text();
        setMarkdown(content);
      } catch (err) {
        console.error('Failed to load content:', err);
        setError('Failed to load content. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [sectionId, filePath]);

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <div className="info-section">
        <div className="info-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // About section - written content only (hero is rendered separately in InfoPageClient)
  if (sectionId === 'about') {
    return (
      <div className="info-about-content">
        <div className="info-section">
          <h2>About Qurse</h2>
          <p>Qurse is a modern AI chat interface that provides seamless conversations with advanced language models. Qurse offers a clean, intuitive experience for users to interact with AI assistants across multiple models.</p>

          <p>Built for <strong>speed</strong>, Qurse delivers fast web inference capabilities, ensuring your AI conversations are responsive and fluid. </p>

          {/* Separator */}
          <div style={{ borderBottom: '1px solid var(--color-border)', marginTop: '48px', marginBottom: '48px' }}></div>

          {/* Global Activity Graph - with h3 heading */}
          <ActivityGraph variant="global" />

          {/* Separator */}
          <div style={{ borderBottom: '1px solid var(--color-border)', marginTop: '48px', marginBottom: '48px' }}></div>

          <h3>Features</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px 24px',
            marginTop: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--color-primary)', minWidth: '4px' }}>•</span>
              <span>Optimized background processing</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--color-primary)', minWidth: '4px' }}>•</span>
              <span>Fast web inference with minimal latency</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--color-primary)', minWidth: '4px' }}>•</span>
              <span>Multi step inference capabilities</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--color-primary)', minWidth: '4px' }}>•</span>
              <span>Open sourced project</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--color-primary)', minWidth: '4px' }}>•</span>
              <span>Various dedicated agnetic chat modes</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--color-primary)', minWidth: '4px' }}>•</span>
              <span>Global context using Supermemory</span>
            </div>
          </div>

          {/* Separator */}
          <div style={{ borderBottom: '1px solid var(--color-border)', marginTop: '48px', marginBottom: '48px' }}></div>

          <h3>Technology</h3>
          <p>Built with Next.js, TypeScript, and modern web technologies, Qurse provides a fast and reliable chat experience. We integrate with leading AI providers to offer the best possible conversation quality.</p>
        </div>
      </div>
    );
  }

  // Render markdown content for policy sections
  return <MarkdownRenderer content={markdown} />;
}

/**
 * Simple markdown renderer for policy content
 * Parses markdown and renders with custom components
 */
function MarkdownRenderer({ content }: { content: string }) {
  const sections = useMemo(() => {
    const lines = content.split('\n');
    const result: React.ReactNode[] = [];
    let keyCounter = 0;

    // Track nested structure
    interface ListItem {
      text: string;
      level: number;
      children: ListItem[];
    }
    let currentList: ListItem[] = [];
    let listStack: ListItem[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        result.push(
          <ul key={`list-${keyCounter++}`} className="info-list info-list-ul">
            {renderListItems(currentList)}
          </ul>
        );
        currentList = [];
        listStack = [];
      }
    };

    const renderListItems = (items: ListItem[]): React.ReactNode => {
      return items.map((item, i) => {
        const hasChildren = item.children && item.children.length > 0;
        return (
          <li key={i} className="info-list-item">
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.text) }} />
            {hasChildren && (
              <ul className="info-list info-list-ul">
                {renderListItems(item.children)}
              </ul>
            )}
          </li>
        );
      });
    };

    let paragraphLines: string[] = [];

    const flushParagraph = () => {
      if (paragraphLines.length > 0) {
        const text = paragraphLines.join(' ').trim();
        if (text) {
          // Check if this is a bold heading (starts with ** and ends with **:)
          const boldHeadingMatch = text.match(/^\*\*([^:]+):\*\*$/);
          if (boldHeadingMatch) {
            result.push(
              <h4 key={`h4-${keyCounter++}`} className="info-heading info-h4">
                {boldHeadingMatch[1]}
              </h4>
            );
          } else {
            result.push(
              <p key={`p-${keyCounter++}`} className="info-paragraph" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(text) }} />
            );
          }
        }
        paragraphLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line - flush any accumulated content
      if (trimmed === '') {
        flushList();
        flushParagraph();
        continue;
      }

      // Headings (##, ###, ####)
      const headingMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
      if (headingMatch) {
        flushList();
        flushParagraph();

        const level = headingMatch[1].length;
        const text = headingMatch[2].replace(/\*\*/g, '');
        const HeadingTag = `h${level}` as 'h2' | 'h3' | 'h4';
        result.push(
          React.createElement(HeadingTag, {
            key: `h${level}-${keyCounter++}`,
            className: `info-heading info-h${level}`,
            id: slugify(text)
          }, text)
        );
        continue;
      }

      // Check for list item (hyphen or asterisk, possibly indented)
      const indentMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
      if (indentMatch) {
        flushParagraph();

        const indent = indentMatch[1].length;
        const text = indentMatch[2];
        const level = Math.floor(indent / 2); // 2 spaces = 1 level

        const newItem: ListItem = { text, level, children: [] };

        if (level === 0) {
          // Top-level item
          if (listStack.length > 0) {
            // We're finishing a nested section
            flushList();
          }
          currentList.push(newItem);
          listStack = [newItem];
        } else {
          // Nested item
          if (listStack.length > 0) {
            // Find the parent at the appropriate level
            while (listStack.length > level) {
              listStack.pop();
            }
            if (listStack.length > 0) {
              listStack[listStack.length - 1].children.push(newItem);
              listStack.push(newItem);
            } else {
              // Fallback: treat as top-level
              currentList.push(newItem);
              listStack = [newItem];
            }
          } else {
            // No parent, treat as top-level
            currentList.push(newItem);
            listStack = [newItem];
          }
        }
        continue;
      }

      // Ordered list item (1. 2. etc.)
      const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (olMatch) {
        flushList();
        flushParagraph();

        const num = parseInt(olMatch[1]);
        const text = olMatch[2];

        result.push(
          <ol key={`olist-${keyCounter++}`} className="info-list info-list-ol" start={num}>
            <li key={0} className="info-list-item" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(text) }} />
          </ol>
        );
        continue;
      }

      // If we were in a list and now we're not, flush it
      if (currentList.length > 0 && !indentMatch) {
        flushList();
      }

      // Paragraph content (accumulate multi-line paragraphs)
      if (paragraphLines.length > 0) {
        paragraphLines.push(' '); // Add space between lines
      }
      paragraphLines.push(trimmed);
    }

    // Flush any remaining content
    flushList();
    flushParagraph();

    return result;
  }, [content]);

  return <div className="info-section mdx-content">{sections}</div>;
}

/**
 * Format inline markdown (bold, links, etc.)
 */
function formatInlineMarkdown(text: string): string {
  return text
    // Bold (**text**)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="info-strong">$1</strong>')
    // Links [text](url)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="info-link" target="_blank" rel="noopener noreferrer">$1</a>');
}

/**
 * Create URL-friendly slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}
