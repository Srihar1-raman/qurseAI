'use client';

import { useEffect, useState, useMemo } from 'react';
import { mdxComponents } from '@/components/mdx/MDXComponents';
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
    return (
      <div className="info-section">
        <div className="info-loading">
          <div className="info-loading-spinner" />
          <p>Loading content...</p>
        </div>
      </div>
    );
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

  // About section - hardcoded placeholder content
  if (sectionId === 'about') {
    return (
      <div className="info-section">
        <h2>About Qurse</h2>
        <p>Qurse is a modern AI chat interface that provides seamless conversations with advanced language models. Our platform offers a clean, intuitive experience for users to interact with AI assistants across multiple models.</p>

        <h3>Features</h3>
        <ul>
          <li>Multiple AI models including GPT-4o, Claude 3.5 Sonnet, and more</li>
          <li>Real-time conversation capabilities</li>
          <li>Local storage for conversation history</li>
          <li>Dark and light theme support</li>
          <li>Responsive design for all devices</li>
          <li>Secure authentication options</li>
        </ul>

        <h3>Technology</h3>
        <p>Built with Next.js, TypeScript, and modern web technologies, Qurse provides a fast and reliable chat experience. We integrate with leading AI providers to offer the best possible conversation quality.</p>
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
    let inList = false;
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        result.push(
          <ul key={`list-${result.length}`} className="info-list info-list-ul">
            {listItems.map((item, i) => (
              <li key={i} className="info-list-item" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // H2 Heading (##)
      if (line.startsWith('## ')) {
        flushList();
        const text = line.slice(3).replace(/\*\*/g, '');
        result.push(<h2 key={i} className="info-heading info-h2" id={slugify(text)}>{text}</h2>);
      }
      // H3 Heading (###)
      else if (line.startsWith('### ')) {
        flushList();
        const text = line.slice(4).replace(/\*\*/g, '');
        result.push(<h3 key={i} className="info-heading info-h3" id={slugify(text)}>{text}</h3>);
      }
      // List item (- or *)
      else if (line.match(/^\s*[-*]\s+/)) {
        inList = true;
        listItems.push(line.replace(/^\s*[-*]\s+/, ''));
      }
      // Empty line
      else if (line.trim() === '') {
        flushList();
      }
      // Paragraph
      else if (line.trim() !== '') {
        flushList();
        result.push(<p key={i} className="info-paragraph" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />);
      }
    }

    flushList();
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
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" className="info-link" target="_blank" rel="noopener noreferrer">$1</a>');
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
