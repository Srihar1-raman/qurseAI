'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from '@/lib/theme-provider';
import AuthButton from '@/components/auth/AuthButton';
import { HeroBlock } from '@/components/rate-limit/HeroBlock';
import { formatResetTime, getPopupBackgroundStyle } from '@/components/rate-limit/utils';
import { RATE_LIMIT_CONSTANTS } from '@/components/rate-limit/constants';

export interface GuestRateLimitPopupProps {
  isOpen: boolean;
  onClose: () => void;
  reset: number; // Unix timestamp
  layer?: 'redis' | 'database';
  // Optional custom title and message (for guest actions like rename/delete)
  customTitle?: string;
  customMessage?: string;
  // Optional: show pricing (for Pro model access prompts)
  showPricing?: boolean;
}

export function GuestRateLimitPopup({
  isOpen,
  onClose,
  reset,
  layer = 'database',
  customTitle,
  customMessage,
  showPricing = false,
}: GuestRateLimitPopupProps) {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  // Preserve current URL as callback
  const callbackUrl = useMemo(() => {
    const search = searchParams.toString();
    return `${pathname}${search ? `?${search}` : ''}`;
  }, [pathname, searchParams]);

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

  // Handle wait/close button click
  // For rate limit popups: close but keep rate limit state
  // For custom popups (sign in prompts): close and call onClose
  const handleWait = () => {
    setIsVisible(false);
    // If custom title/message is provided, it's not a rate limit popup, so call onClose
    if (customTitle || customMessage) {
      onClose();
    }
    // Otherwise, don't call onClose - rate limit state should remain
  };

  // Determine button text based on whether it's a rate limit popup or custom popup
  const buttonText = (customTitle || customMessage) ? 'Close' : 'Wait';

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
      // Popup is non-dismissible - user must authenticate or wait
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
          {customTitle || 'Daily Limit Reached'}
        </h1>
        
        <p className="auth-subtitle">
          {customMessage || (
            <>
              You've reached the daily message limit. Sign in or sign up to continue messaging, or wait until{' '}
              <strong style={{ color: 'var(--color-primary)' }}>{resetTime}</strong>.
            </>
          )}
        </p>

        {/* Hero block with background, logo, pricing, carousel, and auth buttons */}
        <HeroBlock isOpen={isOpen} showPricing={showPricing} logoPaddingTop={showPricing ? undefined : "10px"} onIconHover={handleIconHover}>
          {/* Auth buttons row - icon only */}
          <div
            className="auth-buttons"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: RATE_LIMIT_CONSTANTS.AUTH_BUTTON_GRID_GAP,
              marginTop: '10px',
            }}
          >
            <AuthButton provider="google" callbackUrl={callbackUrl} iconOnly />
            <AuthButton provider="twitter" callbackUrl={callbackUrl} iconOnly />
            <AuthButton provider="github" callbackUrl={callbackUrl} iconOnly />
          </div>

          {/* Terms */}
          <div className="auth-terms" style={{ marginTop: '12px' }}>
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

        {/* Wait/Close button */}
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
          {buttonText}
        </button>
      </div>
    </div>
    </>
  );
}

