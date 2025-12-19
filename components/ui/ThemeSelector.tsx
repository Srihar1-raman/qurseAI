'use client';

import Image from 'next/image';
import { getIconPath } from '@/lib/icon-utils';

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
        <Image
          src={getIconPath('theme', resolvedTheme, false, mounted)}
          alt="Theme"
          width={16}
          height={16}
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
          <Image
            src={getIconPath('theme-auto', resolvedTheme, theme === 'auto', mounted)}
            alt="Auto"
            width={14}
            height={14}
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
          <Image
            src={getIconPath('theme-light', resolvedTheme, theme === 'light', mounted)}
            alt="Light"
            width={14}
            height={14}
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
          <Image
            src={getIconPath('theme-dark', resolvedTheme, theme === 'dark', mounted)}
            alt="Dark"
            width={14}
            height={14}
          />
        </button>
      </div>
    </div>
  );
}

