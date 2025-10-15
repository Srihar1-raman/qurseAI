/**
 * Search Routes Layout
 * Wraps homepage and conversation routes with ConversationProvider
 */

import { ConversationProvider } from '@/lib/contexts/ConversationContext';

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConversationProvider>{children}</ConversationProvider>;
}

