'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
}

/**
 * Custom heading component with ID for anchor links
 * Generates slug from text for TOC linking
 */
export function Heading({ level, children, ...props }: HeadingProps) {
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

interface CustomLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  href?: string;
  children: ReactNode;
}

/**
 * Custom link component with external link indicator
 */
export function CustomLink({ href, children, ...props }: CustomLinkProps) {
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

interface ListItemProps extends HTMLAttributes<HTMLLIElement> {
  children: ReactNode;
}

/**
 * Custom list item with proper styling
 */
export function ListItem({ children, ...props }: ListItemProps) {
  return <li className="info-list-item" {...props}>{children}</li>;
}

interface UnorderedListProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode;
}

/**
 * Custom unordered list
 */
export function UnorderedList({ children, ...props }: UnorderedListProps) {
  return <ul className="info-list info-list-ul" {...props}>{children}</ul>;
}

interface OrderedListProps extends HTMLAttributes<HTMLOListElement> {
  children: ReactNode;
}

/**
 * Custom ordered list
 */
export function OrderedList({ children, ...props }: OrderedListProps) {
  return <ol className="info-list info-list-ol" {...props}>{children}</ol>;
}

interface ParagraphProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

/**
 * Custom paragraph
 */
export function Paragraph({ children, ...props }: ParagraphProps) {
  return <p className="info-paragraph" {...props}>{children}</p>;
}

interface StrongProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

/**
 * Custom strong/bold
 */
export function Strong({ children, ...props }: StrongProps) {
  return <strong className="info-strong" {...props}>{children}</strong>;
}

/**
 * Export all MDX components for use with next-mdx-remote
 */
export const mdxComponents = {
  h1: (props: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) => <Heading level={1} {...props} />,
  h2: (props: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) => <Heading level={2} {...props} />,
  h3: (props: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) => <Heading level={3} {...props} />,
  h4: (props: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) => <Heading level={4} {...props} />,
  h5: (props: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) => <Heading level={5} {...props} />,
  h6: (props: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) => <Heading level={6} {...props} />,
  a: CustomLink,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  p: Paragraph,
  strong: Strong,
};
