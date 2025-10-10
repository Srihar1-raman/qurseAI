'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';

interface HistorySearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  conversationCount: number;
  onClearHistory: () => void;
}

export default function HistorySearch({ 
  searchQuery, 
  onSearchChange, 
  conversationCount, 
  onClearHistory 
}: HistorySearchProps) {
  const { resolvedTheme, mounted } = useTheme();

  return (
    <div className="history-search-container">
      <div className="history-search-input-wrapper">
        <Image 
          src={getIconPath("send", resolvedTheme, false, mounted)} 
          alt="Search" 
          width={14} 
          height={14} 
          className="history-search-icon" 
        />
        <input
          type="text"
          placeholder={`Search from ${conversationCount} conversations...`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="history-search-input"
        />
      </div>
      <button 
        onClick={onClearHistory}
        className="clear-history-btn-search"
        disabled={conversationCount === 0}
        title="Clear all conversations"
      >
        <Image 
          src="/icon_light/clear_history.svg" 
          alt="Clear" 
          width={16} 
          height={16} 
          className="icon-sm" 
        />
        Clear
      </button>
    </div>
  );
}
