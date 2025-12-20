'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import type { PricingFeature } from './types';

interface PricingCardFeaturesProps {
  features: PricingFeature[];
  marginBottom?: string;
}

export function PricingCardFeatures({ features, marginBottom = '32px' }: PricingCardFeaturesProps) {
  const { resolvedTheme, mounted } = useTheme();

  return (
    <div
      style={{
        flex: 1,
        marginBottom,
      }}
    >
      {features.map((feature, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <Image
            src={getIconPath(feature.icon, resolvedTheme, false, mounted)}
            alt={feature.title}
            width={20}
            height={20}
            style={{
              minWidth: '20px',
              marginTop: '2px',
              opacity: 0.9,
            }}
          />
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '4px',
              }}
            >
              {feature.title}
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

