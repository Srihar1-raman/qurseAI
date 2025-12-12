import { useRef, useCallback } from 'react';

export function useOptimizedScroll(
  targetRef: React.RefObject<HTMLElement | null>,
  scrollContainerRef?: React.RefObject<HTMLElement | null>
) {
  const hasManuallyScrolledRef = useRef(false);

  // Simple auto scroll
  // CRITICAL: Scrolls to bottom of the scroll container
  // If scrollContainerRef is provided, scrolls that container; otherwise uses scrollIntoView on target
  // This ensures messages are visible and not hidden under fixed headers
  const scrollToBottom = useCallback(() => {
    if (hasManuallyScrolledRef.current) return;
    
    // If scroll container is provided, scroll it directly (more reliable for fixed headers)
    if (scrollContainerRef?.current) {
      // Use scrollTop assignment for immediate scroll (more reliable than scrollTo)
      // This ensures the scroll happens even if the container height hasn't updated yet
      const container = scrollContainerRef.current;
      const scrollToValue = container.scrollHeight;
      
      // Try immediate scroll first (for instant feedback)
      container.scrollTop = scrollToValue;
      
      // Then use smooth scroll for better UX (if container height changed)
      container.scrollTo({
        top: scrollToValue,
        behavior: 'smooth',
      });
      return;
    }
    
    // Fallback: Use scrollIntoView if no container provided
    if (targetRef.current) {
      targetRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    }
  }, [targetRef, scrollContainerRef]);

  // Mark as manually scrolled
  const markManualScroll = useCallback(() => {
    hasManuallyScrolledRef.current = true;
  }, []);

  // Reset for new message
  const resetManualScroll = useCallback(() => {
    hasManuallyScrolledRef.current = false;
  }, []);

  return {
    scrollToBottom,
    markManualScroll,
    resetManualScroll,
  };
}

