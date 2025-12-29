'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Custom heading component with ID for anchor links
 * Generates slug from text for TOC linking
 */
export function Heading({ level, children, ...props }: any) {
  const text = typeof children === 'string' ? children : children?.toString?.() || '';
  const id = useMemo(
    () =>
      text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim(),
    [text]
  );

  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <Tag
      id={id}
      className={cn('info-heading', `info-h${level}`)}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * Custom link component with external link indicator
 */
export function CustomLink({ href, children, ...props }: any) {
  const isExternal = href?.startsWith('http');

  return (
    <a
      href={href}
      className="info-link"
      {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
      {...props}
    >
      {children}
      {isExternal && <span className="info-external-icon">↗</span>}
    </a>
  );
}

/**
 * Custom list item with proper styling
 */
export function ListItem({ children, ...props }: any) {
  return <li className="info-list-item" {...props}>{children}</li>;
}

/**
 * Custom unordered list
 */
export function UnorderedList({ children, ...props }: any) {
  return <ul className="info-list info-list-ul" {...props}>{children}</ul>;
}

/**
 * Custom ordered list
 */
export function OrderedList({ children, ...props }: any) {
  return <ol className="info-list info-list-ol" {...props}>{children}</ol>;
}

/**
 * Custom paragraph
 */
export function Paragraph({ children, ...props }: any) {
  return <p className="info-paragraph" {...props}>{children}</p>;
}

/**
 * Custom strong/bold
 */
export function Strong({ children, ...props }: any) {
  return <strong className="info-strong" {...props}>{children}</strong>;
}

/**
 * Export all MDX components for use with next-mdx-remote
 */
export const mdxComponents = {
  h1: (props: any) => <Heading level={1} {...props} />,
  h2: (props: any) => <Heading level={2} {...props} />,
  h3: (props: any) => <Heading level={3} {...props} />,
  h4: (props: any) => <Heading level={4} {...props} />,
  h5: (props: any) => <Heading level={5} {...props} />,
  h6: (props: any) => <Heading level={6} {...props} />,
  a: CustomLink,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  p: Paragraph,
  strong: Strong,
};
