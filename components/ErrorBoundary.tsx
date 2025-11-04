'use client';

import React, { Component, ReactNode } from 'react';
import { handleClientError } from '@/lib/utils/error-handler';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

/**
 * Error Boundary Component
 * Catches React component errors and displays user-friendly fallback UI
 * Prevents entire app from crashing when a component fails
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with context
    const userMessage = handleClientError(error, 'error-boundary');
    
    // Log error details
    console.error('ErrorBoundary caught error:', {
      error: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });

    // Report to Sentry if configured
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // Safely import Sentry only if available
        const Sentry = require('@sentry/nextjs');
        if (Sentry && Sentry.captureException) {
          Sentry.captureException(error, {
            tags: {
              errorBoundary: 'true',
              errorId: this.state.errorId || 'unknown',
            },
            contexts: {
              react: {
                componentStack: errorInfo.componentStack,
              },
            },
            extra: {
              errorBoundary: true,
              errorId: this.state.errorId,
            },
          });
        }
      } catch (sentryError) {
        // Sentry failed or not available, but don't break error boundary
        // Error is already logged above
      }
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return <DefaultErrorFallback error={this.state.error} errorId={this.state.errorId} onReset={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 * Theme-aware error display with "Go Home" button
 */
function DefaultErrorFallback({ 
  error, 
  errorId, 
  onReset 
}: { 
  error: Error; 
  errorId: string | null;
  onReset: () => void;
}) {
  const handleGoHome = () => {
    // Use window.location for hard navigation (works even in error state)
    // This ensures we fully navigate away from the error state
    window.location.href = '/';
  };

  // Sanitize error message for display
  const userMessage = handleClientError(error, 'error-boundary-ui');

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          padding: '2rem',
          borderRadius: '12px',
          border: '2px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            marginBottom: '1rem',
            color: 'var(--color-text)',
          }}
        >
          Something went wrong
        </h1>
        
        <p
          style={{
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            marginBottom: '2rem',
            lineHeight: '1.5',
          }}
        >
          {userMessage}
        </p>

        {errorId && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              marginBottom: '2rem',
              fontFamily: 'monospace',
            }}
          >
            Error ID: {errorId}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleGoHome}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--color-primary)',
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-primary-hover)';
              e.currentTarget.style.borderColor = 'var(--color-primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-primary)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
          >
            Go Home
          </button>

          <button
            onClick={onReset}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
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
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

