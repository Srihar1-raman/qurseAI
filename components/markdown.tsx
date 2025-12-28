'use client';

import 'katex/dist/katex.min.css';

import Link from 'next/link';
import Image from 'next/image';
import Latex from 'react-latex-next';
import Marked, { ReactRenderer } from 'marked-react';
import React, { useCallback, useMemo, useState, Fragment, useRef, useEffect } from 'react';
import mermaid from 'mermaid';

import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { highlightCode } from '@/lib/shiki';
import {
  YouTubeEmbed,
  TwitterEmbed,
  SpotifyEmbed,
  PdfEmbed,
  VegaLiteEmbed,
  PlantUMLEmbed,
} from '@/components/embeds';
import { getEmbedType, isVegaLiteSpec } from '@/lib/embed-utils';
import { DiagramActions } from '@/components/markdown/DiagramActions';

// Performance constants
const THROTTLE_DELAY_MS = 150;
const VIRTUAL_SCROLL_THRESHOLD_STREAMING = 20000;
const VIRTUAL_SCROLL_THRESHOLD_NORMAL = 100000;

// Adaptive throttling thresholds (content size in characters)
const ADAPTIVE_THROTTLE_SMALL = 10000;      // <10k: 150ms
const ADAPTIVE_THROTTLE_MEDIUM = 50000;     // 10-50k: 250ms
const ADAPTIVE_THROTTLE_LARGE = 100000;     // 50-100k: 400ms
// >100k: 600ms

// Throttle delays (milliseconds)
const THROTTLE_DELAY_SMALL = 150;
const THROTTLE_DELAY_MEDIUM = 250;
const THROTTLE_DELAY_LARGE = 400;
const THROTTLE_DELAY_VERY_LARGE = 600;

// Minimal processing mode threshold
const MINIMAL_MODE_THRESHOLD = 20000; // 20k chars

// Fast streaming detection (chars per second)
const FAST_STREAMING_RATE = 5000; // 5k chars/sec

// Virtual scrolling thresholds
const VIRTUAL_SCROLL_FAST_STREAMING = 10000; // 10k for fast streaming

interface MarkdownRendererProps {
  content: string;
  isUserMessage?: boolean;
  /** Indicates if content is actively streaming. Enables performance optimizations like throttling and skipping expensive operations. */
  isStreaming?: boolean;
  /** Ultra-minimal mode for reasoning sections. Disables ALL expensive rendering: embeds, diagrams, syntax highlighting, table actions, link previews */
  minimalMode?: boolean;
}

interface CitationLink {
  text: string;
  link: string;
}

interface ProcessedContentResult {
  processedContent: string;
  citations: CitationLink[];
  latexBlocks: Array<{ id: string; content: string; isBlock: boolean }>;
  isProcessing: boolean;
  isMinimalMode?: boolean; // Indicates minimal processing mode
}

// Fallback monospace font stack (Geist_Mono not available)
const MONOSPACE_FONT = "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace";

// Escape HTML entities for fallback
function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  // Server-side fallback
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Check if URL is external (not relative)
const isExternalUrl = (href: string): boolean => {
  // If it starts with http:// or https://, it's definitely external
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return true;
  }
  // If it starts with //, it's a protocol-relative URL (external)
  if (href.startsWith('//')) {
    return true;
  }
  // Relative URLs (starting with / or ./ or ../) are internal
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
    return false;
  }
  // If it doesn't start with /, it might be relative but we'll treat it as potentially external
  // For markdown links, this is usually safe - most markdown links are absolute URLs
  return false;
};

interface CodeBlockProps {
  language: string | undefined;
  children: string;
  elementKey: string;
}

// Icon Component for theme-aware icons
const Icon: React.FC<{
  name: string;
  alt: string;
  className?: string;
}> = ({ name, alt, className }) => {
  const { resolvedTheme, mounted } = useTheme();

  return (
    <Image
      src={getIconPath(name, resolvedTheme, false, mounted)}
      alt={alt}
      width={14}
      height={14}
      className={className}
    />
  );
};

// Initialize Mermaid
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    logLevel: 'error',
    fontFamily: 'inherit',
  });
}

