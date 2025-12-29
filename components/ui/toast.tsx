'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import type { Toast, ToastVariant } from '@/lib/contexts/ToastContext';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { cn } from '@/lib/utils';

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

/**
 * Toast Component
 * Individual toast notification display
 * Theme-aware with colored borders
 */
export function ToastComponent({ toast, onDismiss }: ToastProps) {
  const { resolvedTheme, mounted } = useTheme();

  // Auto-dismiss when duration expires
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  const getBorderColor = (variant: ToastVariant): string => {
    switch (variant) {
      case 'success':
        return '#10a37f'; // green (using primary color)
      case 'error':
        return '#ef4444'; // red
      case 'warning':
        return '#f59e0b'; // amber
      case 'info':
        return '#3b82f6'; // blue
      default:
        return 'var(--color-border)';
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'min-w-[300px] max-w-[500px] rounded-lg border shadow-lg',
        'p-4 flex items-start gap-3',
        'animate-in slide-in-from-right-full',
        'bg-[var(--color-bg)]',
        'border-[var(--color-border)]',
        'text-[var(--color-text)]'
      )}
      style={{
        borderColor: getBorderColor(toast.variant),
      }}
    >
      {/* Message */}
      <div className="flex-1 text-sm text-[var(--color-text)]">
        {toast.message}
      </div>

      {/* Dismiss Button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors p-1"
        aria-label="Dismiss notification"
      >
        <Image
          src={getIconPath('cross', resolvedTheme, false, mounted)}
          alt="Close"
          width={16}
          height={16}
        />
      </button>
    </div>
  );
}

