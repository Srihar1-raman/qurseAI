'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import { FreePlanCard } from '@/components/pricing/FreePlanCard';
import { ProPlanCard } from '@/components/pricing/ProPlanCard';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createScopedLogger } from '@/lib/utils/logger';
import '@/styles/components/pricing.css';

// Lazy load HistorySidebar - only load when sidebar is opened
const HistorySidebar = dynamic(
  () => import('@/components/layout/history/HistorySidebar'),
  { ssr: false }
);

const logger = createScopedLogger('pricing/client');

interface UserState {
  isGuest: boolean;
  isFree: boolean;
  isPro: boolean;
  userId: string | null;
}

interface PricingPageClientProps {
  userState: UserState;
}

export default function PricingPageClient({ userState: initialUserState }: PricingPageClientProps) {
  const router = useRouter();
  const { user: authUser, isProUser } = useAuth();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Determine current user state (client-side auth takes precedence)
  const userState: UserState = React.useMemo(() => {
    if (!authUser) {
      return { isGuest: true, isFree: false, isPro: false, userId: null };
    }
    if (isProUser) {
      return { isGuest: false, isFree: false, isPro: true, userId: authUser.id || null };
    }
    return { isGuest: false, isFree: true, isPro: false, userId: authUser.id || null };
  }, [authUser, isProUser]);

  const handleNewChat = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleFreeContinue = useCallback(() => {
    if (userState.isGuest) {
      // Guest: Show sign-in (handled by card)
      return;
    }
    // Free user: Navigate to homepage
    router.push('/');
  }, [userState.isGuest, router]);

  const handleProUpgrade = useCallback(() => {
    if (userState.isGuest) {
      // Guest: Show sign-in (handled by card)
      return;
    }
    // Authenticated user: Redirect to payment page
    // TODO: Update this URL when dodo payment page is ready
    router.push('/payment');
  }, [userState.isGuest, router]);

  return (
    <div className="homepage-container" style={{ width: '100%', overflowX: 'hidden' }}>
      <Header
        user={authUser || null}
        showHistoryButton={true}
        onHistoryClick={() => setIsHistoryOpen(true)}
        showNewChatButton={true}
        onNewChatClick={handleNewChat}
      />

      <main
        style={{
          minHeight: 'calc(100vh - 200px)',
          paddingTop: 'calc(60px + clamp(40px, 5vw, 60px))', // Header height (60px) + top padding
          paddingBottom: 'clamp(24px, 4vw, 40px)',
          paddingLeft: 'clamp(12px, 2vw, 20px)',
          paddingRight: 'clamp(12px, 2vw, 20px)',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        {/* Page Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 'clamp(24px, 4vw, 40px)',
            padding: '0 16px',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: '12px',
              lineHeight: 1.2,
            }}
          >
            Choose Your Plan
          </h1>
          <p
            style={{
              fontSize: 'clamp(14px, 2vw, 18px)',
              color: 'var(--color-text-secondary)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            Get started with <span className="font-reenie" style={{ fontSize: '39px' }}>Qurse</span>. Choose the plan that fits your needs.
          </p>
        </div>

        {/* Pricing Cards Container */}
        <div className="pricing-cards-container">
          <FreePlanCard
            userState={userState}
            onContinue={handleFreeContinue}
          />
          <ProPlanCard
            userState={userState}
            onUpgrade={handleProUpgrade}
          />
        </div>
      </main>

      {/* History Sidebar */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

