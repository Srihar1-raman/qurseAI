'use client';

import { useTheme } from '@/lib/theme-provider';
import { useActivityData } from '@/hooks/useActivityData';
import { useActivityFilters } from '@/hooks/useActivityFilters';
import { ActivityControls } from './activity/ActivityControls';
import { ActivityChart } from './activity/ActivityChart';
import { ActivityStats } from './activity/ActivityStats';
import type { ActivityGraphProps } from './activity/types';

export default function ActivityGraph({ userId }: ActivityGraphProps) {
  const { resolvedTheme, mounted } = useTheme();

  // Fetch activity data
  const { data, models, isLoading, error } = useActivityData(userId);

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

  // Don't render until mounted (prevents SSR/hydration issues)
  if (!mounted) {
    return (
      <div className="settings-group">
        <label className="settings-label">Account Activity</label>
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
        <label className="settings-label">Account Activity</label>
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
        <label className="settings-label">Account Activity</label>
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
        <label className="settings-label">Account Activity</label>
        <div className="account-info">
          <div className="account-details">
            <p style={{ color: 'var(--color-text-muted)' }}>
              No activity data available yet. Start chatting to see your activity graph!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-group">
      <label className="settings-label">Account Activity</label>

      {/* Controls + Chart + Stats */}
      <div style={{ padding: '0 16px 16px 16px' }}>
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

        <div style={{ marginTop: '16px' }}>
          <ActivityChart data={filteredData} dataKey={dataKey} />

          {/* Stats */}
          <ActivityStats data={filteredData} dataKey={dataKey} average={average} />
        </div>
      </div>
    </div>
  );
}
