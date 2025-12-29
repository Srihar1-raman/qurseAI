'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { sectionParser } from '@/lib/url-params/parsers';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { InfoTableOfContents } from '@/components/info/InfoTableOfContents';
import { InfoProgressIndicator } from '@/components/info/InfoProgressIndicator';
import { InfoContent } from '@/components/info/InfoContent';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { TableOfContentsItem, InfoSection } from '@/lib/types';

/**
 * Extract headings from markdown content (client-side)
 */
function extractHeadingsFromMarkdown(content: string): TableOfContentsItem[] {
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

// Lazy load HistorySidebar - only load when sidebar is opened
const HistorySidebar = dynamic(
  () => import('@/components/layout/history/HistorySidebar'),
  { ssr: false }
);

// Section configurations
const SECTIONS = [
  { id: 'about' as InfoSection, label: 'About', path: '' },
  { id: 'terms' as InfoSection, label: 'Terms', path: '/TERMS_OF_SERVICE.md' },
  { id: 'privacy' as InfoSection, label: 'Privacy', path: '/PRIVACY_POLICY.md' },
  { id: 'cookies' as InfoSection, label: 'Cookies', path: '/COOKIE_POLICY.md' },
];

function InfoPageContent() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<TableOfContentsItem[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const tocListRef = useRef<HTMLUListElement>(null);

  const router = useRouter();
  const { user } = useAuth();

  // URL state management
  const [section, setSection] = useQueryState('section', sectionParser);
  const activeSection: InfoSection = (section || 'about') as InfoSection;

  // Load headings when section changes
  useEffect(() => {
    const currentSection = SECTIONS.find((s) => s.id === activeSection);
    if (currentSection?.path) {
      // Load markdown file to extract headings
      fetch(currentSection.path)
        .then((res) => res.text())
        .then((content) => {
          const extracted = extractHeadingsFromMarkdown(content);
          setHeadings(extracted);
        })
        .catch(console.error);
    } else {
      setHeadings([]); // About section has no TOC
    }
  }, [activeSection]);

  // Intersection Observer for active section detection
  useEffect(() => {
    if (headings.length === 0) return;

    // Track which headings are visible and their ratios
    const visibleHeadings = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visibleHeadings.set(id, entry.intersectionRatio);
          } else {
            visibleHeadings.delete(id);
          }
        });

        // Find the heading with the highest intersection ratio
        let bestId: string | null = null;
        let bestRatio = 0;

        visibleHeadings.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestId) {
          setActiveId(bestId);
        }
      },
      {
        // Use a smaller threshold at the top of the viewport
        rootMargin: '-100px 0px -70% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0]
      }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  // Auto-scroll TOC to active item
  useEffect(() => {
    if (!activeId || !tocListRef.current) return;

    const activeItem = tocListRef.current.querySelector(`[data-heading-id="${activeId}"]`);
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId]);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Navigation handlers
  const handleNewChatClick = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleHistoryClick = useCallback(() => {
    setIsHistoryOpen(true);
  }, []);

  const handleTabClick = useCallback(
    (tabId: string) => {
      setSection(tabId as InfoSection);
      setActiveId(null); // Reset active heading
    },
    [setSection]
  );

  const handleSectionClick = useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (element) {
        const offset = 100; // Header height + margin
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });

        // Manually set active ID immediately on click
        setActiveId(id);
      }
    },
    []
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        user={user}
        showNewChatButton={true}
        onNewChatClick={handleNewChatClick}
        showHistoryButton={true}
        onHistoryClick={handleHistoryClick}
      />

      {/* Navigation Tabs */}
      <div className="info-tabs-container">
        <div className="info-tabs">
          {SECTIONS.map((sectionItem) => (
            <button
              key={sectionItem.id}
              onClick={() => handleTabClick(sectionItem.id)}
              className={`info-tab ${
                activeSection === sectionItem.id ? 'active' : ''
              }`}
              aria-current={
                activeSection === sectionItem.id ? 'page' : undefined
              }
            >
              {sectionItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <InfoProgressIndicator />

      {/* Main Content Area */}
      <main className="info-page-container">
        {/* Mobile TOC Toggle */}
        {isMobile && headings.length > 0 && (
          <button
            className="info-toc-toggle"
            onClick={() => setIsTocOpen(true)}
            aria-label="Open table of contents"
          >
            ☰ Contents
          </button>
        )}

        {/* Two-column layout for desktop, single for mobile */}
        <div className="info-page-layout">
          {/* MDX Content */}
          <div className="info-content-wrapper">
            <InfoContent sectionId={activeSection} />
          </div>

          {/* TOC Sidebar */}
          {!isMobile && headings.length > 0 && (
            <InfoTableOfContents
              headings={headings}
              activeId={activeId}
              onSectionClick={handleSectionClick}
              isMobile={false}
              isOpen={false}
              onClose={() => {}}
              tocListRef={tocListRef}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile TOC Drawer */}
      {isMobile && headings.length > 0 && (
        <InfoTableOfContents
          headings={headings}
          activeId={activeId}
          onSectionClick={handleSectionClick}
          isMobile={true}
          isOpen={isTocOpen}
          onClose={() => setIsTocOpen(false)}
          tocListRef={tocListRef}
        />
      )}

      {/* History Sidebar - Always mounted for smooth animations */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

export default InfoPageContent;
