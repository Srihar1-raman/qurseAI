'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import MarkdownRenderer from '@/components/markdown';
import { createScopedLogger } from '@/lib/utils/logger';
import '@/styles/components/reasoning.css';

const logger = createScopedLogger('components/chat/ReasoningBlock');

interface ReasoningBlockProps {
  reasoning: string;
  isStreaming: boolean;
}

export function ReasoningBlock({ reasoning, isStreaming }: ReasoningBlockProps) {
  const { resolvedTheme, mounted } = useTheme();

  // State management
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsedByUser, setIsCollapsedByUser] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  // Track start time when reasoning first appears
  useEffect(() => {
    if (reasoning && reasoning.length > 0 && startTime === null) {
      setStartTime(Date.now());
      logger.debug('Reasoning started');
    }
  }, [reasoning, startTime]);

  // Reset duration when streaming starts again (edge case: re-stream)
  useEffect(() => {
    if (isStreaming) {
      setDuration(null);
    }
  }, [isStreaming]);

  // Calculate duration when streaming completes
  useEffect(() => {
    if (startTime && !isStreaming && duration === null) {
      const elapsed = Date.now() - startTime;
      const seconds = Math.max(1, Math.round(elapsed / 1000));
      setDuration(`~${seconds}s`);
      logger.debug('Reasoning completed', { duration: seconds });
    }
  }, [isStreaming, startTime, duration]);

  // Auto-collapse when streaming completes (unless user manually expanded)
  useEffect(() => {
    if (!isStreaming && duration !== null && !isExpanded && !isCollapsedByUser) {
      // Auto-collapse to collapsed complete state
      setIsExpanded(false);
    }
  }, [isStreaming, duration, isExpanded, isCollapsedByUser]);

  // Toggle expand/collapse
  const toggleExpanded = useCallback(() => {
    if (isStreaming) {
      // During streaming, toggle collapsed state
      setIsCollapsedByUser(prev => !prev);
    } else {
      // After complete, toggle expanded state
      setIsExpanded(prev => !prev);
    }
  }, [isStreaming]);

  // Don't render if no reasoning
  if (!reasoning || reasoning.trim().length === 0) {
    return null;
  }

  // Determine current state
  const showStreamingBox = isStreaming && !isCollapsedByUser;
  const showCollapsed = isCollapsedByUser || (!isStreaming && !isExpanded);
  const showExpanded = !isStreaming && isExpanded;

  // Header text derived from state (memoized for performance)
  const headerText = useMemo(() => {
    if (isStreaming) return 'Thinking...';
    if (isExpanded) return 'Thought process';
    return `Thought for ${duration ?? '~1s'}`;
  }, [isStreaming, isExpanded, duration]);

  return (
    <div className="reasoning-block">
      {showStreamingBox && (
        // Streaming box with 3-line preview
        <>
          <div
            className="reasoning-header"
            onClick={toggleExpanded}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpanded();
              }
            }}
          >
            <span className="reasoning-header-text streaming">
              {headerText}
            </span>
          </div>

          <div className="reasoning-content streaming">
            <div className="reasoning-preview" key={reasoning.length}>
              <MarkdownRenderer content={reasoning} isUserMessage={false} isStreaming={true} />
            </div>
          </div>
        </>
      )}

      {showCollapsed && (
        // Collapsed state - header only, no box
        <div
          className="reasoning-collapsed"
          onClick={toggleExpanded}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleExpanded();
            }
          }}
        >
          <span className="reasoning-collapsed-text streaming">
            {headerText}
          </span>
          {!isStreaming && (
            <Image
              src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
              alt=""
              width={16}
              height={16}
              className="reasoning-chevron"
            />
          )}
        </div>
      )}

      {showExpanded && (
        // Expanded complete state
        <>
          <div
            className="reasoning-header"
            onClick={toggleExpanded}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpanded();
              }
            }}
          >
            <span className="reasoning-header-text">
              {headerText}
            </span>
            <Image
              src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
              alt=""
              width={16}
              height={16}
              className="reasoning-chevron expanded"
            />
          </div>

          <div className="reasoning-content">
            <div className="reasoning-full">
              <MarkdownRenderer content={reasoning} isUserMessage={false} isStreaming={false} />
            </div>
            <button
              className="reasoning-show-less"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded();
              }}
            >
              Show less
            </button>
          </div>
        </>
      )}
    </div>
  );
}
