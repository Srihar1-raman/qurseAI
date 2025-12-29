'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import Image from 'next/image';

/**
 * Back to top floating action button
 * Appears after scrolling down 500px
 * Smoothly scrolls back to top when clicked
 */
export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const { resolvedTheme, mounted } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.pageYOffset > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!mounted || !isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="info-back-to-top"
      aria-label="Back to top"
    >
      <Image
        src={getIconPath('arrow-up', resolvedTheme, false, true)}
        alt=""
        width={20}
        height={20}
      />
    </button>
  );
}
