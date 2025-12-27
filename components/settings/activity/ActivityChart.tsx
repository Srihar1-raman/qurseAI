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
        <Tooltip
          contentStyle={{
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            color: 'var(--color-text)',
            padding: '6px 14px',
          }}
          labelStyle={{ color: 'var(--color-text-muted)' }}
          formatter={(value: number | undefined) => (value ?? 0).toLocaleString()}
        />
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
