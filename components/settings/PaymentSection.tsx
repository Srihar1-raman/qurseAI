'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
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

export default function PaymentSection() {
  const router = useRouter();
  const { user: authUser, isProUser } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Settings page is protected - guests are redirected before reaching here
  const userState: UserState = useMemo(() => {
    if (isProUser) {
      return { isGuest: false, isFree: false, isPro: true, userId: authUser?.id || null };
    }
    return { isGuest: false, isFree: true, isPro: false, userId: authUser?.id || null };
  }, [authUser, isProUser]);

  const handleFreeContinue = () => {
    router.push('/');
  };

  const handleProUpgrade = () => {
    router.push('/payment');
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      // TODO: Implement cancel subscription API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
      setShowCancelModal(false);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  // ========== PRO USER: Billing Management UI ==========
  if (userState.isPro) {
    return (
      <div className="settings-section">
        <h2>Payment & Billing</h2>

        {/* Plan Status */}
        <div className="settings-group">
          <label className="settings-label">Plan Status</label>
          <div className="account-info">
            <div className="account-details">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h4>Pro Plan</h4>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: 'rgba(16, 163, 127, 0.1)',
                  color: 'rgb(16, 163, 127)'
                }}>
                  Active
                </span>
              </div>
              <p className="settings-description">$9/month • Unlimited messages</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="settings-group">
          <label className="settings-label">Payment Method</label>
          <div className="account-info">
            <div className="account-details">
              <h4>No payment method on file</h4>
              <p className="settings-description">Payment method will be added when subscription is created</p>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="settings-group">
          <label className="settings-label">Billing History</label>
          <div className="account-info">
            <div className="account-details">
              <p className="settings-description">No billing history available</p>
            </div>
          </div>
        </div>

        {/* Subscription Actions */}
        <div className="settings-group">
          <label className="settings-label">Subscription</label>
          <UnifiedButton
            variant="danger"
            onClick={() => setShowCancelModal(true)}
          >
            Cancel Subscription
          </UnifiedButton>
        </div>

        {/* Cancel Subscription Modal */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          preventClose={isCancelling}
        >
          <h3 className="modal-title danger">
            Cancel Subscription
          </h3>

          <p className="modal-text">
            Are you sure you want to cancel your Pro subscription?
          </p>

          <ul className="modal-list">
            <li>You'll lose access to Pro features at the end of your billing period</li>
            <li>Your account will revert to the Free plan</li>
            <li>You can upgrade again anytime</li>
          </ul>

          <p className="modal-warning">
            This action cannot be undone.
          </p>

          <div className="modal-actions">
            <UnifiedButton
              variant="secondary"
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling}
            >
              Keep Pro
            </UnifiedButton>
            <UnifiedButton
              variant="danger"
              onClick={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
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


