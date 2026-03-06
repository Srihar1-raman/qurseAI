'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Activity, Globe, MapPin } from 'lucide-react';

interface IndexData {
  symbol: string;
  name: string;
  country: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface MarketIndicesProps {
  indices: IndexData[];
}

export function MarketIndices({ indices }: MarketIndicesProps) {
  if (!indices || indices.length === 0) return null;

  const getCountryIcon = (country: string) => {
    if (country === 'India') return <MapPin className="index-country-icon" />;
    return <Globe className="index-country-icon" />;
  };

  return (
    <div className="market-indices-card">
      <div className="market-indices-header">
        <Activity className="market-indices-icon" />
        <span className="market-indices-title">Market Indices</span>
      </div>
      
      <div className="market-indices-grid">
        {indices.map((index) => (
          <div key={index.symbol} className="market-index-item">
            <div className="market-index-header">
              {getCountryIcon(index.country)}
              <span className="market-index-name">{index.name}</span>
            </div>
            <div className="market-index-price">${index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className={`market-index-change ${index.change >= 0 ? 'positive' : 'negative'}`}>
              {index.change >= 0 ? <TrendingUp className="market-index-change-icon" /> : <TrendingDown className="market-index-change-icon" />}
              <span>{index.change >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
