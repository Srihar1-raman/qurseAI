'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';

export default function DeepSearchButton() {
  const { resolvedTheme, mounted } = useTheme();

  const handleClick = () => {
    console.log('Deep Search clicked');
    // TODO: Implement deep search functionality
  };

  return (
    <button
      onClick={handleClick}
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: '14px',
        color: 'var(--color-text)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
      className="hover:bg-bg-hover hover:border-border-hover deep-search-mobile"
    >
      <Image
        src={getIconPath('deep_search', resolvedTheme, false, mounted)}
        alt="Deep Search"
        width={14}
        height={14}
      />
      <span className="deep-search-text">Deep Search</span>
    </button>
  );
}

