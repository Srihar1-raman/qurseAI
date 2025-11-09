import { useEffect } from 'react';

/**
 * Hook to automatically focus an input element when user types
 * Focuses the input when user presses any key (except modifiers, Tab, Escape, Enter)
 * Only focuses if no input/textarea/contenteditable is currently focused
 * 
 * @param inputRef - Ref to the input/textarea element to focus
 */
export function useAutoFocus(
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement>
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      // Only focus if:
      // - No input is currently focused
      // - No modifier keys are pressed
      // - Key is not Tab, Escape, or Enter
      if (
        !isInputFocused &&
        !e.ctrlKey && 
        !e.metaKey && 
        !e.altKey && 
        e.key !== 'Tab' &&
        e.key !== 'Escape' &&
        e.key !== 'Enter'
      ) {
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputRef]);
}

