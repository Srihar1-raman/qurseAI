'use client';

import { useNavigation } from '@/lib/contexts/NavigationContext';
import { SettingsPageSkeleton } from '@/components/ui/SettingsPageSkeleton';
import { InfoPageSkeleton } from '@/components/ui/InfoPageSkeleton';
import { ConversationPageSkeleton } from '@/components/ui/ConversationPageSkeleton';
import type { ReactNode } from 'react';

interface NavigationWrapperProps {
  children: ReactNode;
}

/**
 * NavigationWrapper - Shows loading skeleton optimistically during navigation
 * Wraps children and intercepts rendering when navigation is in progress
 */
export function NavigationWrapper({ children }: NavigationWrapperProps) {
  const { isNavigating, targetRoute } = useNavigation();

  // Show skeleton if navigating
  if (isNavigating && targetRoute) {
    // Exact match first, then prefix match (more precise matching)
    if (
      targetRoute === '/settings' ||
      targetRoute.startsWith('/settings/') ||
      targetRoute.startsWith('/settings?')
    ) {
      return <SettingsPageSkeleton />;
    }

    if (
      targetRoute === '/info' ||
      targetRoute.startsWith('/info/') ||
      targetRoute.startsWith('/info?')
    ) {
      return <InfoPageSkeleton />;
    }

    // Conversation routes (exact pattern match)
    if (targetRoute.startsWith('/conversation/')) {
      return <ConversationPageSkeleton />;
    }

    // For homepage, show children normally (homepage is instant)
  }

  // Normal rendering (when not navigating, or navigating to homepage which is instant)
  return <>{children}</>;
}

