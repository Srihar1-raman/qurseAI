/**
 * Subscription Access Service - Pure Business Logic
 *
 * Responsibilities:
 * - Calculate subscription access (testable, no side effects)
 * - Grace period logic
 * - Access determination rules
 * - NO database operations (pure functions)
 *
 * Design principles:
 * - All functions are pure (same input = same output)
 * - No side effects (no DB, no logging, no external calls)
 * - Easy to test with unit tests
 * - Type-safe with strict return types
 */

import type { Subscription } from '@/lib/types';

/**
 * Subscription access calculation result
 * Pure function return type with detailed access information
 */
export interface SubscriptionAccessResult {
  hasAccess: boolean;
  reason: 'active' | 'grace_period' | 'expired' | 'no_subscription' | 'free_plan' | 'trial' | 'trial_expired';
  plan: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  expiresAt?: string; // When access ends (for grace period)
  timeRemaining?: number; // Milliseconds until expiration
  isInGracePeriod: boolean;
}

/**
 * Calculate subscription access with grace period support
 *
 * This is the CORE LOGIC function that determines if a user has Pro access.
 * It implements the grace period: cancelled users keep access until next_billing_at.
 *
 * Logic:
 * 1. No subscription → No access
 * 2. Free plan → No Pro access
 * 3. Active Pro plan → Check if period ended
 * 4. Cancelled Pro plan → Check if in grace period (before next_billing_at)
 * 5. Expired/Trial → No Pro access
 *
 * @param subscription - Subscription object (can be null)
 * @param currentTime - Current time (for testing, defaults to Date.now())
 * @returns SubscriptionAccessResult with detailed access information
 */
export function calculateSubscriptionAccess(
  subscription: Subscription | null,
  currentTime: number = Date.now()
): SubscriptionAccessResult {
  // Case 1: No subscription
  if (!subscription) {
    return {
      hasAccess: false,
      reason: 'no_subscription',
      plan: 'free',
      status: 'active',
      isInGracePeriod: false,
    };
  }

  const now = new Date(currentTime);
  const nextBillingAt = subscription.next_billing_at
    ? new Date(subscription.next_billing_at)
    : null;

  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  // Case 2: Free plan → No Pro access
  if (subscription.plan === 'free') {
    return {
      hasAccess: false,
      reason: 'free_plan',
      plan: 'free',
      status: subscription.status,
      isInGracePeriod: false,
    };
  }

  // Case 3: Pro plan - check status and dates
  if (subscription.plan === 'pro') {
    // Case 3a: Active subscription
    if (subscription.status === 'active') {
      // Check if subscription period has ended
      // Priority: next_billing_at (from Dodo) > current_period_end (legacy)
      const periodEnd = nextBillingAt || currentPeriodEnd;

      if (periodEnd && periodEnd < now) {
        // Period ended → No access (should be expired, but check anyway)
        return {
          hasAccess: false,
          reason: 'expired',
          plan: 'pro',
          status: 'active',
          isInGracePeriod: false,
          expiresAt: periodEnd.toISOString(),
          timeRemaining: 0,
        };
      }

      // Active and within period → Has access
      const timeRemaining = periodEnd ? periodEnd.getTime() - now.getTime() : null;

      return {
        hasAccess: true,
        reason: 'active',
        plan: 'pro',
        status: 'active',
        isInGracePeriod: false,
        expiresAt: periodEnd?.toISOString(),
        timeRemaining: timeRemaining ?? undefined,
      };
    }

    // Case 3b: Cancelled subscription - GRACE PERIOD LOGIC
    if (subscription.status === 'cancelled') {
      // Use next_billing_at as primary source of truth (from Dodo)
      // Fall back to current_period_end if next_billing_at missing (legacy)
      const gracePeriodEnd = nextBillingAt || currentPeriodEnd;

      if (!gracePeriodEnd) {
        // No end date → No access (shouldn't happen, but handle defensively)
        return {
          hasAccess: false,
          reason: 'expired',
          plan: 'pro',
          status: 'cancelled',
          isInGracePeriod: false,
        };
      }

      const timeRemaining = gracePeriodEnd.getTime() - now.getTime();

      if (gracePeriodEnd > now) {
        // Grace period active → Has access
        return {
          hasAccess: true,
          reason: 'grace_period',
          plan: 'pro',
          status: 'cancelled',
          isInGracePeriod: true,
          expiresAt: gracePeriodEnd.toISOString(),
          timeRemaining,
        };
      }

      // Grace period ended → No access
      return {
        hasAccess: false,
        reason: 'expired',
        plan: 'pro',
        status: 'cancelled',
        isInGracePeriod: false,
        expiresAt: gracePeriodEnd.toISOString(),
        timeRemaining: 0,
      };
    }

    // Case 3c: Trial subscription - check trial period
    if (subscription.status === 'trial') {
      const trialEnd = nextBillingAt || currentPeriodEnd;

      if (!trialEnd) {
        // No end date → No access (shouldn't happen, but handle defensively)
        return {
          hasAccess: false,
          reason: 'trial_expired',
          plan: 'pro',
          status: 'trial',
          isInGracePeriod: false,
        };
      }

      const timeRemaining = trialEnd.getTime() - now.getTime();

      if (trialEnd > now) {
        // Trial period active → Has access
        return {
          hasAccess: true,
          reason: 'trial',
          plan: 'pro',
          status: 'trial',
          isInGracePeriod: false,
          expiresAt: trialEnd.toISOString(),
          timeRemaining,
        };
      }

      // Trial period ended → No access
      return {
        hasAccess: false,
        reason: 'trial_expired',
        plan: 'pro',
        status: 'trial',
        isInGracePeriod: false,
        expiresAt: trialEnd.toISOString(),
        timeRemaining: 0,
      };
    }

    // Case 3d: Expired → No Pro access
    return {
      hasAccess: false,
      reason: 'expired',
      plan: 'pro',
      status: subscription.status,
      isInGracePeriod: false,
    };
  }

  // Fallback: Should never reach here
  return {
    hasAccess: false,
    reason: 'free_plan',
    plan: 'free',
    status: 'active',
    isInGracePeriod: false,
  };
}

/**
 * Check if subscription is in grace period
 * Convenience wrapper around calculateSubscriptionAccess
 */
export function isInGracePeriod(
  subscription: Subscription | null,
  currentTime: number = Date.now()
): boolean {
  const result = calculateSubscriptionAccess(subscription, currentTime);
  return result.isInGracePeriod;
}

/**
 * Get time remaining in subscription
 * Returns milliseconds until expiration, or 0 if expired
 */
export function getTimeRemaining(
  subscription: Subscription | null,
  currentTime: number = Date.now()
): number {
  const result = calculateSubscriptionAccess(subscription, currentTime);
  return result.timeRemaining ?? 0;
}

/**
 * Simplified check for Pro access (backward compatible)
 * Returns true if user has Pro access (including grace period)
 */
export function hasProAccess(
  subscription: Subscription | null,
  currentTime: number = Date.now()
): boolean {
  return calculateSubscriptionAccess(subscription, currentTime).hasAccess;
}
