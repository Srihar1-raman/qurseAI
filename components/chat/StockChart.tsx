'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockChartProps {
  symbol: string;
  data: HistoricalDataPoint[];
  priceChange: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function StockChart({ symbol, data, priceChange }: StockChartProps) {
  const isPositive = priceChange >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const gradientColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className="stock-chart">
      <div className="stock-chart-header">
        <div className="stock-chart-title">
          <span className="stock-chart-symbol">{symbol}</span>
          <span className={`stock-chart-label ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
        <span className="stock-chart-period">Last 90 Days</span>
      </div>
      
      <div className="stock-chart-container">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="var(--color-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis 
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              stroke="var(--color-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              labelFormatter={(label) => formatTooltipDate(label as string)}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={strokeColor}
              strokeWidth={2.5}
              fill={`url(#gradient-${symbol})`}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="stock-chart-stats">
        <div className="stock-chart-stat">
          <span className="stock-chart-stat-label">Open</span>
          <span className="stock-chart-stat-value">${data[0]?.open.toFixed(2)}</span>
        </div>
        <div className="stock-chart-stat">
          <span className="stock-chart-stat-label">Close</span>
          <span className="stock-chart-stat-value">${data[data.length - 1]?.close.toFixed(2)}</span>
        </div>
        <div className="stock-chart-stat">
          <span className="stock-chart-stat-label">High</span>
          <span className="stock-chart-stat-value">${Math.max(...data.map(d => d.high)).toFixed(2)}</span>
        </div>
        <div className="stock-chart-stat">
          <span className="stock-chart-stat-label">Low</span>
          <span className="stock-chart-stat-value">${Math.min(...data.map(d => d.low)).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
