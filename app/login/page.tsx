'use client';

import Link from 'next/link';
import AuthButton from '@/components/auth/AuthButton';

export default function LoginPage() {
  return (
    <div 
      className="auth-container"
      style={{
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
      }}
    >
      {/* Form Section */}
      <div 
        className="form-section"
        style={{
          width: '33.333%',
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'var(--color-bg)',
          position: 'relative',
        }}
      >
        {/* Mobile Background Image */}
        <div style={{
          display: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url("/images/login-page.jpeg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} className="mobile-bg-image" />

        <Link 
          href="/" 
          className="logo"
          style={{ 
            fontSize: '72px', 
            marginBottom: '40px',
            fontFamily: 'var(--font-reenie)',
            textDecoration: 'none',
            color: 'var(--color-text)',
            position: 'relative',
            zIndex: 2,
            cursor: 'pointer',
          }}
        >
          Qurse
        </Link>
        
        <div 
          className="form-content"
          style={{
            maxWidth: '320px',
            width: '100%',
          }}
        >
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: '8px',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-1px',
            textAlign: 'left',
          }}>
            Log in
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            marginBottom: '32px',
            lineHeight: 1.5,
            textAlign: 'left',
          }}>
            Log in to your account using your preferred provider
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <AuthButton provider="github" />
            <AuthButton provider="google" />
            <AuthButton provider="twitter" />
          </div>

          <div style={{
            marginTop: '24px',
            textAlign: 'left',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
          }}>
            Don&apos;t have an account?{' '}
            <Link 
              href="/signup"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              Sign up
            </Link>
          </div>

          <div style={{
            marginTop: '16px',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.4,
          }}>
            By continuing, you agree to our{' '}
            <a 
              href="/info?section=terms"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
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
            >
              Privacy Policy
            </a>.
          </div>
        </div>
      </div>

      {/* Image Section - Desktop Only */}
      <div 
        style={{ 
          width: '66.667%',
          backgroundImage: 'url("/images/login-page.jpeg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        className="image-section"
      />
    </div>
  );
}

