'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * RoutePrefetcher - Prefetches routes on app load for instant navigation
 * Prefetches Settings and Info routes so they're ready when user clicks
 */
export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch routes on app load (not just on hover)
    // This ensures routes are ready before user clicks
    router.prefetch('/settings');
    router.prefetch('/info?section=about');
    router.prefetch('/info?section=terms');
    router.prefetch('/info?section=privacy');
  }, [router]);

  // This component doesn't render anything
  return null;
}

