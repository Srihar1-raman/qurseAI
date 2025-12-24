import type { Metadata } from 'next';
import InfoPageClient from './InfoPageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Qurse - Info',
  description: 'AI Chat Platform for the fastest',
};

export default function InfoPage() {
  return <InfoPageClient />;
}
