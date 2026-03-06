'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Building2, Globe, DollarSign } from 'lucide-react';

interface StockQuoteData {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  change: number;
  changePercent: number;
  latestTradingDay: string;
  isPositive: boolean;
}

interface CompanyData {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: number;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  mktCap: number;
  beta: number;
  volAvg: number;
  lastDiv: number;
  range: string;
  price: number;
  image: string;
}

interface StockCardProps {
  quote?: StockQuoteData;
  company?: CompanyData;
}

function formatNumber(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

export function StockCard({ quote, company }: StockCardProps) {
  if (!quote) return null;

  return (
    <div className="stock-card">
      <div className="stock-card-header">
        <div className="stock-card-title-row">
          <span className="stock-card-symbol">{quote.symbol}</span>
          {company && <span className="stock-card-name">{company.name}</span>}
        </div>
        <div className={`stock-card-change ${quote.isPositive ? 'positive' : 'negative'}`}>
          {quote.isPositive ? <TrendingUp className="stock-card-change-icon" /> : <TrendingDown className="stock-card-change-icon" />}
          <span className="stock-card-change-value">
            {quote.isPositive ? '+' : ''}{quote.change.toFixed(2)} ({quote.isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div className="stock-card-price">
        <span className="stock-card-price-value">${quote.price.toFixed(2)}</span>
        <span className="stock-card-price-label">Last updated: {quote.latestTradingDay}</span>
      </div>

      <div className="stock-card-grid">
        <div className="stock-card-stat">
          <span className="stock-card-stat-label">Open</span>
          <span className="stock-card-stat-value">${quote.open.toFixed(2)}</span>
        </div>
        <div className="stock-card-stat">
          <span className="stock-card-stat-label">High</span>
          <span className="stock-card-stat-value">${quote.high.toFixed(2)}</span>
        </div>
        <div className="stock-card-stat">
          <span className="stock-card-stat-label">Low</span>
          <span className="stock-card-stat-value">${quote.low.toFixed(2)}</span>
        </div>
        <div className="stock-card-stat">
          <span className="stock-card-stat-label">Volume</span>
          <span className="stock-card-stat-value">{formatNumber(quote.volume)}</span>
        </div>
      </div>

      {company && (
        <div className="stock-card-company">
          <div className="stock-card-company-header">
            <Building2 className="stock-card-company-icon" />
            <span>Company Info</span>
          </div>
          <div className="stock-card-company-grid">
            <div className="stock-card-company-stat">
              <span className="stock-card-company-stat-label">Market Cap</span>
              <span className="stock-card-company-stat-value">${formatNumber(company.mktCap)}</span>
            </div>
            <div className="stock-card-company-stat">
              <span className="stock-card-company-stat-label">Sector</span>
              <span className="stock-card-company-stat-value">{company.sector}</span>
            </div>
            <div className="stock-card-company-stat">
              <span className="stock-card-company-stat-label">Industry</span>
              <span className="stock-card-company-stat-value">{company.industry}</span>
            </div>
            <div className="stock-card-company-stat">
              <span className="stock-card-company-stat-label">Avg Volume</span>
              <span className="stock-card-company-stat-value">{formatNumber(company.volAvg)}</span>
            </div>
            {company.fullTimeEmployees && (
              <div className="stock-card-company-stat">
                <span className="stock-card-company-stat-label">Employees</span>
                <span className="stock-card-company-stat-value">{formatNumber(company.fullTimeEmployees)}</span>
              </div>
            )}
            {company.beta && (
              <div className="stock-card-company-stat">
                <span className="stock-card-company-stat-label">Beta</span>
                <span className="stock-card-company-stat-value">{company.beta.toFixed(2)}</span>
              </div>
            )}
          </div>
          {company.ceo && (
            <div className="stock-card-company-ceo">
              <span className="stock-card-company-stat-label">CEO:</span>
              <span className="stock-card-company-stat-value">{company.ceo}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