// Mermaid Diagram Component
const MermaidDiagram: React.FC<{ code: string }> = React.memo(({ code }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        // Validate syntax before rendering
        await mermaid.parse(code);

        // Only render if parsing succeeded
        const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, code);

        if (!cancelled) {
          setSvg(svg);
          setError('');
        }
      } catch (err) {
        // Parse or render failed - show code block instead
        if (!cancelled) {
          setError('Invalid');
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleDownloadSvg = () => {
    if (!svg) return;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    // Show code block without error message when diagram fails to render
    return (
      <div className="my-5 p-4 border border-border rounded-md bg-muted/30">
        <pre className="text-sm overflow-x-auto"><code>{code}</code></pre>
      </div>
    );
  }

  return (
    <div className="my-5 relative group diagram-container">
      <DiagramActions
        code={code}
        onDownload={handleDownloadSvg}
      />
      <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
});

MermaidDiagram.displayName = 'MermaidDiagram';

// Link Preview Component
const LinkPreview: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<{ title: string; description: string; image: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMouseEnter = useCallback(async () => {
    // Only fetch preview if not already loaded
    if (preview || isLoading) return;

    setIsLoading(true);
    try {
      // Use a proxy service or metadata fetching
      // For now, we'll do a simple implementation
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(href)}`);
      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (error) {
      console.warn('Failed to fetch link preview:', error);
    } finally {
      setIsLoading(false);
    }
  }, [href, preview, isLoading]);

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger asChild>
        <span onMouseEnter={handleMouseEnter}>{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs p-0" hideArrow>
        {preview ? (
          <div className="p-0">
            {preview.image && (
              <img
                src={preview.image}
                alt=""
                className="w-full h-24 object-cover rounded-t-md"
              />
            )}
            <div className="p-2.5">
              <p className="font-semibold text-xs text-white">{preview.title}</p>
              {preview.description && (
                <p className="text-xs text-white/80 mt-1 line-clamp-2">{preview.description}</p>
              )}
              <p className="text-xs text-white/70 mt-1.5 truncate">{new URL(href).hostname}</p>
            </div>
          </div>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
};

// Lazy-loaded CodeBlock component for large blocks
const LazyCodeBlockComponent: React.FC<CodeBlockProps> = ({ children, language, elementKey }) => {
  const toast = useToast();
  const { resolvedTheme } = useTheme();
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      setIsLoading(true);
      try {
        const html = await highlightCode(
          children,
          language || 'text',
          resolvedTheme === 'dark'
        );
        if (!cancelled) {
          setHighlightedCode(html);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('Syntax highlighting failed, using plain text:', error);
        if (!cancelled) {
          setHighlightedCode(escapeHtml(children));
          setIsLoading(false);
        }
      }
    }

    highlight();

    return () => {
      cancelled = true;
    };
  }, [children, language, resolvedTheme]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      toast.success('Code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy code');
    }
  }, [children, toast]);

  return (
    <div className="group relative my-5 rounded-md border border-border bg-accent overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-accent border-b border-border">
        <div className="flex items-center gap-2">
          {language && (
            <span className="text-xs font-medium text-muted-foreground lowercase">{language}</span>
          )}
        </div>

        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded border border-border bg-background shadow-sm transition-all duration-200 hover:bg-muted hover:scale-105 text-muted-foreground"
            title="Copy code"
          >
            <Icon name="copy" alt="Copy" />
          </button>
        </div>
      </div>

      <div className="relative">
        {isLoading ? (
          <div className="font-mono text-sm leading-relaxed p-2 text-muted-foreground animate-pulse">
            Loading syntax highlighter...
          </div>
        ) : (
          <div
            className="shiki-wrapper text-sm leading-relaxed p-2 overflow-x-auto"
            style={{
              fontFamily: MONOSPACE_FONT,
            }}
            dangerouslySetInnerHTML={{
              __html: highlightedCode,
            }}
          />
        )}
      </div>
    </div>
  );
};

const CodeBlock: React.FC<CodeBlockProps> = React.memo(
  ({ language, children, elementKey }) => {
    // Always use synchronous rendering to avoid hooks violations
    return <LazyCodeBlockComponent language={language} elementKey={elementKey}>{children}</LazyCodeBlockComponent>;
  },
  (prevProps, nextProps) => {
    return (
      prevProps.children === nextProps.children &&
      prevProps.language === nextProps.language &&
      prevProps.elementKey === nextProps.elementKey
    );
  },
);

CodeBlock.displayName = 'CodeBlock';

/**
 * Calculate adaptive throttle delay based on content size
 * Larger content needs more processing time, so we throttle more aggressively
 *
 * @param contentLength - Current content length in characters
 * @param isStreaming - Whether content is actively streaming
 * @returns Throttle delay in milliseconds (0 if not streaming)
 */
function getAdaptiveThrottleDelay(contentLength: number, isStreaming: boolean): number {
  if (!isStreaming) {
    return 0; // No throttling when not streaming
  }

  if (contentLength < ADAPTIVE_THROTTLE_SMALL) {
    return THROTTLE_DELAY_SMALL; // 150ms for small content
  }

  if (contentLength < ADAPTIVE_THROTTLE_MEDIUM) {
    return THROTTLE_DELAY_MEDIUM; // 250ms for medium content
  }

  if (contentLength < ADAPTIVE_THROTTLE_LARGE) {
    return THROTTLE_DELAY_LARGE; // 400ms for large content
  }

  return THROTTLE_DELAY_VERY_LARGE; // 600ms for very large content
}

/**
 * Detect fast streaming by measuring content growth rate
 * Returns true if content is growing faster than threshold
 *
 * @param content - Current content string
 * @param isStreaming - Whether content is actively streaming
 * @returns True if streaming is fast (>5k chars/sec)
 */
function useFastStreamingDetection(content: string, isStreaming: boolean): boolean {
  const lastContentLength = useRef(0);
  const lastUpdateTime = useRef(Date.now());
  const [isFastStreaming, setIsFastStreaming] = useState(false);

  useEffect(() => {
    if (!isStreaming) {
      setIsFastStreaming(false);
      lastContentLength.current = 0;
      lastUpdateTime.current = Date.now();
      return;
    }

    const now = Date.now();
    const timeDelta = now - lastUpdateTime.current;
    const contentDelta = content.length - lastContentLength.current;

    // Calculate growth rate (characters per second)
    if (timeDelta > 0 && contentDelta > 0) {
      const growthRate = (contentDelta / timeDelta) * 1000; // chars per second

      // Consider fast if growing faster than threshold
      setIsFastStreaming(growthRate > FAST_STREAMING_RATE);
    }

    lastContentLength.current = content.length;
    lastUpdateTime.current = now;
  }, [content, isStreaming]);

  return isFastStreaming;
}

// Optimized synchronous content processor using useMemo
const useProcessedContent = (
  content: string,
  isStreaming: boolean = false,
  isFastStreaming: boolean = false,
  explicitMinimalMode: boolean = false
): ProcessedContentResult => {
  return useMemo(() => {
    const citations: CitationLink[] = [];
    const latexBlocks: Array<{ id: string; content: string; isBlock: boolean }> = [];
    let modifiedContent = content;

    // NEW: Minimal mode for fast streaming + large content OR explicit minimal mode
    const shouldUseMinimalMode = explicitMinimalMode || (isStreaming && (
      content.length > MINIMAL_MODE_THRESHOLD || // Size-based
      isFastStreaming // Rate-based
    ));

    if (shouldUseMinimalMode) {
      // MINIMAL MODE: Skip ALL expensive operations
      // Only basic markdown parsing, no code blocks, LaTeX, citations
      return {
        processedContent: content, // No processing at all
        citations: [],
        latexBlocks: [],
        isProcessing: false,
        isMinimalMode: true,
      };
    }

    // Existing streaming mode logic (for content < 20k and slow streaming)
    if (isStreaming) {
      // Only process code blocks and basic LaTeX (skip citations and complex LaTeX)
      const codeBlocks: Array<{ id: string; content: string }> = [];
      const codeBlockPatterns = [/```[\s\S]*?```/g, /`[^`\n]+`/g];

      for (const pattern of codeBlockPatterns) {
        const matches = [...modifiedContent.matchAll(pattern)];
        let lastIndex = 0;
        let newContent = '';

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const id = `CODEBLOCK${codeBlocks.length}END`;
          codeBlocks.push({ id, content: match[0] });
          newContent += modifiedContent.slice(lastIndex, match.index) + id;
          lastIndex = match.index! + match[0].length;
        }
        newContent += modifiedContent.slice(lastIndex);
        modifiedContent = newContent;
      }

      // Basic LaTeX only (block and inline, no complex patterns)
      const basicLatexPatterns = [
        { patterns: [/\\\[([\s\S]*?)\\\]/g, /\$\$([\s\S]*?)\$\$/g], isBlock: true, prefix: 'LATEXBLOCK' },
        { patterns: [/\\\(([\s\S]*?)\\\)/g, /\$[^\$\n]+\$/g], isBlock: false, prefix: 'LATEXINLINE' },
      ];

      for (const { patterns, isBlock, prefix } of basicLatexPatterns) {
        for (const pattern of patterns) {
          const matches = [...modifiedContent.matchAll(pattern)];
          let lastIndex = 0;
          let newContent = '';

          for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const id = `${prefix}${latexBlocks.length}END`;
            latexBlocks.push({ id, content: match[0], isBlock });
            newContent += modifiedContent.slice(lastIndex, match.index) + id;
            lastIndex = match.index! + match[0].length;
          }
          newContent += modifiedContent.slice(lastIndex);
          modifiedContent = newContent;
        }
      }

      // Restore code blocks
      codeBlocks.forEach(({ id, content }) => {
        modifiedContent = modifiedContent.replace(id, content);
      });

      return {
        processedContent: modifiedContent,
        citations: [], // Skip citations during streaming
        latexBlocks,
        isProcessing: false,
        isMinimalMode: false,
      };
    }

    // Full processing when not streaming
    try {
      // Extract and protect code blocks
      const codeBlocks: Array<{ id: string; content: string }> = [];
      const codeBlockPatterns = [/```[\s\S]*?```/g, /`[^`\n]+`/g];

      for (const pattern of codeBlockPatterns) {
        const matches = [...modifiedContent.matchAll(pattern)];
        let lastIndex = 0;
        let newContent = '';

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const id = `CODEBLOCK${codeBlocks.length}END`;
          codeBlocks.push({ id, content: match[0] });

          newContent += modifiedContent.slice(lastIndex, match.index) + id;
          lastIndex = match.index! + match[0].length;
        }

        newContent += modifiedContent.slice(lastIndex);
        modifiedContent = newContent;
      }

      // Extract monetary amounts FIRST to protect them from LaTeX patterns
      const monetaryBlocks: Array<{ id: string; content: string }> = [];
      // Match monetary amounts with optional scale words and currency codes
      const monetaryRegex =
        /(^|[\s([>~≈<)])\$\d+(?:,\d{3})*(?:\.\d+)?(?:[kKmMbBtT]|\s+(?:thousand|million|billion|trillion|k|K|M|B|T))?(?:\s+(?:USD|EUR|GBP|CAD|AUD|JPY|CNY|CHF))?(?:\s*(?:per\s+(?:million|thousand|token|month|year)|\/(?:month|year|token)))?(?=$|[\s).,;!?<\]])/g;

      let monetaryProcessed = '';
      let lastMonetaryIndex = 0;
      const monetaryMatches = [...modifiedContent.matchAll(monetaryRegex)];

      for (let i = 0; i < monetaryMatches.length; i++) {
        const match = monetaryMatches[i];
        const prefix = match[1];
        const id = `MONETARY${monetaryBlocks.length}END`;
        monetaryBlocks.push({ id, content: match[0].slice(prefix.length) });

        monetaryProcessed += modifiedContent.slice(lastMonetaryIndex, match.index) + prefix + id;
        lastMonetaryIndex = match.index! + match[0].length;
      }

      monetaryProcessed += modifiedContent.slice(lastMonetaryIndex);
      modifiedContent = monetaryProcessed;

      // Extract LaTeX blocks AFTER monetary amounts are protected
      const allLatexPatterns = [
        { patterns: [/\\\[([\s\S]*?)\\\]/g, /\$\$([\s\S]*?)\$\$/g], isBlock: true, prefix: 'LATEXBLOCK' },
        {
          patterns: [
            /\\\(([\s\S]*?)\\\)/g,
            // Match $ expressions containing LaTeX commands, superscripts, subscripts, or braces
            /\$[^\$\n]*[\\^_{}][^\$\n]*\$/g,
            // Match algebraic expressions with parentheses and variables
            /\$[^\$\n]*\([^\)]*[a-zA-Z][^\)]*\)[^\$\n]*\$/g,
            // Match absolute value notation with pipes
            /\$[^\$\n]*\|[^\|]*\|[^\$\n]*\$/g,
            // Match $ expressions with single-letter variable followed by operator and number/variable
            /\$[a-zA-Z]\s*[=<>≤≥≠]\s*[0-9a-zA-Z][^\$\n]*\$/g,
            // Match $ expressions with number followed by LaTeX-style operators
            /\$[0-9][^\$\n]*[\\^_≤≥≠∈∉⊂⊃∪∩θΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ°][^\$\n]*\$/g,
            // Match simple mathematical variables (single letter or Greek letters, but not plain numbers)
            /\$[a-zA-ZθΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ]+\$/g
          ],
          isBlock: false,
          prefix: 'LATEXINLINE'
        },
      ];

      for (const { patterns, isBlock, prefix } of allLatexPatterns) {
        for (const pattern of patterns) {
          const matches = [...modifiedContent.matchAll(pattern)];
          let lastIndex = 0;
          let newContent = '';

          for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const id = `${prefix}${latexBlocks.length}END`;
            latexBlocks.push({ id, content: match[0], isBlock });

            newContent += modifiedContent.slice(lastIndex, match.index) + id;
            lastIndex = match.index! + match[0].length;
          }

          newContent += modifiedContent.slice(lastIndex);
          modifiedContent = newContent;
        }
      }

      // Escape unescaped pipe characters inside explicit markdown link texts to avoid table cell splits
      // Example: [A | B](url) -> [A \| B](url)
      try {
        const explicitLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const linkMatches = [...modifiedContent.matchAll(explicitLinkPattern)];
        if (linkMatches.length > 0) {
          let rebuilt = '';
          let lastPos = 0;
          for (let i = 0; i < linkMatches.length; i++) {
            const m = linkMatches[i];
            const full = m[0];
            const textPart = m[1];
            const urlPart = m[2];
            // Replace only unescaped '|'
            const fixedText = textPart.replace(/(^|[^\\])\|/g, '$1\\|');
            rebuilt += modifiedContent.slice(lastPos, m.index!) + `[${fixedText}](${urlPart})`;
            lastPos = m.index! + full.length;
          }
          rebuilt += modifiedContent.slice(lastPos);
          modifiedContent = rebuilt;
        }
      } catch {}

      // Process citations (simplified for performance)
      const refWithUrlRegex =
        /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?([^\]]+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g;

      let citationProcessed = '';
      let lastCitationIndex = 0;
      const citationMatches = [...modifiedContent.matchAll(refWithUrlRegex)];

      for (let i = 0; i < citationMatches.length; i++) {
        const match = citationMatches[i];
        const [fullMatch, docType, bracketText, plainText, url] = match;
        const text = bracketText || plainText;
        const fullText = (docType ? `[${docType}] ` : '') + text;
        const cleanUrl = url.replace(/[.,;:]+$/, '');
        citations.push({ text: fullText.trim(), link: cleanUrl });

        citationProcessed += modifiedContent.slice(lastCitationIndex, match.index) + `[${fullText.trim()}](${cleanUrl})`;
        lastCitationIndex = match.index! + fullMatch.length;
      }

      citationProcessed += modifiedContent.slice(lastCitationIndex);
      modifiedContent = citationProcessed;

      // Restore protected blocks in the main content and in collected citation texts
      monetaryBlocks.forEach(({ id, content }) => {
        modifiedContent = modifiedContent.replace(id, content);
        // Also restore inside citation titles so hover cards don't show placeholders
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(id, content);
        }
      });

      codeBlocks.forEach(({ id, content }) => {
        modifiedContent = modifiedContent.replace(id, content);
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(id, content);
        }
      });

      return {
        processedContent: modifiedContent,
        citations,
        latexBlocks,
        isProcessing: false,
        isMinimalMode: false,
      };
    } catch (error) {
      console.error('Error processing content:', error);
      return {
        processedContent: content,
        citations: [],
        latexBlocks: [],
        isProcessing: false,
        isMinimalMode: false,
      };
    }
  }, [content, isStreaming, isFastStreaming]);
};

/**
 * Process full content synchronously (for deferred processing)
 * This is the same logic as useProcessedContent full mode
 * Extracted for use in deferred processing hook
 */
function processFullContentSync(content: string): ProcessedContentResult {
  const citations: CitationLink[] = [];
  const latexBlocks: Array<{ id: string; content: string; isBlock: boolean }> = [];
  let modifiedContent = content;

  try {
    // Extract and protect code blocks
    const codeBlocks: Array<{ id: string; content: string }> = [];
    const codeBlockPatterns = [/```[\s\S]*?```/g, /`[^`\n]+`/g];

    for (const pattern of codeBlockPatterns) {
      const matches = [...modifiedContent.matchAll(pattern)];
      let lastIndex = 0;
      let newContent = '';

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const id = `CODEBLOCK${codeBlocks.length}END`;
        codeBlocks.push({ id, content: match[0] });

        newContent += modifiedContent.slice(lastIndex, match.index) + id;
        lastIndex = match.index! + match[0].length;
      }

      newContent += modifiedContent.slice(lastIndex);
      modifiedContent = newContent;
    }

    // Extract monetary amounts FIRST to protect them from LaTeX patterns
    const monetaryBlocks: Array<{ id: string; content: string }> = [];
    const monetaryRegex =
      /(^|[\s([>~≈<)])\$\d+(?:,\d{3})*(?:\.\d+)?(?:[kKmMbBtT]|\s+(?:thousand|million|billion|trillion|k|K|M|B|T))?(?:\s+(?:USD|EUR|GBP|CAD|AUD|JPY|CNY|CHF))?(?:\s*(?:per\s+(?:million|thousand|token|month|year)|\/(?:month|year|token)))?(?=$|[\s).,;!?<\]])/g;

    let monetaryProcessed = '';
    let lastMonetaryIndex = 0;
    const monetaryMatches = [...modifiedContent.matchAll(monetaryRegex)];

    for (let i = 0; i < monetaryMatches.length; i++) {
      const match = monetaryMatches[i];
      const prefix = match[1];
      const id = `MONETARY${monetaryBlocks.length}END`;
      monetaryBlocks.push({ id, content: match[0].slice(prefix.length) });

      monetaryProcessed += modifiedContent.slice(lastMonetaryIndex, match.index) + prefix + id;
      lastMonetaryIndex = match.index! + match[0].length;
    }

    monetaryProcessed += modifiedContent.slice(lastMonetaryIndex);
    modifiedContent = monetaryProcessed;

    // Extract LaTeX blocks AFTER monetary amounts are protected
    const allLatexPatterns = [
      { patterns: [/\\\[([\s\S]*?)\\\]/g, /\$\$([\s\S]*?)\$\$/g], isBlock: true, prefix: 'LATEXBLOCK' },
      {
        patterns: [
          /\\\(([\s\S]*?)\\\)/g,
          /\$[^\$\n]*[\\^_{}][^\$\n]*\$/g,
          /\$[^\$\n]*\([^\)]*[a-zA-Z][^\)]*\)[^\$\n]*\$/g,
          /\$[^\$\n]*\|[^\|]*\|[^\$\n]*\$/g,
          /\$[a-zA-Z]\s*[=<>≤≥≠]\s*[0-9a-zA-Z][^\$\n]*\$/g,
          /\$[0-9][^\$\n]*[\\^_≤≥≠∈∉⊂⊃∪∩θΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ°][^\$\n]*\$/g,
          /\$[a-zA-ZθΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ]+\$/g
        ],
        isBlock: false,
        prefix: 'LATEXINLINE'
      },
    ];

    for (const { patterns, isBlock, prefix } of allLatexPatterns) {
      for (const pattern of patterns) {
        const matches = [...modifiedContent.matchAll(pattern)];
        let lastIndex = 0;
        let newContent = '';

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const id = `${prefix}${latexBlocks.length}END`;
          latexBlocks.push({ id, content: match[0], isBlock });

          newContent += modifiedContent.slice(lastIndex, match.index) + id;
          lastIndex = match.index! + match[0].length;
        }

        newContent += modifiedContent.slice(lastIndex);
        modifiedContent = newContent;
      }
    }

    // Escape unescaped pipe characters inside explicit markdown link texts
    try {
      const explicitLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
      const linkMatches = [...modifiedContent.matchAll(explicitLinkPattern)];
      if (linkMatches.length > 0) {
        let rebuilt = '';
        let lastPos = 0;
        for (let i = 0; i < linkMatches.length; i++) {
          const m = linkMatches[i];
          const full = m[0];
          const textPart = m[1];
          const urlPart = m[2];
          const fixedText = textPart.replace(/(^|[^\\])\|/g, '$1\\|');
          rebuilt += modifiedContent.slice(lastPos, m.index!) + `[${fixedText}](${urlPart})`;
          lastPos = m.index! + full.length;
        }
        rebuilt += modifiedContent.slice(lastPos);
        modifiedContent = rebuilt;
      }
    } catch {}

    // Process citations
    const refWithUrlRegex =
      /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?([^\]]+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g;

    let citationProcessed = '';
    let lastCitationIndex = 0;
    const citationMatches = [...modifiedContent.matchAll(refWithUrlRegex)];

    for (let i = 0; i < citationMatches.length; i++) {
      const match = citationMatches[i];
      const [fullMatch, docType, bracketText, plainText, url] = match;
      const text = bracketText || plainText;
      const fullText = (docType ? `[${docType}] ` : '') + text;
      const cleanUrl = url.replace(/[.,;:]+$/, '');
      citations.push({ text: fullText.trim(), link: cleanUrl });

      citationProcessed += modifiedContent.slice(lastCitationIndex, match.index) + `[${fullText.trim()}](${cleanUrl})`;
      lastCitationIndex = match.index! + fullMatch.length;
    }

    citationProcessed += modifiedContent.slice(lastCitationIndex);
    modifiedContent = citationProcessed;

    // Restore protected blocks
    monetaryBlocks.forEach(({ id, content }) => {
      modifiedContent = modifiedContent.replace(id, content);
      for (let i = 0; i < citations.length; i++) {
        citations[i].text = citations[i].text.replace(id, content);
      }
    });

    codeBlocks.forEach(({ id, content }) => {
      modifiedContent = modifiedContent.replace(id, content);
      for (let i = 0; i < citations.length; i++) {
        citations[i].text = citations[i].text.replace(id, content);
      }
    });

    return {
      processedContent: modifiedContent,
      citations,
      latexBlocks,
      isProcessing: false,
      isMinimalMode: false,
    };
  } catch (error) {
    console.error('Error processing content:', error);
    return {
      processedContent: content,
      citations: [],
      latexBlocks: [],
      isProcessing: false,
      isMinimalMode: false,
    };
  }
}

