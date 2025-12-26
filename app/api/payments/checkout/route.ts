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
    // Stage 4: Call Dodo Payments API
    // ============================================
    const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL || 'https://www.qurse.site/checkout/success';
    const cancelUrl = process.env.DODO_PAYMENTS_CANCEL_URL || 'https://www.qurse.site/checkout/cancelled';

    logger.debug('Creating Dodo checkout session', {
      userId: lightweightUser.userId,
      productId: DODO_PRODUCT_ID,
      environment: DODO_ENVIRONMENT,
    });

    // Call Dodo Payments API to create checkout session (recommended method)
    // Use test for test_mode, live for live_mode
    const baseUrl = DODO_ENVIRONMENT === 'test_mode'
      ? 'https://test.dodopayments.com'
      : 'https://live.dodopayments.com';

    // Prepare checkout session request
    const checkoutSessionRequest = {
      product_cart: [{
        product_id: DODO_PRODUCT_ID,
        quantity: 1,
      }],
      customer: {
        email: fullUser.email || '',
        name: fullUser.user_metadata?.full_name || fullUser.user_metadata?.name || '',
      },
      metadata: {
        user_id: lightweightUser.userId,
        environment: DODO_ENVIRONMENT,
      },
      success_url: returnUrl,
      cancel_url: cancelUrl,
    };

    const dodoResponse = await fetch(`${baseUrl}/v1/checkout-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutSessionRequest),
    });

    if (!dodoResponse.ok) {
      const errorText = await dodoResponse.text();
      logger.error('Dodo Payments API error', {
        status: dodoResponse.status,
        error: errorText,
        userId: lightweightUser.userId,
      });
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    const checkoutData = await dodoResponse.json();

    logger.info('Checkout session created', {
      userId: lightweightUser.userId,
      checkoutUrl: checkoutData.checkout_url || checkoutData.url,
      subscriptionId: checkoutData.id,
      duration: Date.now() - requestStartTime,
    });

    // ============================================
    // Stage 5: Return checkout URL
    // ============================================
    return NextResponse.json({
      checkout_url: checkoutData.checkout_url || checkoutData.url,
      subscription_id: checkoutData.id,
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
