'use client';

import React from 'react';
import { ModelIconCarousel } from './ModelIconCarousel';
import { RATE_LIMIT_CONSTANTS } from './constants';

export interface HeroBlockProps {
  isOpen: boolean;
  showPricing?: boolean;
  logoPaddingTop?: string; // Optional padding for logo (guest popup only)
  onIconHover?: (iconName: string | null, mouseX: number, mouseY: number) => void;
  children?: React.ReactNode;
}

/**
 * Shared hero block component for rate limit popups
 * Handles background image, logo, pricing, and carousel
 */
export function HeroBlock({ isOpen, showPricing = false, logoPaddingTop, onIconHover, children }: HeroBlockProps) {
  return (
    <div
      style={{
        position: 'relative',
        margin: RATE_LIMIT_CONSTANTS.SECTION_MARGIN,
        padding: RATE_LIMIT_CONSTANTS.SECTION_PADDING,
      }}
    >
      {/* Background image layer with gradient fade */}
      <div
        style={{
          position: 'absolute',
          top: RATE_LIMIT_CONSTANTS.BG_IMAGE_OFFSET_TOP,
          left: 0,
          right: 0,
          bottom: RATE_LIMIT_CONSTANTS.BG_IMAGE_OFFSET_BOTTOM,
          backgroundImage: 'url(/images/login-page.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: RATE_LIMIT_CONSTANTS.BG_IMAGE_OPACITY,
          zIndex: 0,
          pointerEvents: 'none',
          maskImage: `linear-gradient(to bottom, transparent 0%, black ${RATE_LIMIT_CONSTANTS.BG_IMAGE_MASK_START}, black ${RATE_LIMIT_CONSTANTS.BG_IMAGE_MASK_END}, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${RATE_LIMIT_CONSTANTS.BG_IMAGE_MASK_START}, black ${RATE_LIMIT_CONSTANTS.BG_IMAGE_MASK_END}, transparent 100%)`,
        }}
      />

      {/* Content layer */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo and optional pricing - positioned in free space above icons */}
        <div
          style={{
            position: 'absolute',
            top: showPricing ? '-67px' : RATE_LIMIT_CONSTANTS.LOGO_OFFSET_TOP,
            left: 0,
            right: 0,
            textAlign: 'center',
            pointerEvents: 'none',
            ...(logoPaddingTop && { paddingTop: logoPaddingTop }),
          }}
        >
          <h2
            className="font-reenie"
            style={{
              fontSize: RATE_LIMIT_CONSTANTS.LOGO_FONT_SIZE,
              fontWeight: 400,
              color: 'var(--color-text)',
              marginBottom: '0px',
              lineHeight: RATE_LIMIT_CONSTANTS.LOGO_LINE_HEIGHT,
            }}
          >
            Qurse
          </h2>
          {showPricing && (
            <div
              style={{
                fontSize: RATE_LIMIT_CONSTANTS.PRICING_FONT_SIZE,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                letterSpacing: RATE_LIMIT_CONSTANTS.PRICING_LETTER_SPACING,
                wordSpacing: RATE_LIMIT_CONSTANTS.PRICING_WORD_SPACING,
                
              }}
            >
              $9/month ~800/month
            </div>
          )}
        </div>

        {/* Carousel */}
        <ModelIconCarousel isOpen={isOpen} onIconHover={onIconHover} />

        {/* Custom content (auth buttons, upgrade button, terms, etc.) */}
        {children}
      </div>
    </div>
  );
}

