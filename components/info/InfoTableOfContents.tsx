'use client';

import { RefObject, useCallback } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { cn } from '@/lib/utils';
import type { TableOfContentsItem } from '@/lib/types';

interface InfoTableOfContentsProps {
  headings: TableOfContentsItem[];
  activeId: string | null;
  onSectionClick: (id: string) => void;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  tocListRef?: RefObject<HTMLUListElement | null>;
}

/**
 * Table of contents component for info pages
 * Desktop: Sticky sidebar on the left
 * Mobile: Collapsible drawer
 */
export function InfoTableOfContents({
  headings,
  activeId,
  onSectionClick,
  isMobile,
  isOpen,
  onClose,
  tocListRef,
}: InfoTableOfContentsProps) {
  const { resolvedTheme, mounted } = useTheme();

  // Handle click with smooth scroll
  const handleClick = useCallback((id: string) => {
    onSectionClick(id);
    if (isMobile) {
      onClose();
    }
  }, [onSectionClick, isMobile, onClose]);

  if (isMobile) {
    return (
      <>
        {/* Mobile backdrop */}
        {isOpen && (
          <div
            className="info-toc-backdrop"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        {/* Mobile drawer */}
        <aside
          className={cn('info-toc-drawer', isOpen && 'open')}
          aria-label="Table of contents"
        >
          <div className="info-toc-header">
            <h3>Contents</h3>
            <button
              onClick={onClose}
              className="info-toc-close"
              aria-label="Close table of contents"
            >
              <Image
                src={getIconPath('cross', resolvedTheme, false, mounted)}
                alt="Close"
                width={16}
                height={16}
              />
            </button>
          </div>

          <nav className="info-toc-nav" aria-label="Table of contents sections">
            <TableOfContentsList
              headings={headings}
              activeId={activeId}
              onItemClick={handleClick}
              tocListRef={tocListRef}
            />
          </nav>
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="info-toc-sidebar" aria-label="Table of contents">
      <nav className="info-toc-nav" aria-label="Table of contents sections">
        <TableOfContentsList
          headings={headings}
          activeId={activeId}
          onItemClick={handleClick}
          tocListRef={tocListRef}
        />
      </nav>
    </aside>
  );
}

function TableOfContentsList({
  headings,
  activeId,
  onItemClick,
  tocListRef,
}: {
  headings: TableOfContentsItem[];
  activeId: string | null;
  onItemClick: (id: string) => void;
  tocListRef?: RefObject<HTMLUListElement | null>;
}) {
  return (
    <ul ref={tocListRef} className="info-toc-list">
      {headings.map((heading) => (
        <li
          key={heading.id}
          data-heading-id={heading.id}
          className={cn(
            'info-toc-item',
            heading.level === 3 && 'info-toc-item-nested',
            activeId === heading.id && 'active'
          )}
        >
          <button
            onClick={() => onItemClick(heading.id)}
            className="info-toc-link"
            aria-current={activeId === heading.id ? 'true' : undefined}
          >
            {heading.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
