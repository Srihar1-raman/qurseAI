'use client';

import { useToast } from '@/lib/contexts/ToastContext';

export default function TestToastPage() {
  const { success, error, warning, info } = useToast();

  return (
    <div style={{
      padding: '40px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ marginBottom: '24px', fontSize: '32px' }}>Toast Notification Test</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <button
          onClick={() => success('This is a success message!')}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#10a37f',
            color: 'white',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Success Toast
        </button>

        <button
          onClick={() => error('This is an error message!')}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#ef4444',
            color: 'white',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Error Toast
        </button>

        <button
          onClick={() => warning('This is a warning message!')}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#f59e0b',
            color: 'white',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Warning Toast
        </button>

        <button
          onClick={() => info('This is an info message!')}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#3b82f6',
            color: 'white',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Info Toast
        </button>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
      }}>
        <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>Test Multiple Toasts</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              success('First toast');
              setTimeout(() => error('Second toast'), 500);
              setTimeout(() => warning('Third toast'), 1000);
              setTimeout(() => info('Fourth toast'), 1500);
            }}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            Show All 4 Toasts
          </button>

          <button
            onClick={() => {
              success('Short');
              error('Medium length message');
              warning('This is a much longer warning message to test wrapping');
              info('Another medium info notification');
            }}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            Different Lengths
          </button>
        </div>
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: '8px',
        fontSize: '14px',
        color: 'var(--color-text-secondary)',
        lineHeight: '1.6',
      }}>
        <strong>Border Thickness:</strong> Changed from 2px to 1px for a more subtle appearance.
        <br />
        <strong>Colors:</strong> Green (success), Red (error), Amber (warning), Blue (info)
      </div>
    </div>
  );
}
