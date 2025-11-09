import { useEffect, useRef } from 'react';

export interface UseInfiniteScrollOptions {
  /** Distance in pixels from edge to trigger load (default: 200) */
  threshold?: number;
  /** Direction to detect scroll (default: 'bottom') */
  direction?: 'bottom' | 'top';
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to detect when user scrolls near the edge of a container
 * Triggers a callback to load more content (infinite scroll)
 * 
 * @param containerRef - Ref to the scrollable container element
 * @param onLoadMore - Function to call when scroll threshold is reached
 * @param options - Configuration options
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
): void {
  const {
    threshold = 200,
    direction = 'bottom',
    enabled = true,
  } = options;
  
  // Store callback in ref to avoid re-subscribing on every render
  const onLoadMoreRef = useRef(onLoadMore);
  
  // Update callback ref when it changes
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);
  
  useEffect(() => {
    if (!enabled) return;
    
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      if (direction === 'bottom') {
        // Load more when within threshold of bottom
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceFromBottom < threshold) {
          onLoadMoreRef.current();
        }
      } else {
        // Load more when within threshold of top
        if (scrollTop < threshold) {
          onLoadMoreRef.current();
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, threshold, direction, enabled]);
}

