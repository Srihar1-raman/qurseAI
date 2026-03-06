'use client';

import React from 'react';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NewsItem {
  title: string;
  publishedDate: string;
  site: string;
  text: string;
  url: string;
  sentiment: string;
}

interface StockNewsProps {
  news: NewsItem[];
  symbol: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getSentimentIcon(sentiment: string) {
  if (sentiment === 'positive') return <TrendingUp className="news-sentiment-icon positive" />;
  if (sentiment === 'negative') return <TrendingDown className="news-sentiment-icon negative" />;
  return <Minus className="news-sentiment-icon neutral" />;
}

function getSentimentClass(sentiment: string) {
  if (sentiment === 'positive') return 'positive';
  if (sentiment === 'negative') return 'negative';
  return 'neutral';
}

export function StockNews({ news, symbol }: StockNewsProps) {
  if (!news || news.length === 0) return null;

  return (
    <div className="stock-news-card">
      <div className="stock-news-header">
        <Newspaper className="stock-news-icon" />
        <span className="stock-news-title">Latest News for {symbol}</span>
      </div>

      <div className="stock-news-list">
        {news.map((item, index) => (
          <a 
            key={index} 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="stock-news-item"
          >
            <div className="stock-news-item-header">
              <span className="stock-news-source">{item.site}</span>
              <span className="stock-news-date">{formatDate(item.publishedDate)}</span>
            </div>
            <div className="stock-news-item-title">{item.title}</div>
            <div className="stock-news-item-footer">
              <span className={`stock-news-sentiment ${getSentimentClass(item.sentiment)}`}>
                {getSentimentIcon(item.sentiment)}
                <span>{item.sentiment}</span>
              </span>
              <ExternalLink className="stock-news-external" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
