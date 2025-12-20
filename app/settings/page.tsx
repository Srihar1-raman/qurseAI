import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createScopedLogger } from '@/lib/utils/logger';
import { getCachedUser } from '@/lib/supabase/auth-utils';
import SettingsPageClient from './SettingsPageClient';
import { SettingsPageSkeleton } from '@/components/ui/SettingsPageSkeleton';

export const dynamic = 'force-dynamic';

const logger = createScopedLogger('settings/page');

export default async function SettingsPage() {
  // Server-side auth check (non-blocking for first load race condition)
  // Uses cached getUser() to avoid duplicate call (middleware already calls it)
  // NOTE: We don't redirect on null user here to avoid race condition with client-side auth initialization.
  // Client component will handle auth check and redirect if needed.
  try {
    const { user, error } = await getCachedUser();

    // Only redirect on explicit errors (network issues, Supabase down, etc.)
    // Don't redirect on null user - let client component handle it after auth initializes
    if (error) {
      logger.warn('Auth error during settings page access check', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      // Only redirect on actual errors, not on null user (which might be race condition)
      redirect('/');
    }

    // If user exists, great - render page
    // If user is null, still render page - client component will check auth and redirect if needed
    // This prevents race condition where server redirects before client auth initializes

    // Conversation count is now fetched client-side via HistorySidebarContext
    // This eliminates server-side blocking and allows shared caching
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
