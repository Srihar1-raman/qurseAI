'use client';

import { SettingsPageSkeleton } from '@/components/ui/SettingsPageSkeleton';
import { InfoPageSkeleton } from '@/components/ui/InfoPageSkeleton';
import { ConversationPageSkeleton } from '@/components/ui/ConversationPageSkeleton';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function SkeletonsTestPage() {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '40px', textAlign: 'center' }}>
        Skeleton Components Preview
      </h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
        {/* Settings Skeleton */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            Settings Page Skeleton
          </h2>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', background: 'var(--color-bg)' }}>
            <SettingsPageSkeleton />
          </div>
        </section>

        {/* Info Skeleton */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            Info Page Skeleton
          </h2>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', background: 'var(--color-bg)' }}>
            <InfoPageSkeleton />
          </div>
        </section>

        {/* Conversation Skeleton */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            Conversation Page Skeleton
          </h2>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', background: 'var(--color-bg)', minHeight: '400px' }}>
            <ConversationPageSkeleton />
          </div>
        </section>

        {/* Generic Page Skeleton */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            Generic Page Skeleton
          </h2>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', background: 'var(--color-bg)' }}>
            <PageSkeleton variant="generic" />
          </div>
        </section>

        {/* History Search Skeleton */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            History Search Skeleton
          </h2>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', background: 'var(--color-bg)', maxWidth: '400px' }}>
            <LoadingSkeleton variant="history-search" />
            <div style={{ marginTop: '16px' }}>
              <LoadingSkeleton variant="conversation" count={3} />
            </div>
          </div>
        </section>
      </div>

      <div style={{ marginTop: '60px', padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
          <strong>Note:</strong> Edit the skeleton components in{' '}
          <code style={{ background: 'var(--color-bg)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>
            components/ui/
          </code>{' '}
          to see changes reflected here instantly.
        </p>
      </div>
    </div>
  );
}

