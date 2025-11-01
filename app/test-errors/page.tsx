'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { handleClientError } from '@/lib/utils/error-handler';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Error Throwing Component
 * Throws error when shouldThrow is true (for error boundary test)
 */
function ErrorThrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('This is a test error to trigger the error boundary. Click "Try Again" to go back.');
  }
  return null;
}

/**
 * Error Handling Test Page
 * Test different error handling scenarios
 */
export default function TestErrorsPage() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { error: showToastError, warning: showToastWarning, success: showToastSuccess, info: showToastInfo } = useToast();

  const triggerToastError = () => {
    const error = new Error('This is a test error with sensitive info: API key sk-1234567890 is invalid');
    const userMessage = handleClientError(error, 'test-errors/toast');
    showToastError(userMessage);
  };

  const triggerSanitizedError = () => {
    // Simulate error with sensitive info
    const error = new Error('API key sk-1234567890abcdef is invalid in /app/api/chat/route.ts:42');
    const userMessage = handleClientError(error, 'test-errors/sanitized');
    showToastError(userMessage);
  };

  const triggerDatabaseError = () => {
    const error = new Error('PostgreSQL error: relation "conversations" does not exist');
    const userMessage = handleClientError(error, 'test-errors/database');
    showToastError(userMessage);
  };

  const triggerNetworkError = () => {
    const error = new Error('ECONNREFUSED 127.0.0.1:5432');
    const userMessage = handleClientError(error, 'test-errors/network');
    showToastError(userMessage);
  };

  const triggerValidationError = () => {
    const error = new Error('Validation failed: Invalid input data');
    const userMessage = handleClientError(error, 'test-errors/validation');
    showToastError(userMessage);
  };

  const triggerErrorBoundary = () => {
    // Trigger error boundary by throwing an error
    // This will be caught by the ErrorBoundary in app/layout.tsx
    throw new Error('This is a test error to trigger the error boundary. Click "Try Again" to go back.');
  };

  const triggerComplexError = () => {
    const error = new Error('Failed to process request in /Users/sri/Desktop/qurse/app/api/chat/route.ts at line 42. Stack trace: at Object.<anonymous> (/app/api/chat/route.ts:42:15)');
    const userMessage = handleClientError(error, 'test-errors/complex');
    showToastError(userMessage);
  };

  return (
    <div className="homepage-container">
      <Header 
        user={user}
        showNewChatButton={true}
        onNewChatClick={() => router.push('/')}
      />
      
      <main 
        className="flex-1 flex flex-col justify-center items-center px-5 py-10 max-w-2xl mx-auto w-full"
      >
        <div style={{ 
          width: '100%', 
          maxWidth: '700px',
          padding: '2rem',
          background: 'var(--color-bg)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--color-text)',
          }}>
            🧪 Error Handling Test Page
          </h1>
          
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--color-text-secondary)',
            marginBottom: '2rem',
          }}>
            Click buttons below to test different error handling scenarios. Watch the bottom-right corner for toast notifications.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {/* Sanitization Tests */}
            <div style={{
              padding: '1rem',
              background: 'var(--color-bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              marginBottom: '0.5rem',
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--color-text)',
              }}>
                Sanitization Tests
              </h2>
              <p style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                marginBottom: '12px',
              }}>
                These tests show how errors are cleaned up before showing to users.
              </p>

              <button
                onClick={triggerSanitizedError}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  marginBottom: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                Test: Error with API Key & File Path
              </button>

              <button
                onClick={triggerComplexError}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                Test: Error with Stack Trace & Paths
              </button>
            </div>

            {/* Error Type Tests */}
            <div style={{
              padding: '1rem',
              background: 'var(--color-bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              marginBottom: '0.5rem',
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--color-text)',
              }}>
                Error Type Tests
              </h2>
              <p style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                marginBottom: '12px',
              }}>
                These tests show how different error types are handled.
              </p>

              <button
                onClick={triggerDatabaseError}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  marginBottom: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                Test: Database Error
              </button>

              <button
                onClick={triggerNetworkError}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  marginBottom: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                Test: Network Error
              </button>

              <button
                onClick={triggerValidationError}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                Test: Validation Error
              </button>
            </div>

            {/* Error Boundary Test */}
            <div style={{
              padding: '1rem',
              background: 'var(--color-bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              marginBottom: '0.5rem',
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--color-text)',
              }}>
                Error Boundary Test
              </h2>
              <p style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                marginBottom: '12px',
              }}>
                This will trigger a component crash to test the error boundary.
              </p>

              <ErrorBoundary>
                <ErrorThrower shouldThrow={shouldThrow} />
              </ErrorBoundary>
              
              <button
                onClick={() => {
                  // Trigger error boundary by setting state
                  setShouldThrow(true);
                }}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '2px solid #ef4444',
                  background: 'var(--color-bg)',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)';
                  e.currentTarget.style.color = '#ef4444';
                }}
              >
                ⚠️ Trigger Error Boundary (Shows Error Page)
              </button>
            </div>

            {/* Toast Type Tests */}
            <div style={{
              padding: '1rem',
              background: 'var(--color-bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--color-text)',
              }}>
                Toast Notification Types
              </h2>
              <p style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                marginBottom: '12px',
              }}>
                Test different toast notification types.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}>
                <button
                  onClick={() => showToastSuccess('Operation completed successfully!')}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  Success Toast
                </button>

                <button
                  onClick={() => showToastError('This is an error message')}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  Error Toast
                </button>

                <button
                  onClick={() => showToastWarning('This is a warning message')}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  Warning Toast
                </button>

                <button
                  onClick={() => showToastInfo('This is an info message')}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  Info Toast
                </button>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'var(--color-bg-hover)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}>
            <p style={{ margin: 0, marginBottom: '8px' }}>
              <strong>What to Watch:</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Toasts appear at the <strong>bottom-right corner</strong></li>
              <li>Error messages are <strong>sanitized</strong> (no sensitive info)</li>
              <li>Error boundary shows a <strong>nice error page</strong> (not blank screen)</li>
              <li>Toasts have <strong>colored borders</strong> (green, red, yellow, blue)</li>
              <li>Error page has <strong>"Go Home"</strong> and <strong>"Try Again"</strong> buttons</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