/**
 * Defer full processing until streaming completes
 * During streaming: uses minimal/streaming mode
 * After streaming: processes full content in background
 *
 * @param content - Full content string
 * @param isStreaming - Whether content is actively streaming
 * @param currentProcessed - Currently processed content (minimal/streaming mode)
 * @returns Deferred processed content and processing state
 */
function useDeferredProcessing(
  content: string,
  isStreaming: boolean,
  currentProcessed: ProcessedContentResult
): {
  processedContent: ProcessedContentResult;
  isProcessing: boolean;
} {
  const [deferredContent, setDeferredContent] = useState<ProcessedContentResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    // Track streaming state changes
    const streamingStopped = wasStreamingRef.current && !isStreaming;
    wasStreamingRef.current = isStreaming;

    // When streaming stops, trigger full processing
    if (streamingStopped && !processingRef.current && currentProcessed.isMinimalMode) {
      processingRef.current = true;
      setIsProcessing(true);

      // Process in next frame to not block UI
      requestAnimationFrame(() => {
        // Use setTimeout to yield to browser
        setTimeout(() => {
          // Run full processing (not minimal mode)
          const fullProcessed = processFullContentSync(content);
          setDeferredContent(fullProcessed);
          setIsProcessing(false);
          processingRef.current = false;
        }, 0);
      });
    }

    // Reset when streaming starts again
    if (isStreaming) {
      processingRef.current = false;
      setDeferredContent(null);
    }
  }, [isStreaming, content, currentProcessed.isMinimalMode]);

  // Use deferred content if available, otherwise use current
  const finalContent = deferredContent || currentProcessed;

  return {
    processedContent: finalContent,
    isProcessing,
  };
}

