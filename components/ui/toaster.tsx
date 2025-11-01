'use client';

import { useToast } from '@/lib/contexts/ToastContext';
import { ToastComponent } from './toast';

/**
 * Toaster Component
 * Container for displaying toast notifications
 * Renders at bottom-right (industry standard position)
 */
export function Toaster() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
        >
          <ToastComponent
            toast={toast}
            onDismiss={dismissToast}
          />
        </div>
      ))}
    </div>
  );
}

