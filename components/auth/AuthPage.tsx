'use client';

import Link from 'next/link';
import AuthButton from '@/components/auth/AuthButton';

interface AuthPageProps {
  mode: 'login' | 'signup';
}

export default function AuthPage({ mode }: AuthPageProps) {
  const isLogin = mode === 'login';

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
            {isLogin ? 'Log in' : 'Sign up'}
          </h1>
          <p className="auth-subtitle">
            {isLogin 
              ? 'Log in to your account using your preferred provider'
              : 'Create your account using your preferred provider'
            }
          </p>

          <div className="auth-buttons">
            <AuthButton provider="github" />
            <AuthButton provider="google" />
            <AuthButton provider="twitter" />
          </div>

          <div className="auth-footer">
            {isLogin ? (
              <>
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="auth-link">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href="/login" className="auth-link">
                  Log in
                </Link>
              </>
            )}
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

