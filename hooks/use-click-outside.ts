import { useEffect, useRef } from 'react';

/**
 * Hook to detect clicks outside of a referenced element
 * Useful for closing dropdowns, modals, or menus when clicking outside
 * 
 * @param ref - Ref to the element to detect clicks outside of (accepts any HTMLElement subtype)
 * @param callback - Function to call when click outside is detected
 * @param enabled - Whether the hook is enabled (default: true)
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  callback: () => void,
  enabled: boolean = true
): void {
  // Store callback in ref to avoid re-subscribing on every render
  const callbackRef = useRef(callback);
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callbackRef.current();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, enabled]);
}

