'use client';

import { useTheme } from '@/lib/theme-provider';
import { Icon } from '@/components/icons';

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
        <Icon
          name="send"
          size={14}
          aria-label="Search"
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
        <Icon
          name="clear_history"
          size={16}
          aria-label="Clear"
          className="icon-sm"
        />
        Clear
      </button>
    </div>
  );
}
