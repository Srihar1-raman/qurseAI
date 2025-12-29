import { serialize } from 'next-mdx-remote/serialize';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import fs from 'fs';
import path from 'path';
import type { TableOfContentsItem } from '@/lib/types';

/**
 * Extract headings from markdown content for table of contents
 */
function extractHeadingsFromContent(content: string): TableOfContentsItem[] {
  const lines = content.split('\n');
  const headings: TableOfContentsItem[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, '').replace(/\*/g, '');
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();

      headings.push({ id, text, level });
    }
  }

  return headings;
}

/**
 * Load policy content server-side
 * Returns both the serialized MDX and the headings
 */
export async function loadPolicyServer(fileName: string): Promise<{
  mdx: MDXRemoteSerializeResult | null;
  headings: TableOfContentsItem[];
}> {
  if (!fileName) {
    return { mdx: null, headings: [] };
  }

  try {
    const filePath = path.join(process.cwd(), fileName);
    const source = fs.readFileSync(filePath, 'utf-8');

    const headings = extractHeadingsFromContent(source);
    const mdx = await serialize(source, {
      mdxOptions: {
        remarkPlugins: [],
        rehypePlugins: [],
        format: 'mdx',
      },
    });

    return { mdx, headings };
  } catch (error) {
    console.error('Failed to load policy:', error);
    return { mdx: null, headings: [] };
  }
}
