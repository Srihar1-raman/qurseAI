/**
 * Shared Routes Layout
 * Wraps shared conversation routes with ConversationProvider
 */

import { ConversationProvider } from '@/lib/contexts/ConversationContext';

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConversationProvider>{children}</ConversationProvider>;
}

