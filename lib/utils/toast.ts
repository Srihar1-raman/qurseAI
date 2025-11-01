/**
 * Toast Utility Functions
 * Simple API for showing toast notifications
 * 
 * Note: These functions require the ToastProvider to be mounted.
 * Import and use directly in components via useToast() hook for type safety.
 */

import { useToast as useToastContext } from '@/lib/contexts/ToastContext';

/**
 * Re-export useToast hook for convenience
 */
export { useToastContext as useToast };

/**
 * Toast utility object for programmatic access
 * Note: Must be used within a component that has ToastProvider in the tree
 */
export const toast = {
  success: (message: string, duration?: number) => {
    // This will be called from components that have access to useToast
    // The actual implementation is in the hook
    throw new Error('toast.success() must be called from within a component using useToast() hook');
  },
  error: (message: string, duration?: number) => {
    throw new Error('toast.error() must be called from within a component using useToast() hook');
  },
  warning: (message: string, duration?: number) => {
    throw new Error('toast.warning() must be called from within a component using useToast() hook');
  },
  info: (message: string, duration?: number) => {
    throw new Error('toast.info() must be called from within a component using useToast() hook');
  },
};

