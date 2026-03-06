'use client';

import React from 'react';
import { Building2, Globe, Users, TrendingUp } from 'lucide-react';

interface CompanyInfo {
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
  address: string;
  city: string;
  state: string;
  zip: string;
  mktCap: number;
  beta: number;
  volAvg: number;
  lastDiv: number;
  price: number;
  image: string;
}

interface CompanyInfoCardProps {
  company: CompanyInfo;
}

function formatNumber(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

export function CompanyInfoCard({ company }: CompanyInfoCardProps) {
  return (
    <div className="company-info-card">
      <div className="company-info-header">
        {company.image && (
          <img src={company.image} alt={company.name} className="company-info-logo" />
        )}
        <div className="company-info-title">
          <span className="company-info-name">{company.name}</span>
          <span className="company-info-symbol">{company.symbol}</span>
        </div>
      </div>

      <div className="company-info-price">
        <span className="company-info-price-value">${company.price?.toFixed(2) || 'N/A'}</span>
        <span className="company-info-exchange">{company.exchange} ({company.exchangeShortName})</span>
      </div>

      <div className="company-info-grid">
        <div className="company-info-stat">
          <TrendingUp className="company-info-stat-icon" />
          <div className="company-info-stat-content">
            <span className="company-info-stat-label">Market Cap</span>
            <span className="company-info-stat-value">${formatNumber(company.mktCap)}</span>
          </div>
        </div>
        <div className="company-info-stat">
          <Building2 className="company-info-stat-icon" />
          <div className="company-info-stat-content">
            <span className="company-info-stat-label">Sector</span>
            <span className="company-info-stat-value">{company.sector}</span>
          </div>
        </div>
        <div className="company-info-stat">
          <Building2 className="company-info-stat-icon" />
          <div className="company-info-stat-content">
            <span className="company-info-stat-label">Industry</span>
            <span className="company-info-stat-value">{company.industry}</span>
          </div>
        </div>
        <div className="company-info-stat">
          <Users className="company-info-stat-icon" />
          <div className="company-info-stat-content">
            <span className="company-info-stat-label">Employees</span>
            <span className="company-info-stat-value">{company.fullTimeEmployees ? formatNumber(company.fullTimeEmployees) : 'N/A'}</span>
          </div>
        </div>
      </div>

      {company.ceo && (
        <div className="company-info-ceo">
          <span className="company-info-ceo-label">CEO:</span>
          <span className="company-info-ceo-value">{company.ceo}</span>
        </div>
      )}

      {company.description && (
        <div className="company-info-description">
          <p>{company.description.slice(0, 300)}{company.description.length > 300 ? '...' : ''}</p>
        </div>
      )}

      {company.website && (
        <a href={company.website} target="_blank" rel="noopener noreferrer" className="company-info-website">
          <Globe className="company-info-website-icon" />
          <span>{company.website.replace(/^https?:\/\//, '')}</span>
        </a>
      )}
    </div>
  );
}
