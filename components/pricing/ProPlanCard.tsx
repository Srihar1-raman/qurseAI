'use client';

import React, { useState, useEffect } from 'react';
import { PricingCardWrapper } from './PricingCardWrapper';
import { PricingCardHeader } from './PricingCardHeader';
import { PricingCardFeatures } from './PricingCardFeatures';
import { PricingCardActions } from './PricingCardActions';
import { ModelIconCarousel } from '@/components/rate-limit/ModelIconCarousel';
import { RATE_LIMIT_CONSTANTS } from '@/components/rate-limit/constants';
import { PRO_PLAN_FEATURES } from './constants';
import type { UserState } from './types';

interface ProPlanCardProps {
  userState: UserState;
  onUpgrade: () => void;
}

export function ProPlanCard({ userState, onUpgrade }: ProPlanCardProps) {
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [hoveredIconName, setHoveredIconName] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const callbackUrl = React.useMemo(() => {
    return encodeURIComponent('/pricing');
  }, []);

  const isCurrentPlan = userState.isPro;
  const isDisabled = userState.isPro;
  const buttonText = isCurrentPlan ? 'Current Plan' : 'Upgrade to Pro';

  useEffect(() => {
    setIsCarouselOpen(true);
  }, []);

  useEffect(() => {
    if (!isCarouselOpen || !hoveredIconName) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isCarouselOpen, hoveredIconName]);

  const handleIconHover = (iconName: string | null, mouseX: number, mouseY: number) => {
    setHoveredIconName(iconName);
    if (iconName) {
      setMousePosition({ x: mouseX, y: mouseY });
    }
  };

  return (
    <>
      <PricingCardWrapper
        isCurrentPlan={isCurrentPlan}
        isDisabled={isDisabled}
        backgroundImage="/images/login-page.jpeg"
      >
        <PricingCardHeader title="PRO" pricing="$9/month ~800/month" />
        <PricingCardFeatures features={PRO_PLAN_FEATURES} marginBottom="24px" />
        
        {/* Model Icon Carousel */}
        <div
          style={{
            marginBottom: '32px',
            position: 'relative',
          }}
        >
          <ModelIconCarousel 
            isOpen={isCarouselOpen} 
            onIconHover={handleIconHover} 
          />
        </div>

        <PricingCardActions
          userState={userState}
          isCurrentPlan={isCurrentPlan}
          isDisabled={isDisabled}
          buttonText={buttonText}
          onAction={onUpgrade}
          callbackUrl={callbackUrl}
          buttonVariant="primary"
        />
      </PricingCardWrapper>

      {/* Tooltip for carousel icons */}
      {hoveredIconName && (
        <div
          style={{
            position: 'fixed',
            left: `${mousePosition.x + RATE_LIMIT_CONSTANTS.TOOLTIP_OFFSET}px`,
            top: `${mousePosition.y + RATE_LIMIT_CONSTANTS.TOOLTIP_OFFSET}px`,
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            padding: RATE_LIMIT_CONSTANTS.TOOLTIP_PADDING,
            borderRadius: RATE_LIMIT_CONSTANTS.TOOLTIP_BORDER_RADIUS,
            fontSize: RATE_LIMIT_CONSTANTS.TOOLTIP_FONT_SIZE,
            fontWeight: 500,
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          {hoveredIconName}
        </div>
      )}
    </>
  );
}

