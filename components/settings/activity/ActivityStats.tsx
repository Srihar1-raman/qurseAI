'use client';

import type { ActivityData } from './types';

interface ActivityStatsProps {
  data: ActivityData[];
  dataKey: string;
  average: number;
}

export function ActivityStats({ data, dataKey, average }: ActivityStatsProps) {
  // Handle missing values (when model doesn't have data for certain days)
  // Use 0 as fallback for undefined values
  const getValue = (d: ActivityData): number => {
    const value = d[dataKey as keyof typeof d] as number | undefined;
    return value ?? 0;
  };

  const total = data.reduce((sum, d) => sum + getValue(d), 0);
  const peak = Math.max(...data.map((d) => getValue(d)));
  const days = data.length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '24px',
        marginTop: '24px',
        textAlign: 'center',
      }}
    >
      <div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '6px' }}>
          Total
        </div>
        <div style={{ color: 'var(--color-text)', fontSize: '24px', fontWeight: 600 }}>
          {total.toLocaleString()}
        </div>
      </div>
      <div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '6px' }}>
          Average
        </div>
        <div style={{ color: 'var(--color-text)', fontSize: '24px', fontWeight: 600 }}>
          {Math.round(average).toLocaleString()}
        </div>
      </div>
      <div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '6px' }}>
          Peak
        </div>
        <div style={{ color: 'var(--color-text)', fontSize: '24px', fontWeight: 600 }}>
          {peak.toLocaleString()}
        </div>
      </div>
      <div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '6px' }}>
          Days
        </div>
        <div style={{ color: 'var(--color-text)', fontSize: '24px', fontWeight: 600 }}>{days}</div>
      </div>
    </div>
  );
}
