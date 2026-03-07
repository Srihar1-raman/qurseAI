'use client';

import React from 'react';
import { Building2, Globe, Users, TrendingUp, MapPin, Calendar } from 'lucide-react';

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
          <span className="company-info-symbol">{company.symbol} · {company.exchange}</span>
        </div>
      </div>

      {company.description && (
        <div className="company-info-description">
          <p>{company.description.slice(0, 280)}{company.description.length > 280 ? '...' : ''}</p>
        </div>
      )}

      <div className="company-info-grid">
        <div className="company-info-stat-card">
          <TrendingUp className="company-info-stat-card-icon" />
          <div className="company-info-stat-card-content">
            <span className="company-info-stat-card-label">Market Cap</span>
            <span className="company-info-stat-card-value">${formatNumber(company.mktCap)}</span>
          </div>
        </div>
        <div className="company-info-stat-card">
          <Users className="company-info-stat-card-icon" />
          <div className="company-info-stat-card-content">
            <span className="company-info-stat-card-label">Employees</span>
            <span className="company-info-stat-card-value">{company.fullTimeEmployees ? formatNumber(company.fullTimeEmployees) : 'N/A'}</span>
          </div>
        </div>
        <div className="company-info-stat-card">
          <Building2 className="company-info-stat-card-icon" />
          <div className="company-info-stat-card-content">
            <span className="company-info-stat-card-label">Sector</span>
            <span className="company-info-stat-card-value">{company.sector}</span>
          </div>
        </div>
        <div className="company-info-stat-card">
          <Building2 className="company-info-stat-card-icon" />
          <div className="company-info-stat-card-content">
            <span className="company-info-stat-card-label">Industry</span>
            <span className="company-info-stat-card-value">{company.industry}</span>
          </div>
        </div>
      </div>

      {company.ceo && (
        <div className="company-info-footer">
          <div className="company-info-footer-item">
            <span className="company-info-footer-label">CEO</span>
            <span className="company-info-footer-value">{company.ceo}</span>
          </div>
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer" className="company-info-footer-link">
              <Globe className="company-info-footer-icon" />
              <span>{company.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
