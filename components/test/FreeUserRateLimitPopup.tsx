'use client';

import React, { useEffect } from 'react';
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
          Upgrade to Pro
        </h1>
        
        <p className="auth-subtitle">
          Upgrade to Pro for unlimited messages and access to premium models like Claude, Grok and more, or wait until{' '}
          <strong style={{ color: 'var(--color-primary)' }}>{resetTime}</strong>.
        </p>

        {/* Hero block with background, logo, pricing, carousel, and upgrade button */}
        <HeroBlock isOpen={isOpen} showPricing>
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
