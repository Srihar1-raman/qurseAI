'use client';

import { Icon } from '@/components/icons';

export default function DeepSearchButton() {
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
      <Icon
        name="deep_search"
        size={16}
        aria-label="Deep Search"
      />
      <span className="deep-search-text">Deep Search</span>
    </button>
  );
}
