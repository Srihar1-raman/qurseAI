'use client';

import React from 'react';
import Image from 'next/image';
import { RATE_LIMIT_CONSTANTS } from '@/components/rate-limit/constants';

interface PricingCardWrapperProps {
  isCurrentPlan: boolean;
  isDisabled: boolean;
  backgroundImage: string;
  children: React.ReactNode;
}

export function PricingCardWrapper({
  isCurrentPlan,
  isDisabled,
  backgroundImage,
  children,
}: PricingCardWrapperProps) {
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCurrentPlan && !isDisabled) {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = isCurrentPlan
      ? '0 4px 20px rgba(16, 163, 127, 0.15)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)';
  };

  return (
    <div
      className="pricing-card"
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-bg)',
        border: `2px solid ${isCurrentPlan ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: '16px',
        padding: 'clamp(24px, 4vw, 40px) clamp(16px, 3vw, 32px)',
        minHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isCurrentPlan
          ? '0 4px 20px rgba(16, 163, 127, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        cursor: 'default',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Image Layer */}
      <div
        style={{
          position: 'absolute',
          top: RATE_LIMIT_CONSTANTS.BG_IMAGE_OFFSET_TOP,
          left: 0,
          right: 0,
          bottom: RATE_LIMIT_CONSTANTS.BG_IMAGE_OFFSET_BOTTOM,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          quality={80}
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: RATE_LIMIT_CONSTANTS.BG_IMAGE_OPACITY,
            maskImage: `linear-gradient(to bottom, transparent 0%, black ${RATE_LIMIT_CONSTANTS.BG_IMAGE_MASK_START}, black ${RATE_LIMIT_CONSTANTS.BG_IMAGE_MASK_END}, transparent 100%)`,
            WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${RATE_LIMIT_CONSTANTS.BG_IMAGE_MASK_START}, black ${RATE_LIMIT_CONSTANTS.BG_IMAGE_MASK_END}, transparent 100%)`,
          }}
        />
      </div>

      {/* Content Layer */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
