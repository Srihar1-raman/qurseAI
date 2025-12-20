'use client';

import React from 'react';
import { UnifiedButton } from '@/components/ui/UnifiedButton';
import { AuthButtons } from '@/components/layout/AuthButtons';
import type { UserState } from './types';

interface PricingCardActionsProps {
  userState: UserState;
  isCurrentPlan: boolean;
  isDisabled: boolean;
  buttonText: string;
  onAction: () => void;
  callbackUrl: string;
  buttonVariant?: 'primary' | 'secondary';
}

export function PricingCardActions({
  userState,
  isCurrentPlan,
  isDisabled,
  buttonText,
  onAction,
  callbackUrl,
  buttonVariant = 'secondary',
}: PricingCardActionsProps) {
  const TermsAndPolicy = () => (
    <div
      style={{
        marginTop: '16px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}
      >
        By continuing, you agree to our{' '}
        <a
          href="/info?section=terms"
          style={{
            color: 'var(--color-primary)',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="/info?section=privacy"
          style={{
            color: 'var(--color-primary)',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );

  return (
    <div
      style={{
        marginTop: 'auto',
      }}
    >
      {userState.isGuest ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
            className="pricing-auth-buttons"
          >
            <AuthButtons callbackUrl={callbackUrl} />
          </div>
          <TermsAndPolicy />
        </div>
      ) : (
        <div>
          <UnifiedButton
            variant={isCurrentPlan ? 'primary' : buttonVariant}
            disabled={isDisabled}
            onClick={onAction}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 500,
            }}
          >
            {buttonText}
          </UnifiedButton>
          <TermsAndPolicy />
        </div>
      )}
    </div>
  );
}

