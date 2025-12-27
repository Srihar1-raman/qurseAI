/**
 * Dodo Payments Checkout API Route
 * Creates checkout session for Pro subscription using official SDK
 */

import { NextResponse } from 'next/server';
import { dodoClient, getProductId } from '@/lib/dodo-client';
import { createScopedLogger } from '@/lib/utils/logger';
import { getUserData } from '@/lib/supabase/auth-utils';
import { isProUser } from '@/lib/services/subscription';

const logger = createScopedLogger('api/payments/checkout');

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
    // Stage 3: Validate Dodo client
    // ============================================
    if (!dodoClient) {
      logger.error('Dodo Payments client not initialized');
      return NextResponse.json(
        { error: 'Payment service configuration error' },
        { status: 500 }
      );
    }

    // ============================================
    // Stage 4: Create checkout session using SDK
    // ============================================
    const productId = getProductId();
    const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL || 'https://www.qurse.site/checkout/success';

    logger.info('Creating checkout session', {
      userId: lightweightUser.userId,
      productId,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT,
    });

    // Use Dodo SDK to create checkout session (enables discount codes + billing forms)
    const response = await dodoClient.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        }
      ],
      customer: {
        email: fullUser.email || '',
        name: fullUser.user_metadata?.full_name ||
              fullUser.user_metadata?.name ||
              fullUser.email?.split('@')[0] ||
              'User',
      },
      billing_currency: 'USD',
      feature_flags: {
        allow_discount_code: true, // ENABLE DISCOUNT CODES
      },
      show_saved_payment_methods: true,
      return_url: returnUrl,
      metadata: {
        user_id: lightweightUser.userId,
        environment: process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode',
        source: 'qurse',
      },
    });

    if (!response.checkout_url) {
      logger.error('No checkout URL returned from Dodo');
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    // ============================================
    // Stage 5: Return checkout URL
    // ============================================
    logger.info('Checkout session created', {
      userId: lightweightUser.userId,
      checkoutUrl: response.checkout_url,
      duration: Date.now() - requestStartTime,
    });

    return NextResponse.json({
      checkout_url: response.checkout_url,
    });

  } catch (error) {
    logger.error('Checkout creation failed', error, {
      duration: Date.now() - requestStartTime,
    });

    return NextResponse.json(
      {
        error: 'Failed to create checkout session. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
