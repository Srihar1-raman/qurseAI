/**
 * Dodo Payments Customer Portal API Route
 * Creates customer portal session for subscription management
 */

import { NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { createScopedLogger } from '@/lib/utils/logger';
import { getUserSubscription } from '@/lib/services/subscription';

const logger = createScopedLogger('api/payments/customer-portal');

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY;
const DODO_ENVIRONMENT = process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode';

export async function GET() {
  try {
    // ============================================
    // Stage 1: Authentication check
    // ============================================
    const { lightweightUser } = await getUserData();

    if (!lightweightUser) {
      logger.warn('Customer portal requested by unauthenticated user');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // ============================================
    // Stage 2: Get subscription with Dodo customer ID
    // ============================================
    const subscription = await getUserSubscription(lightweightUser.userId);

    if (!subscription || !subscription.dodo_customer_id) {
      logger.warn('Customer portal requested without Dodo customer', {
        userId: lightweightUser.userId,
        hasSubscription: !!subscription,
        hasDodoCustomerId: !!subscription?.dodo_customer_id,
      });
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // ============================================
    // Stage 3: Validate configuration
    // ============================================
    if (!DODO_API_KEY) {
      logger.error('DODO_PAYMENTS_API_KEY not configured');
      return NextResponse.json(
        { error: 'Payment service configuration error' },
        { status: 500 }
      );
    }

    // ============================================
    // Stage 4: Create portal session
    // ============================================
    // Dodo Payments customer portal URL format
    const portalUrl = `https://app.dodopayments.com/customer-portal?customer_id=${subscription.dodo_customer_id}`;

    logger.info('Customer portal session created', {
      userId: lightweightUser.userId,
      customerId: subscription.dodo_customer_id,
    });

    // Return portal URL
    return NextResponse.json({
      portal_url: portalUrl,
    });

  } catch (error) {
    logger.error('Customer portal request failed', error);

    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
