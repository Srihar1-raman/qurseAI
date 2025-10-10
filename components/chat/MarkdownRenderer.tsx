'use client';

import 'katex/dist/katex.min.css';
import React, { useState, useMemo } from 'react';
import Latex from 'react-latex-next';
import Marked, { ReactRenderer } from 'marked-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';

// Types
interface CodeBlockProps {
  language?: string;
  children: string;
}

interface InlineCodeProps {
  children: string;
}

interface LinkProps {
  href: string;
  children: React.ReactNode;
}

interface TableProps {
  children: React.ReactNode;
}

// Enhanced Code Block Component
const CodeBlock = ({ language, children }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="enhanced-code-block">
      <div className="code-header">
        {language && <span className="language-tag">{language}</span>}
        <button 
          onClick={handleCopy}
          className="copy-button"
          title="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div className="code-content">
        <SyntaxHighlighter
          language={language || 'text'}
          style={resolvedTheme === 'dark' ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 8px 8px',
            fontSize: '0.875rem',
            lineHeight: '1.5',
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            color: 'var(--color-text-secondary)',
            paddingRight: '1rem',
            minWidth: '2.5rem',
            textAlign: 'right',
            userSelect: 'none',
            fontSize: '0.75rem',
          }}
          PreTag={({ children, ...props }) => (
            <pre {...props} className="syntax-highlighter-pre">
              {children}
            </pre>
          )}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// Enhanced Inline Code Component
const InlineCode = ({ children }: InlineCodeProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Smart detection for explanatory vs copyable code
  const trimmedChildren = children.trim();
  const isExplanatory = (
    trimmedChildren.length <= 30 && 
    !trimmedChildren.includes('\n') &&
    !trimmedChildren.includes('```') &&
    (
      // Simple mathematical expressions
      /^[a-zA-Z0-9\s=<>+\-*/()\[\]{}.,;:_^]+$/.test(trimmedChildren) ||
      // File extensions and simple commands
      /^[a-zA-Z0-9._-]+$/.test(trimmedChildren) ||
      // Simple mathematical notation
      /^[O()VE+\-*/^=<>0-9\s]+$/.test(trimmedChildren) &&
      !trimmedChildren.includes('\\')
    )
  );
  
  const codeClass = isExplanatory ? "enhanced-inline-code explanatory" : "enhanced-inline-code";

  return (
    <code 
      className={codeClass}
      onClick={isExplanatory ? undefined : handleCopy}
      title={isExplanatory ? undefined : (copied ? 'Copied!' : 'Click to copy')}
    >
      {children}
    </code>
  );
};

// Enhanced Table Component
const Table = ({ children }: TableProps) => (
  <div className="enhanced-table-wrapper">
    <table className="enhanced-table">{children}</table>
  </div>
);

// Enhanced Link Component
const Link = ({ href, children }: LinkProps) => {
  const isExternal = href.startsWith('http');
  
  return (
    <a 
      href={href} 
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="enhanced-link"
    >
      {children}
      {isExternal && <ExternalLink size={12} className="external-link-icon" />}
    </a>
  );
};

