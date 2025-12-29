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
import { AboutHero } from '@/components/info/AboutHero';
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

    // Track all heading positions for accurate detection
    const headingElements = headings
      .map((heading) => ({
        id: heading.id,
        element: document.getElementById(heading.id),
      }))
      .filter((h) => h.element !== null);

    const observer = new IntersectionObserver(
      () => {
        // Find the heading closest to top of viewport (with offset)
        let closestHeading: string | null = null;
        let closestDistance = Infinity;

        headingElements.forEach(({ id, element }) => {
          if (!element) return;

          const rect = element.getBoundingClientRect();
          const distanceFromTop = Math.abs(rect.top - 120); // 120px offset from top

          // Check if heading is in the upper portion of viewport
          if (rect.top <= 200 && rect.top >= -300) {
            if (distanceFromTop < closestDistance) {
              closestDistance = distanceFromTop;
              closestHeading = id;
            }
          }
        });

        if (closestHeading) {
          setActiveId(closestHeading);
        }
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
      }
    );

    headingElements.forEach(({ element }) => {
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

      {/* Progress Bar - hide for About page */}
      {activeSection !== 'about' && <InfoProgressIndicator />}

      {/* About Hero - rendered outside container for full width */}
      {activeSection === 'about' && <AboutHero />}

      {/* Main Content Area */}
      <main className="info-page-container">
        {/* Mobile TOC Toggle - hide for About page */}
        {isMobile && headings.length > 0 && activeSection !== 'about' && (
          <button
            className="info-toc-toggle-container"
            onClick={() => setIsTocOpen(true)}
            aria-label="Open table of contents"
          >
            <span>Contents</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Two-column layout for desktop, single for mobile - full width for About */}
        <div className={`info-page-layout ${activeSection === 'about' ? 'info-about-layout' : ''}`}>
          {/* MDX Content */}
          <div className="info-content-wrapper">
            <InfoContent sectionId={activeSection} />
          </div>

          {/* TOC Sidebar - hide for About page */}
          {!isMobile && headings.length > 0 && activeSection !== 'about' && (
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

      {/* Mobile TOC Drawer - hide for About page */}
      {isMobile && headings.length > 0 && activeSection !== 'about' && (
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
