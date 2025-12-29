import 'server-only';

import fs from 'fs';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import type { TableOfContentsItem } from '@/lib/types';

/**
 * Load and serialize markdown file for MDX rendering
 * @param fileName - Path to markdown file (e.g., '/PRIVACY_POLICY.md')
 * @returns Serialized MDX content
 */
export async function loadPolicyContent(
  fileName: string
): Promise<MDXRemoteSerializeResult> {
  const filePath = path.join(process.cwd(), fileName);
  const source = fs.readFileSync(filePath, 'utf-8');

  const mdx = await serialize(source, {
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [],
      format: 'mdx',
    },
  });

  return mdx;
}

/**
 * Extract headings from markdown content for table of contents
 * @param content - Raw markdown content
 * @returns Array of heading items with id, text, and level
 */
export function extractHeadings(content: string): TableOfContentsItem[] {
  const lines = content.split('\n');
  const headings: TableOfContentsItem[] = [];

  for (const line of lines) {
    // Match h2 (##) and h3 (###) headings
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, '').replace(/\*/g, ''); // Remove markdown
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Spaces to hyphens
        .trim();

      headings.push({ id, text, level });
    }
  }

  return headings;
}

/**
 * Simple in-memory cache for MDX content
 * Improves performance by avoiding repeated file reads and serialization
 */
const contentCache = new Map<string, MDXRemoteSerializeResult>();

/**
 * Load MDX content with caching
 * @param fileName - Path to markdown file
 * @returns Cached or freshly loaded MDX content
 */
export async function getCachedContent(
  fileName: string
): Promise<MDXRemoteSerializeResult> {
  if (contentCache.has(fileName)) {
    return contentCache.get(fileName)!;
  }

  const content = await loadPolicyContent(fileName);
  contentCache.set(fileName, content);
  return content;
}

/**
 * Clear the content cache
 * Useful for testing or forcing content refresh
 */
export function clearContentCache(): void {
  contentCache.clear();
}
