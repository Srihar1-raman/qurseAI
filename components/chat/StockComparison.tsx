'use client';

import React from 'react';
import { TrendingUp, TrendingDown, GitCompareArrows } from 'lucide-react';

interface ComparisonStock {
  symbol: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

interface StockComparisonProps {
  comparisons: ComparisonStock[];
}

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

export function StockComparison({ comparisons }: StockComparisonProps) {
  if (!comparisons || comparisons.length < 2) return null;

  const maxPrice = Math.max(...comparisons.map(c => c.price));
  const minPrice = Math.min(...comparisons.map(c => c.price));
  const priceRange = maxPrice - minPrice;

  return (
    <div className="stock-comparison-card">
      <div className="stock-comparison-header">
        <GitCompareArrows className="stock-comparison-icon" />
        <span className="stock-comparison-title">Stock Comparison</span>
      </div>

      <div className="stock-comparison-table">
        <div className="stock-comparison-row header">
          <div className="stock-comparison-cell">Symbol</div>
          <div className="stock-comparison-cell">Price</div>
          <div className="stock-comparison-cell">Change</div>
          <div className="stock-comparison-cell">Volume</div>
          <div className="stock-comparison-cell">Day Range</div>
        </div>
        
        {comparisons.map((stock) => (
          <div key={stock.symbol} className="stock-comparison-row">
            <div className="stock-comparison-cell symbol">
              <span className="stock-comparison-symbol">{stock.symbol}</span>
              <span className="stock-comparison-exchange">{stock.exchange}</span>
            </div>
            <div className="stock-comparison-cell price">
              ${stock.price.toFixed(2)}
            </div>
            <div className={`stock-comparison-cell change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
              {stock.change >= 0 ? <TrendingUp className="cell-icon" /> : <TrendingDown className="cell-icon" />}
              <span>{stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
            </div>
            <div className="stock-comparison-cell volume">
              {formatNumber(stock.volume)}
            </div>
            <div className="stock-comparison-cell range">
              ${stock.low.toFixed(2)} - ${stock.high.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="stock-comparison-bar-chart">
        {comparisons.map((stock) => {
          const barWidth = priceRange > 0 ? ((stock.price - minPrice) / priceRange) * 100 : 50;
          return (
            <div key={stock.symbol} className="stock-comparison-bar-row">
              <span className="bar-label">{stock.symbol}</span>
              <div className="bar-container">
                <div 
                  className={`bar ${stock.change >= 0 ? 'positive' : 'negative'}`}
                  style={{ width: `${Math.max(barWidth, 10)}%` }}
                />
              </div>
              <span className="bar-value">${stock.price.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
