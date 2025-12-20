'use client';

import React from 'react';
import { RATE_LIMIT_CONSTANTS } from '@/components/rate-limit/constants';

interface PricingCardHeaderProps {
  title: string;
  pricing: string;
}

export function PricingCardHeader({ title, pricing }: PricingCardHeaderProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        marginBottom: '32px',
      }}
    >
      <h2
        className="font-reenie"
        style={{
          fontSize: 'clamp(36px, 6vw, 48px)',
          fontWeight: 400,
          color: 'var(--color-text)',
          marginBottom: '8px',
          lineHeight: 1.05,
        }}
      >
        {title}
      </h2>
      <div
        className="pricing-amount"
        style={{
          fontSize: 'clamp(14px, 2vw, 16px)',
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          letterSpacing: RATE_LIMIT_CONSTANTS.PRICING_LETTER_SPACING,
          wordSpacing: RATE_LIMIT_CONSTANTS.PRICING_WORD_SPACING,
        }}
      >
        {pricing}
      </div>
    </div>
  );
}

