/**
 * Checkout Handler Utilities
 * Reusable logic for checkout flow across components
 */

import { useToast } from '@/lib/contexts/ToastContext';

/**
 * Custom hook for handling checkout
 * Can be used in any component that needs upgrade functionality
 */
export function useCheckout() {
  const toast = useToast();

  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (!data.checkout_url) {
        throw new Error('No checkout URL returned');
      }

      // Redirect to Dodo checkout
      window.location.href = data.checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to start checkout. Please try again.'
      );
    }
  };

  return { handleCheckout };
}
