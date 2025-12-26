/**
 * Dodo Payments Checkout API Route
 * Creates checkout session for Pro subscription
 */

import { NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { createScopedLogger } from '@/lib/utils/logger';
import { isProUser } from '@/lib/services/subscription';

const logger = createScopedLogger('api/payments/checkout');

// Dodo Payments configuration
const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY;
const DODO_ENVIRONMENT = process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode';
const DODO_PRODUCT_ID = process.env.DODO_PAYMENTS_PRODUCT_ID || 'pdt_0NUs3ZAn7xAdfHGNlWXW3';

export async function POST() {
  const requestStartTime = Date.now();

  try {
    // ============================================
    // Stage 1: Authentication check
    // ============================================
    const { lightweightUser, fullUser } = await getUserData();

    if (!lightweightUser || !fullUser) {
      logger.warn('Checkout attempted by unauthenticated user');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // ============================================
    // Stage 2: Check existing subscription
    // ============================================
    // Prevent duplicate subscriptions
    const isPro = await isProUser(lightweightUser.userId);

    if (isPro) {
      logger.info('Pro user attempted checkout', { userId: lightweightUser.userId });
      return NextResponse.json(
        { error: 'You already have an active Pro subscription' },
        { status: 400 }
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

    if (!DODO_PRODUCT_ID) {
      logger.error('DODO_PAYMENTS_PRODUCT_ID not configured');
      return NextResponse.json(
        { error: 'Product configuration error' },
        { status: 500 }
      );
    }

    // ============================================
    // Stage 4: Generate Dodo Checkout URL
    // ============================================
    // Dodo uses direct checkout URLs - no API call needed
    const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL || 'https://www.qurse.site/checkout/success';
    const cancelUrl = process.env.DODO_PAYMENTS_CANCEL_URL || 'https://www.qurse.site/checkout/cancelled';

    // Build checkout URL with user metadata
    const checkoutUrl = new URL(`https://checkout.dodopayments.com/${DODO_PRODUCT_ID}`);
    checkoutUrl.searchParams.set('return_url', returnUrl);
    checkoutUrl.searchParams.set('cancel_url', cancelUrl);

    // Add user metadata for webhook
    if (fullUser.email) {
      checkoutUrl.searchParams.set('customer_email', fullUser.email);
    }
    const customerName = fullUser.user_metadata?.full_name || fullUser.user_metadata?.name;
    if (customerName) {
      checkoutUrl.searchParams.set('customer_name', customerName);
    }
    checkoutUrl.searchParams.set('metadata_user_id', lightweightUser.userId);
    checkoutUrl.searchParams.set('metadata_environment', DODO_ENVIRONMENT);

    logger.info('Checkout URL generated', {
      userId: lightweightUser.userId,
      productId: DODO_PRODUCT_ID,
      environment: DODO_ENVIRONMENT,
      checkoutUrl: checkoutUrl.toString(),
      duration: Date.now() - requestStartTime,
    });

    // ============================================
    // Stage 5: Return checkout URL
    // ============================================
    return NextResponse.json({
      checkout_url: checkoutUrl.toString(),
    });

  } catch (error) {
    logger.error('Checkout request failed', error, {
      duration: Date.now() - requestStartTime,
    });

    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    );
  }
}
