export const QURSE_GREEN = '#10b981';
export const GRADIENT_ID = 'activity_graph_gradient';

export const METRIC_OPTIONS = [
  { value: 'messages', label: 'Messages' },
  { value: 'conversations', label: 'Conversations' },
  { value: 'tokens', label: 'Tokens' },
] as const;

export const TOKEN_TYPE_OPTIONS = [
  { value: 'total', label: 'Total' },
  { value: 'input', label: 'Input' },
  { value: 'output', label: 'Output' },
] as const;

export const TIME_RANGE_OPTIONS = [
  { value: '7days', label: '7D' },
  { value: '30days', label: '30D' },
  { value: 'all', label: 'All' },
] as const;

// Keys that should not be treated as model names in ActivityData
export const RESERVED_KEYS = [
  'date',
  'messages',
  'conversations',
  'inputTokens',
  'outputTokens',
  'totalTokens',
] as const;

// Default token multipliers for model-specific message estimation
export const DEFAULT_TOKEN_MULTIPLIERS = {
  input: 150,
  output: 80,
  total: 230,
} as const;
