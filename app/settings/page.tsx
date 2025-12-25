import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createScopedLogger } from '@/lib/utils/logger';
import { getCachedUser } from '@/lib/supabase/auth-utils';
import SettingsPageClient from './SettingsPageClient';
import { SettingsPageSkeleton } from '@/components/ui/SettingsPageSkeleton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Qurse - Settings',
  description: 'AI Chat Platform for the fastest',
};

const logger = createScopedLogger('settings/page');

export default async function SettingsPage() {
  // Server-side auth check (defense in depth - middleware already protected this route)
  try {
    const { user, error } = await getCachedUser();

    // Redirect if auth check failed or user is not authenticated
    if (error || !user) {
      if (error) {
        logger.warn('Auth error during settings page access check', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      redirect('/');
    }

    // User is authenticated - render settings page
    return (
      <Suspense fallback={<SettingsPageSkeleton />}>
        <SettingsPageClient />
      </Suspense>
    );
  } catch (error) {
    // Fail-secure: Redirect on unexpected errors (prevents page crash)
    logger.error('Unexpected error in settings page', error);
    redirect('/');
  }
}
