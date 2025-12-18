'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme-provider';
import { HeroBlock } from '@/components/rate-limit/HeroBlock';
import { formatResetTime, getPopupBackgroundStyle } from '@/components/rate-limit/utils';
import { RATE_LIMIT_CONSTANTS } from '@/components/rate-limit/constants';

export interface FreeUserRateLimitPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  reset: number; // Unix timestamp
}

export function FreeUserRateLimitPopup({
  isOpen,
  onClose,
  onUpgrade,
  reset,
}: FreeUserRateLimitPopupProps) {
  const { resolvedTheme } = useTheme();
  const backgroundStyle = getPopupBackgroundStyle(resolvedTheme);
  const resetTime = formatResetTime(reset);
  
  // Local state to control popup visibility (allows wait button to close it)
  const [isVisible, setIsVisible] = useState(false);
  
  // Tooltip state (rendered at root level outside modal)
  const [hoveredIconName, setHoveredIconName] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Show popup when isOpen becomes true (new rate limit detected)
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);
  
  // Global mouse move listener for tooltip positioning
  useEffect(() => {
    if (!isOpen || !isVisible || !hoveredIconName) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen, isVisible, hoveredIconName]);
  
  // Handle icon hover callback from carousel
  const handleIconHover = (iconName: string | null, mouseX: number, mouseY: number) => {
    setHoveredIconName(iconName);
    if (iconName) {
      setMousePosition({ x: mouseX, y: mouseY });
    }
  };

  // Auto-close if limit has reset
  useEffect(() => {
    if (!isOpen || !isVisible) return;

    const interval = setInterval(() => {
      if (Date.now() >= reset) {
        setIsVisible(false);
        onClose();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isVisible, reset, onClose]);

  // Handle body overflow (popup is non-dismissible when rate limited)
  useEffect(() => {
    if (!isOpen || !isVisible) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isVisible]);

  // Handle wait button click - close popup but keep rate limit state
  const handleWait = () => {
    setIsVisible(false);
    // Don't call onClose - rate limit state should remain
  };

  if (!isOpen || !isVisible) return null;

  return (
    <>
      {/* Tooltip at cursor position - rendered at root level outside modal */}
      {hoveredIconName && (
        <div
          style={{
            position: 'fixed',
            left: `${mousePosition.x + RATE_LIMIT_CONSTANTS.TOOLTIP_OFFSET}px`,
            top: `${mousePosition.y + RATE_LIMIT_CONSTANTS.TOOLTIP_OFFSET}px`,
            pointerEvents: 'none',
            zIndex: 10001,
            fontSize: RATE_LIMIT_CONSTANTS.TOOLTIP_FONT_SIZE,
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg)',
            padding: RATE_LIMIT_CONSTANTS.TOOLTIP_PADDING,
            borderRadius: RATE_LIMIT_CONSTANTS.TOOLTIP_BORDER_RADIUS,
            border: '1px solid var(--color-border)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          {hoveredIconName}
        </div>
      )}
      
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: RATE_LIMIT_CONSTANTS.CONTAINER_PADDING,
      }}
      // Popup is non-dismissible - user must upgrade or wait
    >
      <div
        className="form-content"
        style={{
          padding: RATE_LIMIT_CONSTANTS.CONTAINER_PADDING,
          maxWidth: RATE_LIMIT_CONSTANTS.CONTAINER_MAX_WIDTH,
          width: '100%',
          position: 'relative',
          zIndex: 1,
          background: backgroundStyle,
          backdropFilter: RATE_LIMIT_CONSTANTS.CONTAINER_BACKDROP_BLUR,
          borderRadius: RATE_LIMIT_CONSTANTS.CONTAINER_BORDER_RADIUS,
          border: '1px solid var(--color-border)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="auth-title" style={{ color: 'var(--color-primary)' }}>
          Upgrade to Pro
        </h1>
        
        <p className="auth-subtitle">
          Upgrade to Pro for unlimited messages and access to premium models like Claude, Grok and more, or wait until{' '}
          <strong style={{ color: 'var(--color-primary)' }}>{resetTime}</strong>.
        </p>

        {/* Hero block with background, logo, pricing, carousel, and upgrade button */}
        <HeroBlock isOpen={isOpen} showPricing onIconHover={handleIconHover}>
          {/* Upgrade button */}
          <div className="auth-buttons">
            <button 
              onClick={onUpgrade}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-hover)';
                e.currentTarget.style.borderColor = 'var(--color-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-bg)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Terms */}
          <div className="auth-terms">
            By continuing, you agree to our{' '}
            <a href="/info?section=terms" className="auth-terms-link">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/info?section=privacy" className="auth-terms-link">
              Privacy Policy
            </a>.
          </div>
        </HeroBlock>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            backgroundColor: 'var(--color-border)',
            margin: RATE_LIMIT_CONSTANTS.DIVIDER_MARGIN,
          }}
        />

        {/* Wait button */}
        <button 
          onClick={handleWait}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '12px 16px',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          Wait
        </button>
      </div>
    </div>
    </>
  );
}

