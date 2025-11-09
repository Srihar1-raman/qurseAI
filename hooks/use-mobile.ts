import { useState, useEffect } from 'react';

/**
 * Hook to detect if the viewport is mobile-sized
 * @param breakpoint - The breakpoint in pixels (default: 768)
 * @returns boolean indicating if viewport is mobile-sized
 */
export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };
    
    // Check immediately on mount
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpoint]);
  
  return isMobile;
}

