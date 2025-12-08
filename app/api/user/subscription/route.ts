/**
 * User Subscription API Route
 * Returns Pro subscription status for the authenticated user
 * 
 * Note: Uses getUserData() which already computes Pro status via isProUser()
 * This is efficient because getUserData() uses React cache() for deduplication
 */

import { NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('api/user/subscription');

export async function GET() {
  try {
    const { lightweightUser } = await getUserData();
    
    if (!lightweightUser) {
      // Guest user - not Pro
      return NextResponse.json({ isPro: false });
    }
    
    // Pro status already computed in getUserData() via isProUser()
    // getUserData() uses React cache() so this is efficient even if called multiple times
    return NextResponse.json({ isPro: lightweightUser.isProUser });
  } catch (error) {
    logger.error('Error fetching subscription status', error);
    // Fail secure - return false on error
    return NextResponse.json({ isPro: false });
  }
}

