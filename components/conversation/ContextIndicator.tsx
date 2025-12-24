/**
 * Context Usage Indicator Component
 * Shows semi-circle gauge when chat context usage exceeds 50%
 */

'use client';

import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ContextUsage } from './types';

interface ContextIndicatorProps {
  /** Context usage metadata */
  contextUsage: ContextUsage | null;
}

/**
 * Get tooltip message based on context usage
 */
function getTooltipMessage(usage: ContextUsage): string {
  const { percentage, reasoningRemoved, messagesDropped, warning } = usage;

  // Base percentage line
  let message = `Chat Context: ${percentage}%\n`;

  // Add details based on what was trimmed
  if (percentage >= 75) {
    if (reasoningRemoved > 0) {
      message += `\nOld reasoning removed to fit model limits`;
    }
    if (messagesDropped > 0) {
      message += `\nOldest messages removed`;
    }
  }

  // Add warning if present
  if (warning) {
    message += `\n\n${warning}`;
  }

  // Add suggestion at high usage
  if (percentage >= 90) {
    message += `\n\nConsider starting a new chat`;
  }

  return message;
}

/**
 * Get semi-circle stroke dasharray based on percentage
 * Semi-circle goes from 0 to 50%, so we map 0-100% to 0-50 range
 */
function getSemiCircleParams(percentage: number) {
  // Semi-circle circumference (radius 8, half circle)
  const radius = 8;
  const circumference = Math.PI * radius; // Half circle
  const visiblePortion = Math.min(percentage / 100, 1);

  return {
    circumference,
    visibleLength: circumference * visiblePortion,
  };
}

/**
 * Context indicator component
 * Shows semi-circle gauge when context usage >= 50%
 */
export function ContextIndicator({ contextUsage }: ContextIndicatorProps) {
  // Don't render if no usage data or below 50%
  if (!contextUsage || contextUsage.percentage < 50) {
    return null;
  }

  const { percentage } = contextUsage;
  const { circumference, visibleLength } = useMemo(
    () => getSemiCircleParams(percentage),
    [percentage]
  );

  const tooltipMessage = useMemo(
    () => getTooltipMessage(contextUsage),
    [contextUsage]
  );

  const isNearFull = percentage >= 90;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="context-indicator"
          aria-label={`Chat context usage at ${percentage} percent`}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            className="context-indicator-svg"
          >
            {/* Background semi-circle */}
            <circle
              cx="10"
              cy="16"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${Math.PI * 8} ${Math.PI * 8}`}
              strokeDashoffset={0}
              className="context-indicator-bg"
              transform="rotate(-90 10 16)"
            />

            {/* Progress semi-circle */}
            <circle
              cx="10"
              cy="16"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${Math.PI * 8} ${Math.PI * 8}`}
              strokeDashoffset={Math.PI * 8 - visibleLength}
              className={`context-indicator-progress ${isNearFull ? 'near-full' : ''}`}
              transform="rotate(-90 10 16)"
            />
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        <div className="context-indicator-tooltip whitespace-pre-line text-xs">
          {tooltipMessage}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
