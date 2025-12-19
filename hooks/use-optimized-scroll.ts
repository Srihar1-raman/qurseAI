import { useRef, useCallback } from 'react';

export function useOptimizedScroll(targetRef: React.RefObject<HTMLElement | null>) {
  const hasManuallyScrolledRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (!hasManuallyScrolledRef.current && targetRef.current) {
      const container = targetRef.current;
      // Use scrollTop for Safari compatibility, requestAnimationFrame ensures DOM is updated
      requestAnimationFrame(() => {
        if (container && !hasManuallyScrolledRef.current) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, [targetRef]);

  const markManualScroll = useCallback(() => {
    hasManuallyScrolledRef.current = true;
  }, []);

  const resetManualScroll = useCallback(() => {
    hasManuallyScrolledRef.current = false;
  }, []);

  return {
    scrollToBottom,
    markManualScroll,
    resetManualScroll,
  };
}

