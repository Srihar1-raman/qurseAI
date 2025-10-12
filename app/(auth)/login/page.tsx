'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthButton from '@/components/auth/AuthButton';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Redirect to homepage if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      console.log('Redirecting logged-in user to homepage');
      router.replace('/'); // Use replace to avoid back button issues
    }
  }, [user, isLoading, router]);

  // Show minimal loading state while checking auth or redirecting
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // If user exists, show redirecting message (brief flash before redirect)
  if (user) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}>
        <div>Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Form Section */}
      <div className="form-section">
        {/* Mobile Background Image */}
        <div className="mobile-bg-image" />

        <Link 
          href="/" 
          className="auth-logo logo font-reenie"
        >
          Qurse
        </Link>
        
        <div className="form-content">
          <h1 className="auth-title">
            Log in
          </h1>
          <p className="auth-subtitle">
            Log in to your account using your preferred provider
          </p>

          <div className="auth-buttons">
            <AuthButton provider="github" />
            <AuthButton provider="google" />
            <AuthButton provider="twitter" />
          </div>

          <div className="auth-footer">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="auth-link">
              Sign up
            </Link>
          </div>

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
        </div>
      </div>

      {/* Image Section - Desktop Only */}
      <div className="image-section" />
    </div>
  );
}