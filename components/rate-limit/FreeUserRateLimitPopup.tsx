'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HeroBlock } from '@/components/rate-limit/HeroBlock';
import { formatResetTime } from '@/components/rate-limit/utils';
import { RATE_LIMIT_CONSTANTS } from '@/components/rate-limit/constants';
import { useToast } from '@/lib/contexts/ToastContext';

export interface FreeUserRateLimitPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  reset: number; // Unix timestamp
  customTitle?: string; // Optional custom title
  customMessage?: string; // Optional custom message
}

export function FreeUserRateLimitPopup({
  isOpen,
  onClose,
  onUpgrade,
  reset,
  customTitle,
  customMessage,
}: FreeUserRateLimitPopupProps) {
  const resetTime = formatResetTime(reset);
  const toast = useToast();

  // Local state to control popup visibility (allows wait button to close it)
  const [isVisible, setIsVisible] = useState(false);

  // Tooltip state (rendered at root level outside modal)
  const [hoveredIconName, setHoveredIconName] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  
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

  // Mount state for portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !isVisible || !mounted) return null;

  const popupContent = (
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
        className="popup-content"
        style={{
          padding: RATE_LIMIT_CONSTANTS.CONTAINER_PADDING,
          maxWidth: RATE_LIMIT_CONSTANTS.CONTAINER_MAX_WIDTH,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="auth-title" style={{ color: 'var(--color-primary)' }}>
          {customTitle || 'Upgrade to Pro'}
        </h1>
        
        <p className="auth-subtitle">
          {customMessage || (
            <>
              Upgrade to Pro for unlimited messages and access to premium models like Claude, Grok and more, or wait until{' '}
              <strong style={{ color: 'var(--color-primary)' }}>{resetTime}</strong>.
            </>
          )}
        </p>

        {/* Hero block with background, logo, pricing, carousel, and upgrade button */}
        <HeroBlock isOpen={isOpen} showPricing onIconHover={handleIconHover}>
          {/* Upgrade button */}
          <div className="auth-buttons">
            <button
              onClick={async () => {
                setIsProcessingCheckout(true);
                try {
                  const response = await fetch('/api/payments/checkout', {
                    method: 'POST',
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create checkout session');
                  }

                  const data = await response.json();

                  if (!data.checkout_url) {
                    throw new Error('No checkout URL returned');
                  }

                  // Close popup and redirect
                  onClose();
                  window.location.href = data.checkout_url;
                } catch (error) {
                  console.error('Checkout error:', error);
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : 'Failed to start checkout. Please try again.'
                  );
                } finally {
                  setIsProcessingCheckout(false);
                }
              }}
              disabled={isProcessingCheckout}
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
                cursor: isProcessingCheckout ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                width: '100%',
                opacity: isProcessingCheckout ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isProcessingCheckout) {
                  e.currentTarget.style.background = 'var(--color-bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-bg)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              {isProcessingCheckout ? 'Processing...' : 'Upgrade to Pro'}
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

  return createPortal(popupContent, document.body);
}