// Main MarkdownRenderer Component
interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { resolvedTheme } = useTheme();

  // Scira's LaTeX extraction approach
  const { processedContent, latexBlocks } = useMemo(() => {
    const citations: any[] = [];
    const latexBlocks: Array<{ id: string; content: string; isBlock: boolean }> = [];
    let modifiedContent = content;

    // First, extract and protect code blocks to prevent LaTeX processing inside them
    const codeBlocks: Array<{ id: string; content: string }> = [];
    const codeBlockPatterns = [
      /```[\s\S]*?```/g, // Fenced code blocks
      /`[^`\n]+`/g, // Inline code
    ];

    codeBlockPatterns.forEach((pattern) => {
      modifiedContent = modifiedContent.replace(pattern, (match) => {
        const id = `CODEBLOCK${codeBlocks.length}END`;
        codeBlocks.push({ id, content: match });
        return id;
      });
    });

    // Then extract and protect LaTeX blocks
    // Extract block equations first (they need to be standalone)
    const blockPatterns = [
      { pattern: /\\\[([\s\S]*?)\\\]/g, isBlock: true },
      { pattern: /\$\$([\s\S]*?)\$\$/g, isBlock: true },
    ];

    blockPatterns.forEach(({ pattern, isBlock }) => {
      modifiedContent = modifiedContent.replace(pattern, (match) => {
        const id = `LATEXBLOCK${latexBlocks.length}END`;
        latexBlocks.push({ id, content: match, isBlock });
        return id;
      });
    });

    // Process LaTeX patterns
    const inlinePatterns = [
      { pattern: /\\\(([\s\S]*?)\\\)/g, isBlock: false },
      { pattern: /\$(?![{#])[^\$\n]+?\$/g, isBlock: false },
    ];

    inlinePatterns.forEach(({ pattern, isBlock }) => {
      modifiedContent = modifiedContent.replace(pattern, (match) => {
        const id = `LATEXINLINE${latexBlocks.length}END`;
        latexBlocks.push({ id, content: match, isBlock });
        return id;
      });
    });

    // Restore protected code blocks
    codeBlocks.forEach(({ id, content }) => {
      modifiedContent = modifiedContent.replace(id, content);
    });

    return { processedContent: modifiedContent, latexBlocks };
  }, [content]);

  // Handle empty content
  if (!content || content.trim() === '') {
    return <div className={`markdown-renderer empty ${className}`}>No content to render</div>;
  }

  const generateKey = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const renderer: Partial<ReactRenderer> = {
    text(text: string) {
      // Check if this text contains any LaTeX placeholders
      const blockPattern = /LATEXBLOCK(\d+)END/g;
      const inlinePattern = /LATEXINLINE(\d+)END/g;

      // If no LaTeX placeholders, return text as-is
      if (!blockPattern.test(text) && !inlinePattern.test(text)) {
        return text;
      }

      // Reset regex state
      blockPattern.lastIndex = 0;
      inlinePattern.lastIndex = 0;

      // Process the text to replace placeholders with LaTeX components
      const components: any[] = [];
      let lastEnd = 0;

      // Collect all matches (both block and inline)
      const allMatches: Array<{ match: RegExpExecArray; isBlock: boolean }> = [];

      let match;
      while ((match = blockPattern.exec(text)) !== null) {
        allMatches.push({ match, isBlock: true });
      }

      while ((match = inlinePattern.exec(text)) !== null) {
        allMatches.push({ match, isBlock: false });
      }

      // Sort matches by position
      allMatches.sort((a, b) => a.match.index - b.match.index);

      // Process matches in order
      allMatches.forEach(({ match, isBlock }) => {
        const fullMatch = match[0];
        const start = match.index;

        // Add text before this match
        if (start > lastEnd) {
          const textContent = text.slice(lastEnd, start);
          components.push(<span key={`text-${components.length}-${generateKey()}`}>{textContent}</span>);
        }

        // Find the corresponding LaTeX block
        const latexBlock = latexBlocks.find((block) => block.id === fullMatch);
        if (latexBlock) {
          if (isBlock) {
            // Don't wrap block equations in div here - let paragraph handler do it
            components.push(
              <Latex
                key={`latex-${components.length}-${generateKey()}`}
                delimiters={[
                  { left: '$$', right: '$$', display: true },
                  { left: '\\[', right: '\\]', display: true },
                ]}
                strict={false}
              >
                {latexBlock.content}
              </Latex>,
            );
          } else {
            components.push(
              <Latex
                key={`latex-${components.length}-${generateKey()}`}
                delimiters={[
                  { left: '$', right: '$', display: false },
                  { left: '\\(', right: '\\)', display: false },
                ]}
                strict={false}
              >
                {latexBlock.content}
              </Latex>,
            );
          }
        } else {
          components.push(<span key={`fallback-${components.length}-${generateKey()}`}>{fullMatch}</span>);
        }

        lastEnd = start + fullMatch.length;
      });

      // Add any remaining text
      if (lastEnd < text.length) {
        const textContent = text.slice(lastEnd);
        components.push(<span key={`text-final-${components.length}-${generateKey()}`}>{textContent}</span>);
      }

      return components.length === 1 ? components[0] : <React.Fragment key={generateKey()}>{components}</React.Fragment>;
    },
    hr() {
      return <hr key={generateKey()} className="enhanced-hr" />;
    },
    paragraph(children) {
      // Check if the paragraph contains only a LaTeX block placeholder
      if (typeof children === 'string') {
        const blockMatch = children.match(/^LATEXBLOCK(\d+)END$/);
        if (blockMatch) {
          const latexBlock = latexBlocks.find((block) => block.id === children);
          if (latexBlock && latexBlock.isBlock) {
            // Render block equations outside of paragraph tags
            return (
              <div className="my-6 text-center" key={generateKey()}>
                <Latex
                  delimiters={[
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                  ]}
                  strict={false}
                >
                  {latexBlock.content}
                </Latex>
              </div>
            );
          }
        }
      }

      return (
        <p key={generateKey()} className="enhanced-paragraph">
          {children}
        </p>
      );
    },
    code(children, language) {
      // This handles fenced code blocks (```)
      return (
        <CodeBlock language={language} key={generateKey()}>
          {String(children)}
        </CodeBlock>
      );
    },
    codespan(code) {
      // This handles inline code (`code`)
      const codeString = typeof code === 'string' ? code : String(code || '');
      return <InlineCode key={generateKey()}>{codeString}</InlineCode>;
    },
    link(href, text) {
      return (
        <Link key={generateKey()} href={href || '#'}>
          {text}
        </Link>
      );
    },
    heading(children, level) {
      const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
      const headingClass = `enhanced-heading h${level}`;

      return (
        <HeadingTag key={generateKey()} className={headingClass}>
          {children}
        </HeadingTag>
      );
    },
    list(children, ordered) {
      const ListTag = ordered ? 'ol' : 'ul';
      const listClass = `enhanced-list ${ordered ? 'ol' : 'ul'}`;
      
      return (
        <ListTag key={generateKey()} className={listClass}>
          {children}
        </ListTag>
      );
    },
    listItem(children) {
      return (
        <li key={generateKey()} className="enhanced-list-item">
          {children}
        </li>
      );
    },
    blockquote(children) {
      return (
        <blockquote key={generateKey()} className="enhanced-blockquote">
          {children}
        </blockquote>
      );
    },
    table(children) {
      return <Table key={generateKey()}>{children}</Table>;
    },
    tableRow(children) {
      return <tr key={generateKey()} className="enhanced-tr">{children}</tr>;
    },
    tableCell(children, flags) {
      const isHeader = flags.header;

      return isHeader ? (
        <th key={generateKey()} className="enhanced-th">
          {children}
        </th>
      ) : (
        <td key={generateKey()} className="enhanced-td">
          {children}
        </td>
      );
    },
    tableHeader(children) {
      return (
        <thead key={generateKey()} className="enhanced-thead">
          {children}
        </thead>
      );
    },
    tableBody(children) {
      return (
        <tbody key={generateKey()} className="enhanced-tbody">
          {children}
        </tbody>
      );
    },
    strong(children) {
      return <strong key={generateKey()} className="enhanced-strong">{children}</strong>;
    },
    em(children) {
      return <em key={generateKey()} className="enhanced-em">{children}</em>;
    },
    del(children) {
      return <del key={generateKey()} className="enhanced-del">{children}</del>;
    },
    image(href, text) {
      return (
        <img 
          key={generateKey()}
          src={href || ''} 
          alt={text || ''} 
          className="enhanced-image"
        />
      );
    },
  };

  return (
    <div className={`markdown-renderer ${className}`}>
      <Marked renderer={renderer}>{processedContent}</Marked>
    </div>
  );
}

