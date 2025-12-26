/**
 * User Subscription Details API Route
 * Returns full subscription details including payment metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { getUserSubscription } from '@/lib/services/subscription';

const logger = createScopedLogger('api/user/subscription-details');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(subscription);

  } catch (error) {
    logger.error('Error fetching subscription details', error);

    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
}
