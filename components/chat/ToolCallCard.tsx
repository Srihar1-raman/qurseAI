/**
 * Tool Call Card Component
 * Displays tool execution status (loading, complete, error)
 */

import React from 'react';

export interface ToolCallCardProps {
  toolName: string;
  status: 'loading' | 'complete' | 'error';
  resultCount?: number;
  error?: string;
}

export function ToolCallCard({
  toolName,
  status,
  resultCount,
  error,
}: ToolCallCardProps) {
  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <svg
            className="tool-call-card__spinner"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
          </svg>
        );
      case 'complete':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" strokeLinecap="round" />
            <path d="M12 16h.01" strokeLinecap="round" />
          </svg>
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'loading':
        return 'Searching...';
      case 'complete':
        return `Found ${resultCount} ${resultCount === 1 ? 'result' : 'results'}`;
      case 'error':
        return error || 'Search failed';
    }
  };

  return (
    <div className={`tool-call-card ${status}`}>
      <div className="tool-call-card__icon">{getIcon()}</div>
      <div className="tool-call-card__content">
        <span className="tool-call-card__tool-name">{toolName}</span>
        <span className="tool-call-card__status">{getStatusText()}</span>
      </div>
    </div>
  );
}
