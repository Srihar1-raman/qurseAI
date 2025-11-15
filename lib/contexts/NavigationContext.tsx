'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface NavigationContextValue {
  isNavigating: boolean;
  targetRoute: string | null;
  startNavigation: (route: string) => void;
  completeNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const pathname = usePathname();

  const startNavigation = useCallback((route: string) => {
    setIsNavigating(true);
    setTargetRoute(route);
  }, []);

  const completeNavigation = useCallback(() => {
    setIsNavigating(false);
    setTargetRoute(null);
  }, []);

  // Normalize paths for comparison (handles query params, hash fragments, trailing slashes)
  const normalizePath = useCallback((path: string) => {
    return path
      .split('?')[0]  // Remove query params
      .split('#')[0]  // Remove hash fragments
      .replace(/\/$/, '')  // Remove trailing slash
      .toLowerCase();  // Case insensitive matching
  }, []);

  // Auto-complete navigation when pathname matches targetRoute
  useEffect(() => {
    if (!isNavigating || !targetRoute) return;

    // Normalize routes for comparison (handles edge cases)
    const currentPath = normalizePath(pathname);
    const targetPath = normalizePath(targetRoute);

    // Exact match (handles all routes including /info?section=about, /info?section=terms, etc.)
    if (currentPath === targetPath) {
      completeNavigation();
      return;
    }
  }, [pathname, isNavigating, targetRoute, completeNavigation, normalizePath]);

  // Timeout fallback: Reset navigation state if it takes too long (fail-safe)
  useEffect(() => {
    if (!isNavigating || !targetRoute) return;

    const timeoutId = setTimeout(() => {
      // Reset navigation state if it takes too long (prevents stuck skeleton)
      completeNavigation();
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeoutId);
  }, [isNavigating, targetRoute, completeNavigation]);

  return (
    <NavigationContext.Provider
      value={{
        isNavigating,
        targetRoute,
        startNavigation,
        completeNavigation,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

