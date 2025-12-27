import type { ResolvedTheme } from '@/lib/types';

export interface ActivityData {
  date: string;
  messages: number;
  conversations: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  [key: string]: number | string;
}

export interface ActivityGraphProps {
  userId?: string;
}

export type MetricType = 'messages' | 'conversations' | 'tokens';
export type TokenType = 'total' | 'input' | 'output';
export type TimeRange = '7days' | '30days' | 'all';

// Re-export for convenience
export type { ResolvedTheme };
