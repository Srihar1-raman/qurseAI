/**
 * User Billing History API Route
 * Returns payment transaction history for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import { getUserData } from '@/lib/supabase/auth-utils';

const logger = createScopedLogger('api/user/billing-history');

export async function GET(request: NextRequest) {
  try {
    // ============================================
    // Stage 1: Authenticate user
    // ============================================
    const { lightweightUser } = await getUserData();

    if (!lightweightUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // ============================================
    // Stage 2: Fetch billing history
    // ============================================
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', lightweightUser.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('Error fetching billing history', error, {
        userId: lightweightUser.userId,
      });
      throw error;
    }

    logger.debug('Billing history fetched', {
      userId: lightweightUser.userId,
      count: data?.length || 0,
    });

    return NextResponse.json({ transactions: data || [] });

  } catch (error) {
    logger.error('Billing history API failed', error);

    return NextResponse.json(
      { error: 'Failed to fetch billing history', transactions: [] },
      { status: 500 }
    );
  }
}
