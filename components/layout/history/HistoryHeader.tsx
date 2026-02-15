'use client';

import { useTheme } from '@/lib/theme-provider';
import { Icon } from '@/components/icons';

interface HistoryHeaderProps {
  onClose: () => void;
}

export default function HistoryHeader({ onClose }: HistoryHeaderProps) {
  const { resolvedTheme, mounted } = useTheme();

  return (
    <div className="history-header">
      <div className="history-header-content">
        <div className="history-header-left">
          <Icon
            name="history"
            size={20}
            aria-label="History"
            className="history-header-icon"
          />
          <h2>Chat History</h2>
        </div>
        <div className="history-header-actions">
        <button
          onClick={onClose}
          className="history-close-btn"
          title="Close"
        >
          <Icon
            name="cross"
            size={16}
            aria-label="Close"
            className="icon"
          />
        </button>
        </div>
      </div>
    </div>
  );
}
