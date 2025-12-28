'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { FreePlanCard } from '@/components/pricing/FreePlanCard';
import { ProPlanCard } from '@/components/pricing/ProPlanCard';
import { UnifiedButton } from '@/components/ui/UnifiedButton';
import { Modal } from '@/components/ui/Modal';
import '@/styles/components/pricing.css';

interface UserState {
  isGuest: boolean;
  isFree: boolean;
  isPro: boolean;
  userId: string | null;
}

interface Subscription {
  id: string;
  plan: 'free' | 'pro';
  status: string;
  current_period_end?: string;
  next_billing_at?: string;
  last_payment_at?: string;
  cancelled_at?: string;
  dodo_customer_id?: string;
}

interface PaymentTransaction {
  id: string;
  event_type: string;
  amount?: number;
  currency?: string;
  status: string;
  created_at: string;
}

export default function PaymentSection() {
  const router = useRouter();
  const { user: authUser, isProUser } = useAuth();
  const { error: showToastError, success: showToastSuccess } = useToast();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // Settings page is protected - guests are redirected before reaching here
  const userState: UserState = useMemo(() => {
    if (isProUser) {
      return { isGuest: false, isFree: false, isPro: true, userId: authUser?.id || null };
    }
    return { isGuest: false, isFree: true, isPro: false, userId: authUser?.id || null };
  }, [authUser, isProUser]);

  // Fetch subscription details for Pro users
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<PaymentTransaction[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (userState.isPro && userState.userId) {
      setIsLoadingDetails(true);

      // Fetch subscription details and billing history in parallel
      Promise.all([
        fetch(`/api/user/subscription-details?userId=${userState.userId}`),
        fetch('/api/user/billing-history'),
      ])
        .then(([subResponse, historyResponse]) => {
          if (subResponse.ok) {
            return Promise.all([
              subResponse.json(),
              historyResponse.ok ? historyResponse.json() : Promise.resolve({ transactions: [] }),
            ]);
          }
          throw new Error('Failed to fetch subscription details');
        })
        .then(([subData, historyData]) => {
          setSubscription(subData);
          setBillingHistory(historyData.transactions || []);
        })
        .catch((err) => {
          console.error('Error fetching subscription details:', err);
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [userState.isPro, userState.userId]);

  const handleFreeContinue = () => {
    router.push('/');
  };

  const handleProUpgrade = async () => {
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

      window.location.href = data.checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      showToastError(
        error instanceof Error
          ? error.message
          : 'Failed to start checkout. Please try again.'
      );
    }
  };

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch('/api/payments/customer-portal');

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const data = await response.json();

      if (!data.portal_url) {
        throw new Error('No portal URL returned');
      }

      window.open(data.portal_url, '_blank');
    } catch (error) {
      console.error('Portal error:', error);
      showToastError('Failed to open subscription portal. Please try again later.');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      // Redirect to customer portal (recommended)
      await handleManageSubscription();
      setShowCancelModal(false);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      showToastError('Failed to cancel subscription. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format currency with proper symbol (supports any currency)
  const formatCurrency = (amount: number, currency?: string) => {
    const currencyCode = currency || 'USD';

    // Use Intl.NumberFormat for proper currency formatting
    // This handles any currency code (USD, INR, EUR, GBP, etc.)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'INR' && Number.isInteger(amount / 100) ? 0 : 2,
      maximumFractionDigits: currencyCode === 'INR' && Number.isInteger(amount / 100) ? 0 : 2,
    }).format(amount / 100);
  };

  // ========== PRO USER: Billing Management UI ==========
  if (userState.isPro) {
    return (
      <div className="settings-section">
        <h2>Payment & Billing</h2>

        {/* Plan Status - WITH REAL DATA */}
        <div className="settings-group">
          <label className="settings-label">Plan Status</label>
          <div className="account-info">
            <div className="account-avatar" style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontFamily: 'var(--font-reenie)', fontSize: '32px', fontWeight: 400, margin: 0, lineHeight: 1 }}>
                  Qurse Pro
                </h4>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: subscription?.cancelled_at
                    ? 'rgb(239, 68, 68)'
                    : 'rgb(16, 163, 127)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {subscription?.cancelled_at ? 'Cancelling' : 'Active'}
                </span>
              </div>
            </div>
            <div className="account-details">
              <h4>$9/month</h4>
              {subscription?.cancelled_at && (
                <p className="settings-description" style={{ color: 'rgb(239, 68, 68)' }}>
                  Expires {formatDate(subscription.next_billing_at || subscription.current_period_end || '')}
                </p>
              )}
              {subscription?.next_billing_at && !subscription?.cancelled_at && (
                <p className="settings-description">
                  Next billing: {formatDate(subscription.next_billing_at)}
                </p>
              )}
              {subscription?.last_payment_at && (
                <p className="settings-description">
                  Last payment: {formatDate(subscription.last_payment_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Method - LINK TO PORTAL */}
        <div className="settings-group row">
          <div className="settings-text">
            <label className="settings-label">Payment Method</label>
            <p className="settings-description">
              Update payment method, view invoices, or manage subscription in customer portal
            </p>
          </div>
          <div className="settings-control">
            <UnifiedButton
              variant="secondary"
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
            >
              {isLoadingPortal ? 'Opening...' : 'Manage Subscription'}
            </UnifiedButton>
          </div>
        </div>

        {/* Cancel Subscription */}
        <div className="settings-group row">
          <div className="settings-text">
            <label className="settings-label">Cancel Subscription</label>
            <p className="settings-description" style={{ color: 'var(--color-text-muted)' }}>
              Cancel your subscription and revert to Free plan
            </p>
          </div>
          <div className="settings-control">
            <UnifiedButton
              variant="danger"
              onClick={() => setShowCancelModal(true)}
              disabled={isLoadingPortal}
            >
              Cancel
            </UnifiedButton>
          </div>
        </div>

        {/* Billing History - WITH REAL DATA */}
        <div className="settings-group">
          <label className="settings-label">Billing History</label>
          {isLoadingDetails ? (
            <div className="linked-providers-list">
              <p style={{ color: 'var(--color-text-muted)', padding: '12px 0' }}>Loading billing history...</p>
            </div>
          ) : billingHistory.length === 0 ? (
            <div className="linked-providers-list">
              <p style={{ color: 'var(--color-text-muted)', padding: '12px 0' }}>No billing history available</p>
            </div>
          ) : (
            <div className="linked-providers-list">
              {billingHistory.map((transaction) => (
                <div key={transaction.id} className="provider-item">
                  <div style={{ flex: 1 }}>
                    <span className="provider-name">
                      {transaction.event_type === 'payment.succeeded' ? 'Payment' : 'Subscription'}
                    </span>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {formatDate(transaction.created_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 500 }}>
                      {formatCurrency(transaction.amount || 0, transaction.currency)}
                    </div>
                    <span className={`provider-status ${transaction.status === 'succeeded' ? 'connected' : 'not-connected'}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancel Subscription Modal - UPDATED */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          preventClose={isCancelling || isLoadingPortal}
        >
          <h3 className="modal-title danger">
            Cancel Subscription
          </h3>

          <p className="modal-text">
            You'll be redirected to the Dodo Payments customer portal where you can cancel your subscription.
          </p>

          <ul className="modal-list">
            <li>You'll have access to Pro features until the end of your billing period</li>
            <li>Your account will revert to the Free plan after {subscription?.current_period_end ? formatDate(subscription.current_period_end) : 'the period ends'}</li>
            <li>You can upgrade again anytime</li>
          </ul>

          <p className="modal-warning">
            Alternatively, you can manage your subscription directly in the customer portal.
          </p>

          <div className="modal-actions">
            <UnifiedButton
              variant="secondary"
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling || isLoadingPortal}
            >
              Keep Pro
            </UnifiedButton>
            <UnifiedButton
              variant="primary"
              onClick={handleManageSubscription}
              disabled={isCancelling || isLoadingPortal}
            >
              {isLoadingPortal ? 'Opening Portal...' : 'Go to Portal'}
            </UnifiedButton>
          </div>
        </Modal>
      </div>
    );
  }

  // ========== FREE USER: Pricing Cards (Upsell) ==========
  return (
    <div className="settings-section">
      <h2>Payment & Billing</h2>

      {/* Pricing Cards - Compact Layout for Settings */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginTop: '24px',
        }}
      >
        <FreePlanCard userState={userState} onContinue={handleFreeContinue} />

        <ProPlanCard
          userState={userState}
          onUpgrade={handleProUpgrade}
        />
      </div>
    </div>
  );
}
