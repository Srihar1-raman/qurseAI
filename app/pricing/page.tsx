import { getUserData } from '@/lib/supabase/auth-utils';
import PricingPageClient from './PricingPageClient';
import { createScopedLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const logger = createScopedLogger('pricing/page');

export default async function PricingPage() {
  try {
    // Get user data to determine user state (guest/free/pro)
    const { lightweightUser } = await getUserData();
    
    const userState = {
      isGuest: !lightweightUser,
      isFree: lightweightUser ? !lightweightUser.isProUser : false,
      isPro: lightweightUser?.isProUser ?? false,
      userId: lightweightUser?.userId || null,
    };

    return <PricingPageClient userState={userState} />;
  } catch (error) {
    logger.error('Error loading pricing page', error);
    // On error, treat as guest (fail open)
    return (
      <PricingPageClient 
        userState={{ isGuest: true, isFree: false, isPro: false, userId: null }} 
      />
    );
  }
}

