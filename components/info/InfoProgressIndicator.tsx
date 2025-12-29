'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface InfoProgressIndicatorProps {
  className?: string;
}

/**
 * Reading progress indicator for info pages
 * Displays a subtle progress bar at the top of the page
 * Updates smoothly as user scrolls through content
 */
export function InfoProgressIndicator({
  className
}: InfoProgressIndicatorProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollableHeight = documentHeight - windowHeight;
      const scrolled = scrollableHeight > 0
        ? (scrollTop / scrollableHeight) * 100
        : 0;

      setProgress(Math.min(100, Math.max(0, scrolled)));
    };

    // Passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={cn('info-progress-bar', className)} aria-hidden="true">
      <div
        className="info-progress-fill"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
