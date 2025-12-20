'use client';

import React from 'react';
import { PricingCardWrapper } from './PricingCardWrapper';
import { PricingCardHeader } from './PricingCardHeader';
import { PricingCardFeatures } from './PricingCardFeatures';
import { PricingCardActions } from './PricingCardActions';
import { FREE_PLAN_FEATURES } from './constants';
import type { UserState } from './types';

interface FreePlanCardProps {
  userState: UserState;
  onContinue: () => void;
}

export function FreePlanCard({ userState, onContinue }: FreePlanCardProps) {
  const callbackUrl = React.useMemo(() => {
    return encodeURIComponent('/pricing');
  }, []);

  const isCurrentPlan = userState.isFree;
  const isDisabled = userState.isPro;
  const buttonText = isCurrentPlan ? 'Current Plan' : 'Continue';

  return (
    <PricingCardWrapper
      isCurrentPlan={isCurrentPlan}
      isDisabled={isDisabled}
      backgroundImage="/images/freeimg.jpeg"
    >
      <PricingCardHeader title="FREE" pricing="$0/month" />
      <PricingCardFeatures features={FREE_PLAN_FEATURES} />
      <PricingCardActions
        userState={userState}
        isCurrentPlan={isCurrentPlan}
        isDisabled={isDisabled}
        buttonText={buttonText}
        onAction={onContinue}
        callbackUrl={callbackUrl}
      />
    </PricingCardWrapper>
  );
}

