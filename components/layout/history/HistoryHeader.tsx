'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';

interface HistoryHeaderProps {
  onClose: () => void;
}

export default function HistoryHeader({ onClose }: HistoryHeaderProps) {
  const { resolvedTheme, mounted } = useTheme();

  return (
    <div className="history-header">
      <div className="history-header-content">
        <div className="history-header-left">
          <Image 
            src={getIconPath("history", resolvedTheme, false, mounted)} 
            alt="History" 
            width={20} 
            height={20} 
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
          <Image 
            src={getIconPath("cross", resolvedTheme, false, mounted)} 
            alt="Close" 
            width={16} 
            height={16} 
            className="icon" 
          />
        </button>
        </div>
      </div>
    </div>
  );
}
