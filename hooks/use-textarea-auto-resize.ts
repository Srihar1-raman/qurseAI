import { useState, useEffect, useRef } from 'react';
import { useMobile } from './use-mobile';

export interface UseTextareaAutoResizeOptions {
  /** Maximum height in pixels (default: 200) */
  maxHeight?: number;
  /** Minimum height in pixels (optional) */
  minHeight?: number;
  /** Threshold in pixels to determine multiline mode (default: 60) */
  multilineThreshold?: number;
  /** Callback when multiline state changes */
  onMultilineChange?: (isMultiline: boolean) => void;
}

export interface UseTextareaAutoResizeReturn {
  /** Whether the textarea is in multiline mode */
  isMultiline: boolean;
}

/**
 * Hook to automatically resize a textarea based on its content
 * Optionally tracks multiline state for UI adjustments
 * 
 * @param textareaRef - Ref to the textarea element
 * @param value - Current value of the textarea
 * @param options - Configuration options
 * @returns Object with isMultiline state
 */
export function useTextareaAutoResize(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  options: UseTextareaAutoResizeOptions = {}
): UseTextareaAutoResizeReturn {
  const {
    maxHeight = 200,
    minHeight,
    multilineThreshold = 60,
    onMultilineChange,
  } = options;
  
  const [isMultiline, setIsMultiline] = useState(false);
  const isMobile = useMobile(); // Reuse mobile hook
  
  // Store callback in ref to avoid re-subscribing on every render
  const onMultilineChangeRef = useRef(onMultilineChange);
  
  // Update callback ref when it changes
  useEffect(() => {
    onMultilineChangeRef.current = onMultilineChange;
  }, [onMultilineChange]);
  
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    
    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    
    // Calculate new height (clamped to maxHeight)
    const newHeight = Math.min(scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';
    
    // Apply minHeight if specified
    if (minHeight !== undefined && newHeight < minHeight) {
      textarea.style.height = minHeight + 'px';
    }
    
    // Determine if multiline (only if multilineThreshold is provided)
    if (multilineThreshold !== undefined) {
      const shouldBeMultiline = scrollHeight > multilineThreshold || isMobile;
      
      // Update state only if changed to avoid unnecessary re-renders
      setIsMultiline((prev) => {
        if (prev !== shouldBeMultiline) {
          onMultilineChangeRef.current?.(shouldBeMultiline);
          return shouldBeMultiline;
        }
        return prev;
      });
    }
    
    // Scroll to bottom if content exceeds max height
    if (scrollHeight > maxHeight) {
      textarea.scrollTop = textarea.scrollHeight;
    }
  }, [value, maxHeight, minHeight, multilineThreshold, isMobile, textareaRef]);
  
  return { isMultiline };
}

