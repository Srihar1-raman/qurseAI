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
// CRITICAL: Memoized to prevent re-renders during streaming
// SyntaxHighlighter is extremely expensive for large code blocks
const CodeBlock = React.memo(({ language, children }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  
  // Track content length changes to detect streaming
  // CRITICAL: Use ref instead of state to prevent infinite loops
  const prevLengthRef = React.useRef(0);
  const streamingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isStreamingRef = React.useRef(false);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  // Detect if content is actively streaming (growing rapidly)
  // Use ref instead of state to avoid re-render loops
  React.useEffect(() => {
    const currentLength = children.length;
    const prevLength = prevLengthRef.current;
    
    // Initialize on first render
    if (prevLength === 0) {
      prevLengthRef.current = currentLength;
      return;
    }
    
    // Clear any existing timeout
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }
    
    if (currentLength > prevLength) {
      // Content is growing - mark as streaming
      if (!isStreamingRef.current) {
        isStreamingRef.current = true;
        forceUpdate(); // Force re-render to update shouldHighlight
      }
      
      // Wait 500ms after last change before considering stream complete
      streamingTimeoutRef.current = setTimeout(() => {
        if (isStreamingRef.current) {
          isStreamingRef.current = false;
          forceUpdate(); // Force re-render to enable highlighting
        }
      }, 500);
    }
    
    prevLengthRef.current = currentLength;
    
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [children, forceUpdate]); // ⚠️ CRITICAL: Include forceUpdate but it's stable from useReducer

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [children]);

  // Performance optimization: Skip syntax highlighting for large code blocks OR during streaming
  // SyntaxHighlighter is extremely expensive (causes crashes during streaming)
  // CRITICAL: Disable during streaming and for large blocks
  const codeLength = children.length;
  const MAX_LINES_FOR_HIGHLIGHTING = 200; // Reduced - line numbers are expensive
  const MAX_CHARS_FOR_HIGHLIGHTING = 5000; // Reduced - parsing is expensive
  
  // Optimized: Count newlines instead of splitting entire string (much faster)
  const lineCount = React.useMemo(() => {
    if (codeLength > MAX_CHARS_FOR_HIGHLIGHTING) return Infinity;
    let count = 0;
    for (let i = 0; i < codeLength; i++) {
      if (children[i] === '\n') count++;
    }
    return count + 1; // +1 for last line
  }, [children, codeLength]);
  
  // CRITICAL: Disable highlighting during streaming OR for large blocks
  // During streaming, SyntaxHighlighter causes crashes
  const shouldHighlight = !isStreamingRef.current && codeLength <= MAX_CHARS_FOR_HIGHLIGHTING && lineCount <= MAX_LINES_FOR_HIGHLIGHTING;
  // Disable line numbers for blocks > 100 lines (very expensive)
  const showLineNumbers = shouldHighlight && lineCount <= 100;

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
        {shouldHighlight ? (
          <SyntaxHighlighter
            language={language || 'text'}
            style={resolvedTheme === 'dark' ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              borderRadius: '0 0 8px 8px',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
            showLineNumbers={showLineNumbers}
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
        ) : (
          // Fallback for large/streaming code blocks - plain <pre> to avoid crashes
          <pre
            className="syntax-highlighter-pre"
            style={{
              margin: 0,
              borderRadius: '0 0 8px 8px',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              padding: '1rem',
              backgroundColor: resolvedTheme === 'dark' ? '#282c34' : '#f5f5f5',
              color: resolvedTheme === 'dark' ? '#abb2bf' : '#383a42',
              overflow: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <code>{children}</code>
          </pre>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if content actually changed
  // CRITICAL: During streaming, children prop changes frequently
  // This comparison prevents unnecessary re-renders when content is identical
  return prevProps.language === nextProps.language && prevProps.children === nextProps.children;
});

CodeBlock.displayName = 'CodeBlock';

// Enhanced Inline Code Component
// CRITICAL: Memoized to prevent re-renders during streaming
const InlineCode = React.memo(({ children }: InlineCodeProps) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [children]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Smart detection for explanatory vs copyable code
  const trimmedChildren = React.useMemo(() => children.trim(), [children]);
  const isExplanatory = React.useMemo(() => (
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
  ), [trimmedChildren]);
  
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
}, (prevProps, nextProps) => {
  // Only re-render if content changed
  return prevProps.children === nextProps.children;
});

InlineCode.displayName = 'InlineCode';

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
  // const { resolvedTheme } = useTheme(); // Reserved for future use

  // Scira's LaTeX extraction approach
  const { processedContent, latexBlocks } = useMemo(() => {
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

  // CRITICAL: Memoize renderer object to prevent Marked from re-initializing
  // The renderer object should be stable across renders
  // MUST be called before any early returns to maintain hook order
  const renderer: Partial<ReactRenderer> = React.useMemo(() => {
    // Stable key generator - use index-based keys instead of random
    let keyCounter = 0;
    const getStableKey = (prefix: string) => `${prefix}-${keyCounter++}`;
    
    // Pre-compile regex patterns once (performance optimization)
    const blockPattern = /LATEXBLOCK(\d+)END/g;
    const inlinePattern = /LATEXINLINE(\d+)END/g;
    
    return {
      text(text: string) {
      // Quick check: if text doesn't contain LATEX markers, return immediately
      // This avoids expensive regex operations for most text nodes
      if (!text.includes('LATEXBLOCK') && !text.includes('LATEXINLINE')) {
        return text;
      }

      // Reset regex state (global regex can have stale state)
      blockPattern.lastIndex = 0;
      inlinePattern.lastIndex = 0;
      
      // Check if this text contains any LaTeX placeholders
      if (!blockPattern.test(text) && !inlinePattern.test(text)) {
        return text;
      }

      // Reset regex state again after test
      blockPattern.lastIndex = 0;
      inlinePattern.lastIndex = 0;

      // Process the text to replace placeholders with LaTeX components
      const components: React.ReactNode[] = [];
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
          components.push(<span key={getStableKey('text')}>{textContent}</span>);
        }

        // Find the corresponding LaTeX block
        const latexBlock = latexBlocks.find((block) => block.id === fullMatch);
        if (latexBlock) {
          if (isBlock) {
            // Don't wrap block equations in div here - let paragraph handler do it
            components.push(
              <Latex
                key={getStableKey('latex')}
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
                key={getStableKey('latex')}
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
          components.push(<span key={getStableKey('fallback')}>{fullMatch}</span>);
        }

        lastEnd = start + fullMatch.length;
      });

      // Add any remaining text
      if (lastEnd < text.length) {
        const textContent = text.slice(lastEnd);
        components.push(<span key={getStableKey('text-final')}>{textContent}</span>);
      }

      return components.length === 1 ? components[0] : <React.Fragment key={getStableKey('fragment')}>{components}</React.Fragment>;
    },
    hr() {
      return <hr key={getStableKey('element')} className="enhanced-hr" />;
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
              <div className="my-6 text-center" key={getStableKey('element')}>
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
        <p key={getStableKey('element')} className="enhanced-paragraph">
          {children}
        </p>
      );
    },
    code(children, language) {
      // This handles fenced code blocks (```)
      return (
        <CodeBlock language={language} key={getStableKey('element')}>
          {String(children)}
        </CodeBlock>
      );
    },
    codespan(code) {
      // This handles inline code (`code`)
      const codeString = typeof code === 'string' ? code : String(code || '');
      return <InlineCode key={getStableKey('element')}>{codeString}</InlineCode>;
    },
    link(href, text) {
      return (
        <Link key={getStableKey('element')} href={href || '#'}>
          {text}
        </Link>
      );
    },
    heading(children, level) {
      const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
      const headingClass = `enhanced-heading h${level}`;

      return (
        <HeadingTag key={getStableKey('element')} className={headingClass}>
          {children}
        </HeadingTag>
      );
    },
    list(children, ordered) {
      const ListTag = ordered ? 'ol' : 'ul';
      const listClass = `enhanced-list ${ordered ? 'ol' : 'ul'}`;
      
      return (
        <ListTag key={getStableKey('element')} className={listClass}>
          {children}
        </ListTag>
      );
    },
    listItem(children) {
      return (
        <li key={getStableKey('element')} className="enhanced-list-item">
          {children}
        </li>
      );
    },
    blockquote(children) {
      return (
        <blockquote key={getStableKey('element')} className="enhanced-blockquote">
          {children}
        </blockquote>
      );
    },
    table(children) {
      return <Table key={getStableKey('element')}>{children}</Table>;
    },
    tableRow(children) {
      return <tr key={getStableKey('element')} className="enhanced-tr">{children}</tr>;
    },
    tableCell(children, flags) {
      const isHeader = flags.header;

      return isHeader ? (
        <th key={getStableKey('element')} className="enhanced-th">
          {children}
        </th>
      ) : (
        <td key={getStableKey('element')} className="enhanced-td">
          {children}
        </td>
      );
    },
    tableHeader(children) {
      return (
        <thead key={getStableKey('element')} className="enhanced-thead">
          {children}
        </thead>
      );
    },
    tableBody(children) {
      return (
        <tbody key={getStableKey('element')} className="enhanced-tbody">
          {children}
        </tbody>
      );
    },
    strong(children) {
      return <strong key={getStableKey('element')} className="enhanced-strong">{children}</strong>;
    },
    em(children) {
      return <em key={getStableKey('element')} className="enhanced-em">{children}</em>;
    },
    del(children) {
      return <del key={getStableKey('element')} className="enhanced-del">{children}</del>;
    },
    image(href, text) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          key={getStableKey('element')}
          src={href || ''} 
          alt={text || ''} 
          className="enhanced-image"
        />
      );
    },
  };
  }, [latexBlocks]); // Only recreate if latexBlocks change

  // Handle empty content AFTER all hooks (React Rules of Hooks)
  if (!content || content.trim() === '') {
    return <div className={`markdown-renderer empty ${className}`}>No content to render</div>;
  }

  return (
    <div className={`markdown-renderer ${className}`}>
      <Marked renderer={renderer}>{processedContent}</Marked>
    </div>
  );
}

