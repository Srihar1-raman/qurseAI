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
  
  // Track previous multiline state to detect changes (replaces fragile padding detection)
  const prevIsMultilineRef = useRef(false);
  
  // Store callback in ref to avoid re-subscribing on every render
  const onMultilineChangeRef = useRef(onMultilineChange);
  
  // Update callback ref when it changes
  useEffect(() => {
    onMultilineChangeRef.current = onMultilineChange;
  }, [onMultilineChange]);
  
  // Initialize prevIsMultilineRef with current state on mount
  useEffect(() => {
    prevIsMultilineRef.current = isMultiline;
  }, []);
  
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    
    // Set minHeight as inline style (like MainInput does)
    if (minHeight !== undefined) {
      textarea.style.minHeight = minHeight + 'px';
    }
    
    // If value is empty, just set height to auto and let CSS min-height handle it
    // This prevents timing issues where scrollHeight is read before DOM updates
    if (!value || value.trim() === '') {
      textarea.style.height = 'auto';
      return; // Early return - let CSS handle empty state
    }
    
    // For non-empty values, wait for DOM to update before reading scrollHeight
    // Use double requestAnimationFrame to ensure DOM has fully updated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        
        // Double-check value is still not empty (in case it changed during RAF)
        if (!textareaRef.current.value || textareaRef.current.value.trim() === '') {
          textareaRef.current.style.height = 'auto';
          return;
        }
        
        // Reset height to auto to get accurate scrollHeight
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        
        // Determine if multiline (only if multilineThreshold is provided)
        let shouldBeMultiline = false;
        let willMultilineStateChange = false;
        
        if (multilineThreshold !== undefined) {
          shouldBeMultiline = scrollHeight >= multilineThreshold || isMobile;
          
          // Check if multiline state will change using ref (replaces fragile padding detection)
          willMultilineStateChange = prevIsMultilineRef.current !== shouldBeMultiline;
          
          // Update state - this will trigger React re-render with new padding
          setIsMultiline((prev) => {
            if (prev !== shouldBeMultiline) {
              onMultilineChangeRef.current?.(shouldBeMultiline);
              return shouldBeMultiline;
            }
            return prev;
          });
        }
        
        // If multiline state will change, skip height calculation here
        // The isMultiline useEffect will recalculate with correct padding after React applies it
        // This prevents setting height with wrong padding, which causes visual glitches
        if (willMultilineStateChange) {
          return; // Skip height calculation - let isMultiline useEffect handle it
        }
        
        // Calculate height with CURRENT padding (multiline state didn't change)
        const newHeight = Math.min(scrollHeight, maxHeight);
        const finalHeight = minHeight !== undefined 
          ? Math.max(newHeight, minHeight)
          : newHeight;
        
        textareaRef.current.style.height = finalHeight + 'px';
        
        // Scroll to bottom if content exceeds max height
        if (scrollHeight > maxHeight) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      });
    });
  }, [value, maxHeight, minHeight, multilineThreshold, isMobile, textareaRef]);
  
  // Recalculate height when isMultiline changes (padding change affects scrollHeight)
  // Recalculate immediately since padding changes are now instant (no transition)
  // Only recalculate when isMultiline actually changes, not on every render
  useEffect(() => {
    if (!textareaRef.current) return;
    
    // If value is empty, reset height and multiline state
    if (!value || value.trim() === '') {
      textareaRef.current.style.height = 'auto';
      // Reset multiline state if it was true
      if (isMultiline) {
        setIsMultiline(false);
        prevIsMultilineRef.current = false;
      }
      return;
    }
    
    // Only recalculate if state actually changed (prevents unnecessary recalculations)
    if (prevIsMultilineRef.current === isMultiline) return;
    
    // Use requestAnimationFrame to ensure DOM has updated with new padding
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        
        // Reset height to auto to get accurate scrollHeight with new padding
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        
        // Re-check if should be multiline (in case content changed)
        // This ensures we properly handle shrinking back to single line
        if (multilineThreshold !== undefined) {
          const shouldBeMultiline = scrollHeight >= multilineThreshold || isMobile;
          
          // If multiline state doesn't match what it should be, update it
          if (shouldBeMultiline !== isMultiline) {
            setIsMultiline(shouldBeMultiline);
            prevIsMultilineRef.current = shouldBeMultiline;
            // Don't set height here - let the state change trigger another recalculation
            return;
          }
        }
        
        // Calculate new height (clamped to maxHeight)
        const newHeight = Math.min(scrollHeight, maxHeight);
        
        // Enforce minHeight - always use the larger value
        const finalHeight = minHeight !== undefined 
          ? Math.max(newHeight, minHeight)
          : newHeight;
        
        textareaRef.current.style.height = finalHeight + 'px';
        
        // Scroll to bottom if content exceeds max height
        if (scrollHeight > maxHeight) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
        
        // Update ref to track the new state
        prevIsMultilineRef.current = isMultiline;
      });
    });
  }, [isMultiline, maxHeight, minHeight, value, multilineThreshold, isMobile, textareaRef]);
  
  return { isMultiline };
}

