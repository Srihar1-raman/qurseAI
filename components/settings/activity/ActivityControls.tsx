'use client';

import Image from 'next/image';
import type { MetricType, TokenType, TimeRange, ResolvedTheme } from '@/components/settings/activity/types';
import { getIconPath } from '@/lib/icon-utils';
import { METRIC_OPTIONS, TOKEN_TYPE_OPTIONS, TIME_RANGE_OPTIONS } from './constants';

interface ActivityControlsProps {
  metric: MetricType;
  tokenType: TokenType;
  timeRange: TimeRange;
  selectedModel: string;
  models: string[];
  resolvedTheme: ResolvedTheme;
  mounted: boolean;
  onMetricChange: (metric: MetricType) => void;
  onTokenTypeChange: (type: TokenType) => void;
  onTimeRangeChange: (range: TimeRange) => void;
  onModelChange: (model: string) => void;
}

const dropdownStyle: React.CSSProperties = {
  padding: '6px 28px 6px 14px',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text)',
  fontSize: '14px',
  fontWeight: 400,
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none' as any,
  WebkitAppearance: 'none' as any,
  MozAppearance: 'none' as any,
  fontFamily: 'inherit',
  transition: 'all 0.2s',
};

const buttonStyle = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text)',
  fontSize: '14px',
  fontWeight: 400,
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: 'inherit' as const,
};

const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement | HTMLSelectElement>) => {
  const target = e.currentTarget;
  target.style.backgroundColor = 'var(--color-bg-hover)';
  target.style.borderColor = 'var(--color-border-hover)';
};

const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement | HTMLSelectElement>) => {
  const target = e.currentTarget;
  target.style.backgroundColor = 'transparent';
  target.style.borderColor = 'var(--color-border)';
};

function SelectDropdown({
  value,
  options,
  onChange,
  minWidth,
  resolvedTheme,
  mounted,
}: {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  minWidth: string;
  resolvedTheme: ResolvedTheme;
  mounted: boolean;
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...dropdownStyle, minWidth }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            {option.label}
          </option>
        ))}
      </select>
      <Image
        src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
        alt="▼"
        width={10}
        height={10}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export function ActivityControls({
  metric,
  tokenType,
  timeRange,
  selectedModel,
  models,
  resolvedTheme,
  mounted,
  onMetricChange,
  onTokenTypeChange,
  onTimeRangeChange,
  onModelChange,
}: ActivityControlsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {/* Metric Toggle */}
      <div>
        <SelectDropdown
          value={metric}
          options={METRIC_OPTIONS}
          onChange={(value) => onMetricChange(value as MetricType)}
          minWidth="120px"
          resolvedTheme={resolvedTheme}
          mounted={mounted}
        />
      </div>

      {/* Model Filter */}
      {models.length > 1 && (
        <div>
          <SelectDropdown
            value={selectedModel}
            options={[
              { value: 'all', label: 'All Models' },
              ...models.filter((m) => m !== 'all').map((m) => ({ value: m, label: m })),
            ]}
            onChange={onModelChange}
            minWidth="140px"
            resolvedTheme={resolvedTheme}
            mounted={mounted}
          />
        </div>
      )}

      {/* Token Type Dropdown */}
      {metric === 'tokens' && (
        <div>
          <SelectDropdown
            value={tokenType}
            options={TOKEN_TYPE_OPTIONS}
            onChange={(value) => onTokenTypeChange(value as TokenType)}
            minWidth="100px"
            resolvedTheme={resolvedTheme}
            mounted={mounted}
          />
        </div>
      )}

      {/* Time Range Filter */}
      <div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {TIME_RANGE_OPTIONS.map((range) => (
            <button
              key={range.value}
              onClick={() => onTimeRangeChange(range.value as TimeRange)}
              style={buttonStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
