export interface IconProps {
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  role?: string;
}

export type IconName =
  | 'aisdk' | 'about' | 'accounts' | 'Anthropic' | 'arrow-up' | 'arxiv-logo'
  | 'attach' | 'chat' | 'check' | 'clear_history' | 'collapse' | 'convo_branch'
  | 'copy' | 'cross' | 'deep_search' | 'deepseek' | 'delete'
  | 'download' | 'dropdown-arrow' | 'exa' | 'exaAI' | 'expand'
  | 'gemini' | 'general' | 'github' | 'google' | 'grok' | 'groq'
  | 'history' | 'image' | 'info' | 'internet' | 'link' | 'mail'
  | 'model' | 'moonshot' | 'more' | 'nextjs' | 'OpenAI'
  | 'payment' | 'pin' | 'plus' | 'privacy' | 'pro' | 'profile'
  | 'qwen' | 'reason' | 'redo' | 'rename' | 'right-arrows'
  | 'search' | 'send' | 'sentry' | 'settings' | 'share'
  | 'signout' | 'stop' | 'supabase' | 'system' | 'tavily'
  | 'terms' | 'theme' | 'theme-auto' | 'theme-light' | 'theme-dark'
  | 'thumbs-down' | 'thumbs-up' | 'trending-up' | 'unpin' | 'upstash'
  | 'vercel' | 'x-twitter' | 'zai';
