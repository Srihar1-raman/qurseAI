import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigation } from '@/lib/contexts/NavigationContext';

/**
 * Hook for optimistic navigation
 * Shows loading skeleton immediately before Next.js route loading completes
 */
export function useOptimisticNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  const navigateOptimistically = useCallback((route: string) => {
    // Normalize routes for comparison (strip query params)
    const currentPath = pathname.split('?')[0];
    const targetPath = route.split('?')[0];

    // Skip skeleton if already on target route (just update query params if needed)
    if (currentPath === targetPath) {
      router.push(route);
      return;
    }

    // Show skeleton immediately (optimistic update)
    startNavigation(route);
    // Start Next.js navigation (skeleton already showing)
    router.push(route);
  }, [pathname, router, startNavigation]);

  return { navigateOptimistically };
}

