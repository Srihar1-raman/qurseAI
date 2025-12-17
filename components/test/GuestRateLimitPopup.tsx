'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { HeroBlock } from '@/components/rate-limit/HeroBlock';
import { formatResetTime, getPopupBackgroundStyle } from '@/components/rate-limit/utils';
import { RATE_LIMIT_CONSTANTS } from '@/components/rate-limit/constants';

export interface GuestRateLimitPopupProps {
  isOpen: boolean;
  onClose: () => void;
  reset: number; // Unix timestamp
  layer?: 'redis' | 'database';
}

export function GuestRateLimitPopup({
  isOpen,
  onClose,
  reset,
  layer = 'database',
}: GuestRateLimitPopupProps) {
  const { resolvedTheme, mounted } = useTheme();
  const backgroundStyle = getPopupBackgroundStyle(resolvedTheme);
  const resetTime = formatResetTime(reset);

  // Auto-close if limit has reset
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      if (Date.now() >= reset) {
        onClose();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, reset, onClose]);

  // Handle escape key and body overflow
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
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
      onClick={onClose}
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
          Daily Limit Reached
        </h1>
        
        <p className="auth-subtitle">
          You've reached the daily message limit. Sign in or sign up to continue messaging, or wait until{' '}
          <strong style={{ color: 'var(--color-primary)' }}>{resetTime}</strong>.
        </p>

        {/* Hero block with background, logo, carousel, and auth buttons */}
        <HeroBlock isOpen={isOpen}>
          {/* Auth buttons row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: RATE_LIMIT_CONSTANTS.AUTH_BUTTON_GRID_GAP,
              marginTop: '10px',
            }}
          >
            {[
              { name: 'Google', icon: 'google' },
              { name: 'X (Twitter)', icon: 'x-twitter' },
              { name: 'GitHub', icon: 'github' },
            ].map((item) => (
              <button
                key={item.icon}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: RATE_LIMIT_CONSTANTS.AUTH_BUTTON_PADDING,
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  background: 'var(--color-bg)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
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
                <Image
                  src={getIconPath(item.icon, resolvedTheme, false, mounted)}
                  alt={item.name}
                  width={RATE_LIMIT_CONSTANTS.AUTH_BUTTON_ICON_SIZE}
                  height={RATE_LIMIT_CONSTANTS.AUTH_BUTTON_ICON_SIZE}
                  style={{ opacity: 0.9 }}
                />
              </button>
            ))}
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

        {/* Wait button */}
        <button
          onClick={onClose}
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
  );
}
