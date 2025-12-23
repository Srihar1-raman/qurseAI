import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Hook to extract conversation ID from URL pathname
 * Extracts UUID from /conversation/[id] pattern
 *
 * @returns Conversation ID from URL or null if not found
 */
export function useConversationId(): string | null {
  const pathname = usePathname();
  
  return useMemo(() => {
    const match = pathname.match(/\/conversation\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);
}

