'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Get system theme preference
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Resolve theme (auto → system preference)
  const resolveTheme = useCallback((themeToResolve: Theme): ResolvedTheme => {
    return themeToResolve === 'auto' ? getSystemTheme() : themeToResolve;
  }, [getSystemTheme]);

  // Update favicons based on theme
  const updateFavicons = useCallback((isDark: boolean) => {
    if (typeof window === 'undefined') return;

    // Inverted logic: dark mode shows light favicon, light mode shows dark favicon
    const faviconTheme = isDark ? 'light' : 'dark';
    
    const faviconLinks = [
      { rel: 'icon', href: `/favicon-${faviconTheme}/favicon.ico` },
      { rel: 'icon', href: `/favicon-${faviconTheme}/favicon-16x16.png`, sizes: '16x16' },
      { rel: 'icon', href: `/favicon-${faviconTheme}/favicon-32x32.png`, sizes: '32x32' },
      { rel: 'apple-touch-icon', href: `/favicon-${faviconTheme}/apple-touch-icon.png`, sizes: '180x180' },
      { rel: 'icon', href: `/favicon-${faviconTheme}/android-chrome-192x192.png`, sizes: '192x192' },
      { rel: 'icon', href: `/favicon-${faviconTheme}/android-chrome-512x512.png`, sizes: '512x512' }
    ];
    
    faviconLinks.forEach(({ rel, href, sizes }) => {
      const selector = `link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`;
      const existing = document.querySelector(selector);
      if (existing) existing.remove();
      
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (sizes) link.setAttribute('sizes', sizes);
      document.head.appendChild(link);
    });
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((resolved: ResolvedTheme, themeMode: Theme) => {
    if (typeof window === 'undefined') return;
    
    document.documentElement.setAttribute('data-theme', themeMode);
    setResolvedTheme(resolved);
    updateFavicons(resolved === 'dark');
  }, [updateFavicons]);

  // Public setTheme function
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    const resolved = resolveTheme(newTheme);
    applyTheme(resolved, newTheme);
  }, [resolveTheme, applyTheme]);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    
    if (typeof window === 'undefined') return;
    
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'auto';
    setThemeState(savedTheme);
    
    const resolved = resolveTheme(savedTheme);
    applyTheme(resolved, savedTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (savedTheme === 'auto') {
        const newResolved = e.matches ? 'dark' : 'light';
        applyTheme(newResolved, 'auto');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [resolveTheme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

