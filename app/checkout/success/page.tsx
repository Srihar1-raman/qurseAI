'use client';

/**
 * Checkout Success Page
 * Shown after successful payment completion
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { UnifiedButton } from '@/components/ui/UnifiedButton';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const { user, isProUser, isLoading: isLoadingAuth } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // Poll for Pro status every 2 seconds, max 30 seconds
    // This handles the case where webhook hasn't arrived yet
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/user/subscription');
        const data = await response.json();

        if (data.isPro) {
          setIsVerifying(false);
          setShowError(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling subscription status:', error);
      }
    }, 2000);

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setIsVerifying(false);
      if (!isProUser) {
        setShowError(true);
      }
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isProUser]);

  const handleContinue = () => {
    router.push('/');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  // Show loading state while checking auth
  if (isLoadingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

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
          fontSize: '72px',
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
        {showError ? (
          <AlertCircle
            style={{
              width: '80px',
              height: '80px',
              color: 'rgb(234, 179, 8)',
              margin: '0 auto 24px auto',
            }}
          />
        ) : (
          <CheckCircle2
            style={{
              width: '80px',
              height: '80px',
              color: 'rgb(16, 163, 127)',
              margin: '0 auto 24px auto',
            }}
          />
        )}

        {showError ? (
          <>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 700,
              marginBottom: '16px',
            }}>
              Activation Pending
            </h1>

            <p style={{
              fontSize: '18px',
              color: 'var(--color-text-secondary)',
              marginBottom: '32px',
              lineHeight: '1.6',
            }}>
              We're having trouble activating your subscription. This might be due to a delay in payment processing.
            </p>

            <div style={{
              backgroundColor: 'var(--color-bg-secondary)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                <strong>What to do:</strong>
              </p>
              <ul style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'left', paddingLeft: '20px' }}>
                <li>Check your email for payment confirmation</li>
                <li>Wait a few minutes and refresh this page</li>
                <li>Contact support if issue persists</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <UnifiedButton
                onClick={handleContinue}
                variant="secondary"
              >
                Go to Home
              </UnifiedButton>

              <UnifiedButton
                onClick={handleSettings}
                variant="primary"
              >
                Go to Settings
              </UnifiedButton>
            </div>
          </>
        ) : (
          <>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 36px)',
              fontWeight: 700,
              marginBottom: '16px',
            }}>
              {isVerifying ? 'Setting up your Pro subscription...' : (
                <>
                  Welcome to <span className="font-reenie font-medium" style={{ fontSize: '1.2em' }}>Pro</span>!
                </>
              )}
            </h1>

            <p style={{
              fontSize: '18px',
              color: 'var(--color-text-secondary)',
              marginBottom: '32px',
              lineHeight: '1.6',
            }}>
              {isVerifying
                ? 'Please wait while we activate your subscription...'
                : 'Your Pro subscription is now active.'
              }
            </p>

            {!isVerifying && (
              <UnifiedButton
                onClick={handleContinue}
                disabled={isVerifying}
                variant="primary"
              >
                Start Chatting
              </UnifiedButton>
            )}

            {isVerifying && (
              <div style={{
                marginTop: '24px',
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
              }}>
                This usually takes just a few seconds...
              </div>
            )}

            {!isVerifying && !showError && (
              <p style={{
                marginTop: '24px',
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
              }}>
                You can manage your subscription in{' '}
                <a
                  href="/settings"
                  style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                >
                  Settings
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
