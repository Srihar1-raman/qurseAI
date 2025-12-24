'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useQueryStates } from 'nuqs';
import AuthButton from '@/components/auth/AuthButton';
import { useGuestSaveNudge } from '@/hooks/use-guest-save-nudge';
import { NUDGE_CONFIG } from '@/lib/constants/nudge';

export interface GuestSaveNudgeProps {
  conversationId?: string;
  messageCount: number;
  isActive?: boolean;
  onTitleGenerated?: () => void; // Call when AI generates title
}

export function GuestSaveNudge({
  conversationId,
  messageCount,
  isActive = true,
}: GuestSaveNudgeProps) {
  const pathname = usePathname();
  const [allParams] = useQueryStates({}, { history: 'replace' });
  const [mounted, setMounted] = useState(false);

  const { shouldShow, onDismiss, getMessageContent } = useGuestSaveNudge({
    messageCount,
    conversationId,
    isActive,
  });

  // Mount state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Build callback URL
  const callbackUrl = React.useMemo(() => {
    const queryString = Object.entries(allParams)
      .filter(([_, value]) => value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');

    return `${pathname}${queryString ? `?${queryString}` : ''}`;
  }, [pathname, allParams]);

  const messageContent = getMessageContent();

  if (!shouldShow || !mounted) return null;

  const popupContent = (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '400px',
        width: '90%',
        zIndex: 9998,
        animation: 'slideInUp 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      <div
        style={{
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-primary)',
          }}>
            {messageContent.title}
          </h3>
        </div>

        {/* Message */}
        <p style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          lineHeight: '1.5',
        }}>
          {messageContent.message}
        </p>

        {/* Auth buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '12px',
        }}>
          <AuthButton provider="google" callbackUrl={callbackUrl} iconOnly />
          <AuthButton provider="twitter" callbackUrl={callbackUrl} iconOnly />
          <AuthButton provider="github" callbackUrl={callbackUrl} iconOnly />
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          Close
        </button>

        {/* Terms */}
        <div style={{
          marginTop: '12px',
          fontSize: '11px',
          color: 'var(--color-text-tertiary)',
          textAlign: 'center',
        }}>
          By continuing, you agree to our{' '}
          <a href="/info?section=terms" style={{ color: 'var(--color-primary)' }}>
            Terms
          </a>
          {' '}and{' '}
          <a href="/info?section=privacy" style={{ color: 'var(--color-primary)' }}>
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );

  // Create portal to document.body
  return createPortal ? createPortal(popupContent, document.body) : popupContent;
}
