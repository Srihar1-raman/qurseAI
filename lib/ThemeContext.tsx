'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  getIconPath: (iconName: string) => string;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Get system theme preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  // Resolve the actual theme to apply
  const resolveTheme = useCallback((themeToResolve: Theme): 'light' | 'dark' => {
    if (themeToResolve === 'auto') {
      return getSystemTheme();
    }
    return themeToResolve;
  }, [getSystemTheme]);

  // Update favicons based on theme
  const updateFavicons = useCallback((isDarkTheme: boolean) => {
    if (typeof window !== 'undefined') {
      // Invert the logic: light mode shows dark favicon, dark mode shows light favicon
      const theme = isDarkTheme ? 'light' : 'dark';
      
      // Update all favicon types
      const faviconTypes = [
        { rel: 'icon', href: `/favicon-${theme}/favicon.ico` },
        { rel: 'icon', href: `/favicon-${theme}/favicon-16x16.png`, sizes: '16x16' },
        { rel: 'icon', href: `/favicon-${theme}/favicon-32x32.png`, sizes: '32x32' },
        { rel: 'apple-touch-icon', href: `/favicon-${theme}/apple-touch-icon.png`, sizes: '180x180' },
        { rel: 'icon', href: `/favicon-${theme}/android-chrome-192x192.png`, sizes: '192x192' },
        { rel: 'icon', href: `/favicon-${theme}/android-chrome-512x512.png`, sizes: '512x512' }
      ];
      
      faviconTypes.forEach(({ rel, href, sizes }) => {
        // Remove existing link if it exists
        const existingLink = document.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`) as HTMLLinkElement;
        if (existingLink) {
          existingLink.remove();
        }
        
        // Create new link
        const newLink = document.createElement('link');
        newLink.rel = rel;
        newLink.href = href;
        if (sizes) newLink.sizes = sizes;
        document.head.appendChild(newLink);
      });
    }
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((appliedTheme: 'light' | 'dark', themeMode: Theme) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', themeMode);
      setResolvedTheme(appliedTheme);
      
      // Update favicons based on theme
      updateFavicons(appliedTheme === 'dark');
    }
  }, [updateFavicons]);

  // Set theme with persistence
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    const resolved = resolveTheme(newTheme);
    applyTheme(resolved, newTheme);
    
    // Force favicon update immediately
    updateFavicons(resolved === 'dark');
  };

  // Get icon path based on resolved theme
  const getIconPath = (iconName: string): string => {
    const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
    return `/${iconFolder}/${iconName}.svg`;
  };

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      // Get saved theme or default to auto
      const savedTheme = localStorage.getItem('theme') as Theme;
      const initialTheme = savedTheme || 'auto';
      
      setThemeState(initialTheme);
      const resolved = resolveTheme(initialTheme);
      applyTheme(resolved, initialTheme);

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (theme === 'auto') {
          const newResolvedTheme = e.matches ? 'dark' : 'light';
          applyTheme(newResolvedTheme, 'auto');
        }
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [theme, resolveTheme, applyTheme]);

  // Update favicons whenever resolved theme changes
  useEffect(() => {
    updateFavicons(resolvedTheme === 'dark');
  }, [resolvedTheme, updateFavicons]);


  const value: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    getIconPath,
    mounted,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

