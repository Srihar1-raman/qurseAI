'use client';

import { useTheme } from '@/lib/theme-provider';
import { useActivityData } from '@/hooks/useActivityData';
import { useActivityFilters } from '@/hooks/useActivityFilters';
import { ActivityControls } from './activity/ActivityControls';
import { ActivityChart } from './activity/ActivityChart';
import { ActivityStats } from './activity/ActivityStats';
import type { ActivityGraphProps } from './activity/types';

export default function ActivityGraph({ variant = 'user' }: ActivityGraphProps) {
  const { resolvedTheme, mounted } = useTheme();

  // Fetch activity data (user or global based on variant)
  const { data, models, isLoading, error } = useActivityData(
    variant === 'global' ? { isGlobal: true } : undefined
  );

  // Manage filter state and data transformations
  const {
    metric,
    tokenType,
    selectedModel,
    timeRange,
    setMetric,
    setTokenType,
    setSelectedModel,
    setTimeRange,
    filteredData,
    dataKey,
    average,
  } = useActivityFilters({ data });

  // Dynamic labels based on variant
  const label = variant === 'global' ? 'Platform Activity' : 'Account Activity';
  const emptyMessage = variant === 'global'
    ? 'No activity data available yet.'
    : 'No activity data available yet. Start chatting to see your activity graph!';

  // Don't render until mounted (prevents SSR/hydration issues)
  if (!mounted) {
    return (
      <div className="settings-group">
        <label className="settings-label">{label}</label>
        <div className="account-info">
          <div className="account-details">
            <p style={{ color: 'var(--color-text-muted)' }}>Loading activity data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="settings-group">
        <label className="settings-label">{label}</label>
        <div className="account-info">
          <div className="account-details">
            <p style={{ color: 'var(--color-text-muted)' }}>Loading activity data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-group">
        <label className="settings-label">{label}</label>
        <div className="account-info">
          <div className="account-details">
            <p style={{ color: 'var(--color-error)' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="settings-group">
        <label className="settings-label">{label}</label>
        <div className="account-info">
          <div className="account-details">
            <p style={{ color: 'var(--color-text-muted)' }}>{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-group">
      {/* For global variant on About page, use h3 heading. For user variant in settings, use label */}
      {variant === 'global' ? (
        <h3 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--color-text)',
          marginTop: '0',
          marginBottom: '12px',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.5px'
        }}>
          {label}
        </h3>
      ) : (
        <label className="settings-label">{label}</label>
      )}

      {/* Description for global variant */}
      {variant === 'global' && (
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          Real-time usage across all Qurse users worldwide
        </p>
      )}

      {/* Controls */}
      <ActivityControls
        metric={metric}
        tokenType={tokenType}
        timeRange={timeRange}
        selectedModel={selectedModel}
        models={models}
        resolvedTheme={resolvedTheme}
        mounted={mounted}
        onMetricChange={setMetric}
        onTokenTypeChange={setTokenType}
        onTimeRangeChange={setTimeRange}
        onModelChange={setSelectedModel}
      />

      {/* Chart */}
      <div style={{ marginTop: '16px' }}>
        <ActivityChart data={filteredData} dataKey={dataKey} />

        {/* Stats */}
        <ActivityStats data={filteredData} dataKey={dataKey} average={average} />
      </div>
    </div>
  );
}