const InlineCode: React.FC<{ code: string; elementKey: string }> = React.memo(({ code }) => {
  const [isCopied, setIsCopied] = useState(false);
  const toast = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
      toast.success('Code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy code');
    }
  }, [code, toast]);

  return (
    <code
      className={cn(
        'inline rounded px-1 py-0.5 font-mono text-[0.9em]',
        'bg-muted/50',
        'text-foreground/85',
        'before:content-none after:content-none',
        'hover:bg-muted/70 transition-colors duration-150 cursor-pointer',
        'align-baseline',
        isCopied && 'ring-1 ring-primary bg-primary/5',
      )}
      style={{
        fontFamily: MONOSPACE_FONT,
        fontSize: '0.85em',
        lineHeight: 'inherit',
      }}
      onClick={handleCopy}
      title={isCopied ? 'Copied!' : 'Click to copy'}
    >
      {code}
    </code>
  );
});

InlineCode.displayName = 'InlineCode';

const MarkdownTableWithActions: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const toast = useToast();

  const csvUtils = useMemo(
    () => ({
      escapeCsvValue: (value: string): string => {
        const needsQuotes = /[",\n]/.test(value);
        const escaped = value.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      },
      buildCsvFromTable: (table: HTMLTableElement): string => {
        const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];
        const csvLines: string[] = [];
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('th,td')) as HTMLTableCellElement[];
          if (cells.length > 0) {
            const line = cells
              .map((cell) => csvUtils.escapeCsvValue(cell.innerText.replace(/\u00A0/g, ' ').trim()))
              .join(',');
            csvLines.push(line);
          }
        }
        return csvLines.join('\n');
      },
    }),
    [],
  );

  const handleDownloadCsv = useCallback(() => {
    const tableEl = containerRef.current?.querySelector('[data-slot="table"]') as HTMLTableElement | null;
    if (!tableEl) return;

    try {
      const csv = csvUtils.buildCsvFromTable(tableEl);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '');
      a.href = url;
      a.download = `table-${timestamp}.csv`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Table downloaded');
    } catch (error) {
      console.error('Failed to download CSV:', error);
      toast.error('Failed to download table');
    }
  }, [csvUtils, toast]);

  const handleCopyTable = useCallback(() => {
    const tableEl = containerRef.current?.querySelector('[data-slot="table"]') as HTMLTableElement | null;
    if (!tableEl) return;

    try {
      const csv = csvUtils.buildCsvFromTable(tableEl);
      navigator.clipboard.writeText(csv);
      toast.success('Table copied to clipboard');
    } catch (error) {
      console.error('Failed to copy table:', error);
      toast.error('Failed to copy table');
    }
  }, [csvUtils, toast]);

  return (
    <div className="relative group">
      <div className="absolute -top-3 -right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleCopyTable}
          className="p-1.5 rounded border border-border bg-background shadow-sm transition-all duration-200 hover:bg-muted hover:scale-105"
          aria-label="Copy table"
          title="Copy table"
        >
          <Icon name="copy" alt="Copy" />
        </button>

        <button
          onClick={handleDownloadCsv}
          className="p-1.5 rounded border border-border bg-background shadow-sm transition-all duration-200 hover:bg-muted hover:scale-105"
          aria-label="Download CSV"
          title="Download CSV"
        >
          <Icon name="download" alt="Download" />
        </button>
      </div>
      <div ref={containerRef}>
        <Table className="border border-border !rounded-lg !m-0">{children}</Table>
      </div>
    </div>
  );
});

