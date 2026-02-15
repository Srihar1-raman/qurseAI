'use client';

import { Icon } from '@/components/icons';

interface ThemeSelectorProps {
  theme: 'light' | 'dark' | 'auto';
  onThemeChange: (theme: 'light' | 'dark' | 'auto') => void;
  resolvedTheme: 'light' | 'dark';
  mounted: boolean;
}

export function ThemeSelector({
  theme,
  onThemeChange,
  resolvedTheme,
  mounted,
}: ThemeSelectorProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Icon
          name="theme"
          size={16}
          aria-label="Theme"
        />
        <span className="text-sm font-medium">Theme</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onThemeChange('auto')}
          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
            theme === 'auto'
              ? 'bg-primary text-white'
              : 'bg-bg-secondary hover:bg-bg-hover'
          }`}
          aria-label="Auto theme"
        >
          <Icon
            name="theme-auto"
            size={14}
            aria-label="Auto"
          />
        </button>
        <button
          onClick={() => onThemeChange('light')}
          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
            theme === 'light'
              ? 'bg-primary text-white'
              : 'bg-bg-secondary hover:bg-bg-hover'
          }`}
          aria-label="Light theme"
        >
          <Icon
            name="theme-light"
            size={14}
            aria-label="Light"
          />
        </button>
        <button
          onClick={() => onThemeChange('dark')}
          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
            theme === 'dark'
              ? 'bg-primary text-white'
              : 'bg-bg-secondary hover:bg-bg-hover'
          }`}
          aria-label="Dark theme"
        >
          <Icon
            name="theme-dark"
            size={14}
            aria-label="Dark"
          />
        </button>
      </div>
    </div>
  );
}
