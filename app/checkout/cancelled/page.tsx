/**
 * Checkout Cancelled Page
 * Shown when user cancels payment
 */

'use client';

import { useRouter } from 'next/navigation';
import { UnifiedButton } from '@/components/ui/UnifiedButton';
import { XCircle } from 'lucide-react';

export default function CheckoutCancelledPage() {
  const router = useRouter();

  const handleRetry = () => {
    router.push('/pricing');
  };

  const handleReturnHome = () => {
    router.push('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Logo */}
      <a
        href="/"
        className="font-reenie font-medium hover:opacity-80 transition-opacity"
        style={{
          fontSize: '52px',
          letterSpacing: '-0.5px',
          color: 'var(--color-text)',
          textDecoration: 'none',
          marginBottom: '40px',
        }}
      >
        {'Qurse'}
      </a>

      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
      }}>
        <XCircle
          style={{
            width: '80px',
            height: '80px',
            color: 'rgb(239, 68, 68)',
            margin: '0 auto 24px auto',
          }}
        />

        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 36px)',
          fontWeight: 700,
          marginBottom: '16px',
        }}>
          Payment Cancelled
        </h1>

        <p style={{
          fontSize: '18px',
          color: 'var(--color-text-secondary)',
          marginBottom: '32px',
          lineHeight: '1.6',
        }}>
          You cancelled the payment process. Your account remains on the Free plan.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <UnifiedButton
            onClick={handleRetry}
            variant="primary"
          >
            View Pricing Plans
          </UnifiedButton>

          <UnifiedButton
            onClick={handleReturnHome}
            variant="secondary"
          >
            Return Home
          </UnifiedButton>
        </div>

        <p style={{
          marginTop: '32px',
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
        }}>
          You can upgrade anytime from the{' '}
          <a
            href="/pricing"
            style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
          >
            Pricing page
          </a>
        </p>
      </div>
    </div>
  );
}
