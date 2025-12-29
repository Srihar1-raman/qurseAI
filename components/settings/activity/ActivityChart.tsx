'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { ActivityData } from './types';
import { QURSE_GREEN, GRADIENT_ID } from './constants';

interface ActivityChartProps {
  data: ActivityData[];
  dataKey: string;
}

// Custom tooltip to show only the relevant metric
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Get the value from the first (and should be only) payload item
  const value = payload[0].value ?? 0;

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        color: 'var(--color-text)',
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 500 }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

export function ActivityChart({ data, dataKey }: ActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={QURSE_GREEN} stopOpacity={0.3} />
            <stop offset="95%" stopColor={QURSE_GREEN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="var(--color-text-muted)"
          strokeOpacity={0.06}
          vertical={true}
          horizontal={true}
        />
        <XAxis
          dataKey="date"
          stroke="var(--color-text-muted)"
          style={{ fontSize: '11px' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--color-text-muted)"
          style={{ fontSize: '11px' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={QURSE_GREEN}
          strokeWidth={2}
          fill={`url(#${GRADIENT_ID})`}
          dot={false}
          activeDot={{ r: 5, fill: QURSE_GREEN, stroke: 'var(--color-bg-secondary)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