MarkdownTableWithActions.displayName = 'MarkdownTableWithActions';

// Inline link component with ChatGPT-style display
const InlineExternalLink: React.FC<{
  href: string;
  text: React.ReactNode;
}> = ({ href, text }) => {
  const domain = useMemo(() => {
    try {
      return new URL(href).hostname;
    } catch {
      return '';
    }
  }, [href]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary no-underline hover:underline font-medium inline-flex items-center gap-1.5"
    >
      {text}
      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs ml-1">
        <Image
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
          alt=""
          width={12}
          height={12}
          className="rounded-sm opacity-70"
          loading="lazy"
        />
        <span className="opacity-70">{domain}</span>
      </span>
    </a>
  );
};

/**
 * Processing indicator shown when deferred processing is active
 */
const ProcessingIndicator: React.FC = React.memo(() => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-accent/50 rounded-md mt-2">
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
      <span>Processing formatting...</span>
    </div>
  );
});

ProcessingIndicator.displayName = 'ProcessingIndicator';

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content, isUserMessage = false, isStreaming = false, minimalMode = false }) => {
  // Early return for minimal mode (reasoning) - skip ALL markdown processing
  if (minimalMode) {
    return (
      <div className="whitespace-pre-wrap text-muted-foreground italic opacity-70 leading-relaxed">
        {content}
      </div>
    );
  }

  // Detect fast streaming
  const isFastStreaming = useFastStreamingDetection(content, isStreaming);

  // Render content directly without throttling for smooth ChatGPT-like streaming
  // React's natural batching + requestAnimationFrame in useConversationMessages handles smooth updates
  // This eliminates visible "blocks" and creates buttery smooth streaming experience

  // Get current processed content (using content directly, no throttling)
  const currentProcessed = useProcessedContent(content, isStreaming, isFastStreaming, minimalMode);

  // Defer full processing if needed
  const { processedContent: finalProcessed, isProcessing: isDeferredProcessing } = useDeferredProcessing(
    content,
    isStreaming,
    currentProcessed
  );

  // Extract values from final processed content
  const {
    processedContent,
    citations: extractedCitations,
    latexBlocks,
    isProcessing,
    isMinimalMode: isProcessedMinimalMode
  } = finalProcessed;
  const citationLinks = extractedCitations;

  // Use explicit minimalMode prop if provided, otherwise use processed result
  const effectiveMinimalMode = minimalMode || isProcessedMinimalMode;

  // Optimized element key generation using content hash instead of indices
  // Use content directly for hash (no throttling needed)
  const contentHash = useMemo(() => {
    // Simple hash for stable keys
    let hash = 0;
    const str = content.slice(0, 200); // Use first 200 chars for hash
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }, [content]);

  // Use closures to maintain counters without re-creating on each render
  const getElementKey = useMemo(() => {
    const counters = {
      paragraph: 0,
      code: 0,
      heading: 0,
      list: 0,
      listItem: 0,
      blockquote: 0,
      table: 0,
      tableRow: 0,
      tableCell: 0,
      link: 0,
      text: 0,
      hr: 0,
    };

    return (type: keyof typeof counters, content?: string) => {
      const count = counters[type]++;
      const contentPrefix = content ? content.slice(0, 20) : '';
      return `${contentHash}-${type}-${count}-${contentPrefix}`.replace(/[^a-zA-Z0-9-]/g, '');
    };
  }, [contentHash]);

  const renderer: Partial<ReactRenderer> = useMemo(
    () => ({
      text(text: string) {
        const blockPattern = /LATEXBLOCK(\d+)END/g;
        const inlinePattern = /LATEXINLINE(\d+)END/g;

        if (!blockPattern.test(text) && !inlinePattern.test(text)) {
          return text;
        }

        blockPattern.lastIndex = 0;
        inlinePattern.lastIndex = 0;

        const components: any[] = [];
        let lastEnd = 0;
        const baseKey = getElementKey('text', text);
        const allMatches: Array<{ match: RegExpExecArray; isBlock: boolean }> = [];

        let match;
        while ((match = blockPattern.exec(text)) !== null) {
          allMatches.push({ match, isBlock: true });
        }
        while ((match = inlinePattern.exec(text)) !== null) {
          allMatches.push({ match, isBlock: false });
        }

        allMatches.sort((a, b) => a.match.index - b.match.index);

        allMatches.forEach(({ match, isBlock }) => {
          const fullMatch = match[0];
          const start = match.index;

          if (start > lastEnd) {
            const textContent = text.slice(lastEnd, start);
            const key = getElementKey('text', textContent);
            components.push(<span key={key}>{textContent}</span>);
          }

          const latexBlock = latexBlocks.find((block) => block.id === fullMatch);
          if (latexBlock) {
            const key = getElementKey('text', latexBlock.content);
            if (isBlock) {
              components.push(
                <Latex
                  key={key}
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
                  key={key}
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
          }

          lastEnd = start + fullMatch.length;
        });

        if (lastEnd < text.length) {
          const textContent = text.slice(lastEnd);
          const key = getElementKey('text', textContent);
          components.push(<span key={key}>{textContent}</span>);
        }

        return components.length === 1
          ? components[0]
          : <Fragment>{components.map((c, i) => <React.Fragment key={`${baseKey}-fragment-${i}`}>{c}</React.Fragment>)}</Fragment>;
      },
      hr() {
        const key = getElementKey('hr');
        return <hr key={key} className="my-6 border-t border-border" />;
      },
      paragraph(children) {
        const key = getElementKey('paragraph', String(children));

        // Check if this is a LaTeX block
        if (typeof children === 'string') {
          const blockMatch = children.match(/^LATEXBLOCK(\d+)END$/);
          if (blockMatch) {
            const latexBlock = latexBlocks.find((block) => block.id === children);
            if (latexBlock && latexBlock.isBlock) {
              return (
                <div className="my-6 text-center" key={key}>
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

        // Check if children contain block-level embeds (divs, iframes, etc.)
        // Also check if children have nested div/iframe structures (like embeds)
        const hasBlockContent = React.Children.toArray(children).some((child: any) => {
          if (!React.isValidElement(child)) return false;

          const type = child.type;
          const props = child.props as any;

          // Direct component type check
          const isDirectEmbed =
            type === YouTubeEmbed ||
            type === TwitterEmbed ||
            type === SpotifyEmbed ||
            type === PdfEmbed ||
            type === VegaLiteEmbed ||
            type === PlantUMLEmbed ||
            type === MermaidDiagram;

          if (isDirectEmbed) return true;

          // Check if this is an element that renders a div container with embed-like className
          // This catches wrapped components like memo'd YouTubeEmbed
          if (props?.className && typeof props.className === 'string') {
            // YouTube embed has 'rounded-lg overflow-hidden' className
            if (props.className.includes('rounded-lg') && props.className.includes('overflow-hidden')) {
              return true;
            }
          }

          // Deep check: render the child briefly to check what it produces
          // This is a fallback for wrapped components
          try {
            if (typeof type !== 'string') {
              const typeDisplayName = (type as any)?.displayName || (type as any)?.name;
              if (typeDisplayName) {
                return (
                  typeDisplayName.includes('Embed') ||
                  typeDisplayName.includes('Diagram')
                );
              }
            }
          } catch {
            // Ignore errors during introspection
          }

          return false;
        });

        // Render as div if contains block elements, otherwise as paragraph
        const Tag = hasBlockContent ? 'div' : 'p';
        const className = hasBlockContent
          ? 'my-5 leading-relaxed text-foreground'
          : `${isUserMessage ? 'leading-relaxed text-foreground !m-0' : ''} my-5 leading-relaxed text-foreground`;

        const childrenArray = React.Children.toArray(children ?? []);

        return (
          <Tag
            key={key}
            className={className}
          >
            {childrenArray.length === 1
              ? childrenArray[0]
              : childrenArray.map((child, index) => (
                  <React.Fragment key={`paragraph-child-${key}-${index}`}>{child}</React.Fragment>
                ))}
          </Tag>
        );
      },
      code(children, language) {
        const key = getElementKey('code', String(children));
        const code = String(children);

        // MINIMAL MODE: Skip all special renderers, just show plain code blocks
        if (effectiveMinimalMode) {
          return (
            <pre key={key} className="bg-muted rounded-lg p-4 my-4 overflow-x-auto border border-border">
              <code className="text-sm font-mono">{code}</code>
            </pre>
          );
        }

        // Check if JSON is actually Vega-Lite spec
        const isVegaLiteJson = language === 'json' && isVegaLiteSpec(code);

        // Special language renderers
        switch (language) {
          case 'mermaid':
            // Don't render mermaid during streaming - wait for completion
            if (isStreaming) {
              return (
                <div key={key} className="my-5 p-4 border border-border rounded-md bg-muted/30 text-muted-foreground text-sm">
                  <p>Rendering diagram...</p>
                </div>
              );
            }
            return <MermaidDiagram key={key} code={code} />;
          case 'vega-lite':
          case 'vegalite':
          case 'json':
            // Handle Vega-Lite JSON
            if (language === 'json' && !isVegaLiteJson) {
              // Regular JSON, render as code
              return (
                <CodeBlock language={language} elementKey={key} key={key}>
                  {code}
                </CodeBlock>
              );
            }
            // Vega-Lite detected
            if (isStreaming) {
              return (
                <div key={key} className="my-5 p-4 border border-border rounded-md bg-muted/30 text-muted-foreground text-sm">
                  <p>Rendering chart...</p>
                </div>
              );
            }
            return <VegaLiteEmbed key={key} code={code} />;
          case 'plantuml':
          case 'puml':
            // Don't render during streaming to avoid errors with incomplete syntax
            if (isStreaming) {
              return (
                <div key={key} className="my-5 p-4 border border-border rounded-md bg-muted/30 text-muted-foreground text-sm">
                  <p>Rendering diagram...</p>
                </div>
              );
            }
            // Additional check: don't render if code is too short to be valid
            if (code.trim().length < 10) {
              return (
                <div key={key} className="my-5 p-4 border border-border rounded-md bg-muted/30 text-muted-foreground text-sm">
                  <p>Rendering diagram...</p>
                </div>
              );
            }
            return <PlantUMLEmbed key={key} code={code} />;
          default:
            return (
              <CodeBlock language={language} elementKey={key} key={key}>
                {code}
              </CodeBlock>
            );
        }
      },
      codespan(code) {
        const codeString = typeof code === 'string' ? code : String(code || '');
        const key = getElementKey('code', codeString);
        return <InlineCode key={key} elementKey={key} code={codeString} />;
      },
      link(href, text) {
        const key = getElementKey('link', href);

        if (href.startsWith('mailto:')) {
          const email = href.replace('mailto:', '');
          return (
            <span key={key} className="break-all">
              {email}
            </span>
          );
        }

        // Check if this is an embeddable URL
        const embedType = getEmbedType(href);

        // MINIMAL MODE: Skip all embeds
        // Also skip embeds during streaming to prevent hooks violations
        if (embedType && !isUserMessage && !effectiveMinimalMode && !isStreaming) {
          switch (embedType) {
            case 'youtube':
              return <YouTubeEmbed key={key} url={href} />;
            case 'twitter':
              return <TwitterEmbed key={key} url={href} />;
            case 'spotify':
              return <SpotifyEmbed key={key} url={href} />;
            case 'pdf':
              return <PdfEmbed key={key} url={href} />;
          }
        }

        const linkText = typeof text === 'string' ? text : href;

        // For user messages, keep raw text to avoid accidental linkification changes
        if (isUserMessage) {
          if (linkText !== href && linkText !== '') {
            return (
              <span key={key} className="break-all">
                {linkText} ({href})
              </span>
            );
          }
          return (
            <span key={key} className="break-all">
              {href}
            </span>
          );
        }

        const external = isExternalUrl(href);

        // If there's descriptive link text, render as ChatGPT-style inline link
        if (linkText && linkText !== href) {
          const linkContent = external ? (
            <InlineExternalLink key={key} href={href} text={linkText} />
          ) : (
            <Link key={key} href={href} className="text-foreground no-underline hover:underline font-medium">
              {linkText}
            </Link>
          );

          // Add preview for external links (but not embeds), skip in minimal mode
          return external && !embedType && !effectiveMinimalMode ? (
            <LinkPreview key={key} href={href}>
              {linkContent}
            </LinkPreview>
          ) : linkContent;
        }

        // For bare URLs, render as inline link with domain
        // Extract domain directly without useMemo (hooks not allowed in renderer)
        let domain: string;
        try {
          domain = new URL(href).hostname;
        } catch {
          domain = href;
        }

        const bareUrlLink = (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary no-underline hover:underline font-medium inline-flex items-center gap-1.5"
          >
            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
              <Image
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                alt=""
                width={12}
                height={12}
                className="rounded-sm opacity-70"
                loading="lazy"
              />
              <span className="opacity-70">{domain}</span>
            </span>
          </a>
        );

        // Add preview for external bare URLs (but not embeds), skip in minimal mode
        return external && !embedType && !effectiveMinimalMode ? (
          <LinkPreview key={key} href={href}>
            {bareUrlLink}
          </LinkPreview>
        ) : bareUrlLink;
      },
      heading(children, level) {
        const key = getElementKey('heading', String(children));
        const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
        const sizeClasses =
          {
            1: 'text-2xl md:text-3xl font-extrabold mt-4 mb-4',
            2: 'text-xl md:text-2xl font-bold mt-4 mb-3',
            3: 'text-lg md:text-xl font-semibold mt-4 mb-3',
            4: 'text-base md:text-lg font-medium mt-4 mb-2',
            5: 'text-sm md:text-base font-medium mt-4 mb-2',
            6: 'text-xs md:text-sm font-medium mt-4 mb-2',
          }[level] || '';

        return (
          <HeadingTag key={key} className={`${sizeClasses} text-foreground tracking-tight`}>
            {children}
          </HeadingTag>
        );
      },
      list(children, ordered) {
        const key = getElementKey('list');
        const ListTag = ordered ? 'ol' : 'ul';
        const childrenArray = React.Children.toArray(children);
        return (
          <ListTag
            key={key}
            className={`my-5 pl-6 space-y-2 text-foreground ${ordered ? 'list-decimal' : 'list-disc'}`}
          >
            {childrenArray.map((child, index) => (
              <React.Fragment key={`list-item-${key}-${index}`}>{child}</React.Fragment>
            ))}
          </ListTag>
        );
      },
      listItem(children) {
        const key = getElementKey('listItem');
        return (
          <li key={key} className="pl-1 leading-relaxed">
            {children}
          </li>
        );
      },
      blockquote(children) {
        const key = getElementKey('blockquote');
        const childrenArray = React.Children.toArray(children);
        return (
          <blockquote
            key={key}
            className="my-6 border-l-4 border-primary pl-4 py-1 text-foreground italic bg-primary/5 rounded-r-md"
          >
            {childrenArray.map((child, index) => (
              <React.Fragment key={`blockquote-child-${key}-${index}`}>{child}</React.Fragment>
            ))}
          </blockquote>
        );
      },
      table(children) {
        const key = getElementKey('table');
        // MINIMAL MODE: Simple table without actions
        if (effectiveMinimalMode) {
          return (
            <div key={key} className="my-5 overflow-x-auto border border-border rounded-lg">
              <table className="min-w-full divide-y divide-border">
                {children}
              </table>
            </div>
          );
        }
        return <MarkdownTableWithActions key={key}>{children}</MarkdownTableWithActions>;
      },
      tableRow(children) {
        const key = getElementKey('tableRow');
        const childrenArray = React.Children.toArray(children);
        return (
          <TableRow key={key} className="border-b border-border">
            {childrenArray.map((child, index) => (
              <React.Fragment key={`tablecell-${key}-${index}`}>{child}</React.Fragment>
            ))}
          </TableRow>
        );
      },
      tableCell(children, flags) {
        const key = getElementKey('tableCell');
        const alignClass = flags.align ? `text-${flags.align}` : 'text-left';
        const isHeader = flags.header;
        const childrenArray = React.Children.toArray(children);

        return isHeader ? (
          <TableHead
            key={key}
            className={cn(
              alignClass,
              'border-r last:border-r-0 bg-muted/30 font-semibold !p-2 !m-1 !text-wrap',
              'border-border',
            )}
          >
            {childrenArray.map((child, index) => (
              <React.Fragment key={`thead-cell-${key}-${index}`}>{child}</React.Fragment>
            ))}
          </TableHead>
        ) : (
          <TableCell
            key={key}
            className={cn(alignClass, 'border-r last:border-r-0 !p-2 !m-1 !text-wrap', 'border-border')}
          >
            {childrenArray.map((child, index) => (
              <React.Fragment key={`tcell-${key}-${index}`}>{child}</React.Fragment>
            ))}
          </TableCell>
        );
      },
      tableHeader(children) {
        const key = getElementKey('table');
        const childrenArray = React.Children.toArray(children);
        return (
          <TableHeader key={key} className="!p-1 !m-1 [&_tr]:border-b [&_tr]:border-border">
            {childrenArray.map((child, index) => (
              <React.Fragment key={`thead-${key}-${index}`}>{child}</React.Fragment>
            ))}
          </TableHeader>
        );
      },
      tableBody(children) {
        const key = getElementKey('table');
        const childrenArray = React.Children.toArray(children);
        return (
          <TableBody key={key} className="!text-wrap !m-1">
            {childrenArray.map((child, index) => (
              <React.Fragment key={`tbody-${key}-${index}`}>{child}</React.Fragment>
            ))}
          </TableBody>
        );
      },
    }),
    [latexBlocks, isUserMessage, getElementKey, effectiveMinimalMode, isStreaming],
  );

  // Show a progressive loading state for large content
  if (isProcessing && content.length > 15000) {
    return (
      <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            Processing content ({Math.round(content.length / 1024)}KB)...
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-5/6"></div>
            <div className="h-8 bg-muted rounded w-2/3"></div>
            <div className="h-3 bg-muted rounded w-4/5"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans">
        <Marked renderer={renderer}>{processedContent}</Marked>
      </div>
      {isDeferredProcessing && <ProcessingIndicator />}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isUserMessage === nextProps.isUserMessage &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

// Virtual scrolling component for very large content
const VirtualMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content, isUserMessage = false, isStreaming = false }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Split content into chunks for virtual scrolling
  const contentChunks = useMemo(() => {
    const lines = content.split('\n');
    const chunkSize = 20; // Lines per chunk
    const chunks = [];

    for (let i = 0; i < lines.length; i += chunkSize) {
      chunks.push(lines.slice(i, i + chunkSize).join('\n'));
    }

    return chunks;
  }, [content]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, clientHeight } = containerRef.current;
    const lineHeight = 24; // Approximate line height
    const start = Math.floor(scrollTop / lineHeight);
    const end = Math.min(start + Math.ceil(clientHeight / lineHeight) + 10, contentChunks.length);

    setVisibleRange({ start: Math.max(0, start - 5), end });
  }, [contentChunks.length]);

  // Lower threshold during streaming for better performance
  // Match OptimizedMarkdownRenderer threshold for consistency
  const virtualScrollThreshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;

  // Only use virtual scrolling for very large content
  if (content.length < virtualScrollThreshold) {
    return <MarkdownRenderer content={content} isUserMessage={isUserMessage} isStreaming={isStreaming} />;
  }

  return (
    <div
      ref={containerRef}
      className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans max-h-96 overflow-y-auto"
      onScroll={handleScroll}
    >
      {contentChunks.slice(visibleRange.start, visibleRange.end).map((chunk, index) => (
        <MarkdownRenderer
          key={`chunk-${visibleRange.start + index}`}
          content={chunk}
          isUserMessage={isUserMessage}
          isStreaming={isStreaming}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isUserMessage === nextProps.isUserMessage &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

VirtualMarkdownRenderer.displayName = 'VirtualMarkdownRenderer';

export const CopyButton = React.memo(({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  const toast = useToast();

  const handleCopy = React.useCallback(async () => {
    if (!navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success('Copied to clipboard');
  }, [text, toast]);

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-xs rounded-full">
      {isCopied ? <Check className="h-4 w-4" /> : <Icon name="copy" alt="Copy" />}
    </Button>
  );
});

CopyButton.displayName = 'CopyButton';

// Performance monitoring hook
const usePerformanceMonitor = (content: string) => {
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
  }, [content]);

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    if (renderTime > 100) {
      console.warn(`Markdown render took ${renderTime.toFixed(2)}ms for ${content.length} characters`);
    }
  }, [content.length]);
};

// Main optimized markdown component with automatic optimization selection
const OptimizedMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content, isUserMessage = false, isStreaming = false }) => {
  usePerformanceMonitor(content);

  // Detect fast streaming for threshold adjustment
  const isFastStreaming = useFastStreamingDetection(content, isStreaming);

  // Lower threshold for fast streaming
  const virtualScrollThreshold = isFastStreaming
    ? VIRTUAL_SCROLL_FAST_STREAMING // 10k for fast streaming
    : (isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL);

  // Automatically choose the best rendering strategy based on content size
  if (content.length > virtualScrollThreshold) {
    return <VirtualMarkdownRenderer content={content} isUserMessage={isUserMessage} isStreaming={isStreaming} />;
  }

  return <MarkdownRenderer content={content} isUserMessage={isUserMessage} isStreaming={isStreaming} />;
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isUserMessage === nextProps.isUserMessage &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

OptimizedMarkdownRenderer.displayName = 'OptimizedMarkdownRenderer';

export { MarkdownRenderer, VirtualMarkdownRenderer, OptimizedMarkdownRenderer as default };
