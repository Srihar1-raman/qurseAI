/**
 * Dodo Payments Customer Portal API Route
 * Creates customer portal session for subscription management using official SDK
 *
 * Reference: https://docs.dodopayments.com/features/customer-portal
 */

import { NextResponse } from 'next/server';
import { dodoClient } from '@/lib/dodo-client';
import { getUserData } from '@/lib/supabase/auth-utils';
import { createScopedLogger } from '@/lib/utils/logger';
import { getUserSubscription } from '@/lib/services/subscription';

const logger = createScopedLogger('api/payments/customer-portal');

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
    // Stage 4: Create portal session using SDK
    // ============================================
    // Use Dodo SDK to generate authenticated session link (valid for 24 hours)
    // Reference: https://docs.dodopayments.com/api-reference/customers/create-customer-portal-session
    const response = await dodoClient.customers.customerPortal.create(
      subscription.dodo_customer_id,
      {}
    );

    // Extract portal URL from response
    // SDK returns { link: string } or { url: string }
    const portalUrl = (response as any).link || (response as any).url || (response as any).portal_url || '';

    if (!portalUrl) {
      logger.error('No portal URL returned from Dodo SDK', { response });
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      );
    }

    logger.info('Customer portal session created', {
      userId: lightweightUser.userId,
      customerId: subscription.dodo_customer_id,
      portalUrl,
    });

    // Return portal URL for redirect
    return NextResponse.json({
      portal_url: portalUrl,
    });

  } catch (error) {
    logger.error('Customer portal request failed', error);

    return NextResponse.json(
      {
        error: 'Failed to create portal session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
