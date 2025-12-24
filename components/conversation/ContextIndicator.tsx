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
 * Get circle fill parameters based on context percentage
 * Background: full circle outline (dimmed)
 * Progress: fills matching the context percentage
 * - 50% context → 50% fill (semi-circle)
 * - 75% context → 75% fill (3/4 circle)
 * - 100% context → 100% fill (full circle)
 */
function getCircleParams(percentage: number) {
  const radius = 8;
  const circumference = 2 * Math.PI * radius; // Full circle (~50.27)

  // Direct mapping: context percentage = fill percentage
  const fillPercentage = Math.min(percentage / 100, 1);
  const visibleLength = circumference * fillPercentage;

  return {
    circumference,
    visibleLength,
  };
}

/**
 * Context indicator component
 * Shows circular gauge when context usage >= 50%
 */
export function ContextIndicator({ contextUsage }: ContextIndicatorProps) {
  // Don't render if no usage data or below 50%
  if (!contextUsage || contextUsage.percentage < 50) {
    return null;
  }

  const { percentage } = contextUsage;
  const { circumference, visibleLength } = useMemo(
    () => getCircleParams(percentage),
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
            {/* Background full circle (dimmed outline) */}
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="context-indicator-bg"
            />

            {/* Progress fill (fills from top, clockwise) */}
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${visibleLength} ${circumference}`}
              strokeDashoffset={0}
              className={`context-indicator-progress ${isNearFull ? 'near-full' : ''}`}
              transform="rotate(-90 10 10)"
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
