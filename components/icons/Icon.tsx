'use client';

import { useTheme } from '@/lib/theme-provider';
import type { IconProps, IconName } from './types';

// Import all icon components individually to avoid circular dependency
import { AboutIcon } from './AboutIcon';
import { AccountsIcon } from './AccountsIcon';
import { AnthropicIcon } from './AnthropicIcon';
import { ArxivLogoIcon } from './ArxivLogoIcon';
import { ArrowUpIcon } from './ArrowUpIcon';
import { AttachIcon } from './AttachIcon';
import { ChatIcon } from './ChatIcon';
import { CheckIcon } from './CheckIcon';
import { Clear_historyIcon } from './Clear_historyIcon';
import { CollapseIcon } from './CollapseIcon';
import { Convo_branchIcon } from './Convo_branchIcon';
import { CopyIcon } from './CopyIcon';
import { CrossIcon } from './CrossIcon';
import { Deep_searchIcon } from './Deep_searchIcon';
import { DeepSeekIcon } from './DeepSeekIcon';
import { DeleteIcon } from './DeleteIcon';
import { DownloadIcon } from './DownloadIcon';
import { DropdownArrowIcon } from './DropdownArrowIcon';
import { ExaAIIcon } from './ExaAIIcon';
import { ExaIcon } from './ExaIcon';
import { ExpandIcon } from './ExpandIcon';
import { GeminiIcon } from './GeminiIcon';
import { GeneralIcon } from './GeneralIcon';
import { GithubIcon } from './GithubIcon';
import { GoogleIcon } from './GoogleIcon';
import { GrokIcon } from './GrokIcon';
import { GroqIcon } from './GroqIcon';
import { HistoryIcon } from './HistoryIcon';
import { ImageIcon } from './ImageIcon';
import { InfoIcon } from './InfoIcon';
import { InternetIcon } from './InternetIcon';
import { LinkIcon } from './LinkIcon';
import { MailIcon } from './MailIcon';
import { ModelIcon } from './ModelIcon';
import { MoonshotIcon } from './MoonshotIcon';
import { MoreIcon } from './MoreIcon';
import { NextjsIcon } from './NextjsIcon';
import { OpenAIIcon } from './OpenAIIcon';
import { PaymentIcon } from './PaymentIcon';
import { PinIcon } from './PinIcon';
import { PlusIcon } from './PlusIcon';
import { PrivacyIcon } from './PrivacyIcon';
import { ProfileIcon } from './ProfileIcon';
import { ProIcon } from './ProIcon';
import { QwenIcon } from './QwenIcon';
import { ReasonIcon } from './ReasonIcon';
import { RedoIcon } from './RedoIcon';
import { RenameIcon } from './RenameIcon';
import { RightArrowsIcon } from './RightArrowsIcon';
import { SearchIcon } from './SearchIcon';
import { SendIcon } from './SendIcon';
import { SentryIcon } from './SentryIcon';
import { SettingsIcon } from './SettingsIcon';
import { ShareIcon } from './ShareIcon';
import { SignoutIcon } from './SignoutIcon';
import { StopIcon } from './StopIcon';
import { SupabaseIcon } from './SupabaseIcon';
import { SystemIcon } from './SystemIcon';
import { TavilyIcon } from './TavilyIcon';
import { TermsIcon } from './TermsIcon';
import { ThemeAutoIcon } from './ThemeAutoIcon';
import { ThemeDarkIcon } from './ThemeDarkIcon';
import { ThemeIcon } from './ThemeIcon';
import { ThemeLightIcon } from './ThemeLightIcon';
import { ThumbsDownIcon } from './ThumbsDownIcon';
import { ThumbsUpIcon } from './ThumbsUpIcon';
import { UnpinIcon } from './UnpinIcon';
import { UpstashIcon } from './UpstashIcon';
import { VercelIcon } from './VercelIcon';
import { XTwitterIcon } from './XTwitterIcon';
import { ZaiIcon } from './ZaiIcon';

// Map of icon names to components
const iconMap: Record<string, React.ComponentType<any>> = {
  'about': AboutIcon,
  'accounts': AccountsIcon,
  'Anthropic': AnthropicIcon,
  'arrow-up': ArrowUpIcon,
  'arxiv-logo': ArxivLogoIcon,
  'attach': AttachIcon,
  'chat': ChatIcon,
  'check': CheckIcon,
  'clear_history': Clear_historyIcon,
  'collapse': CollapseIcon,
  'convo_branch': Convo_branchIcon,
  'copy': CopyIcon,
  'cross': CrossIcon,
  'deep_search': Deep_searchIcon,
  'deepseek': DeepSeekIcon,
  'delete': DeleteIcon,
  'download': DownloadIcon,
  'dropdown-arrow': DropdownArrowIcon,
  'exa': ExaIcon,
  'exaAI': ExaAIIcon,
  'expand': ExpandIcon,
  'gemini': GeminiIcon,
  'general': GeneralIcon,
  'github': GithubIcon,
  'google': GoogleIcon,
  'grok': GrokIcon,
  'groq': GroqIcon,
  'history': HistoryIcon,
  'image': ImageIcon,
  'info': InfoIcon,
  'internet': InternetIcon,
  'link': LinkIcon,
  'mail': MailIcon,
  'model': ModelIcon,
  'moonshot': MoonshotIcon,
  'more': MoreIcon,
  'nextjs': NextjsIcon,
  'OpenAI': OpenAIIcon,
  'payment': PaymentIcon,
  'pin': PinIcon,
  'plus': PlusIcon,
  'privacy': PrivacyIcon,
  'profile': ProfileIcon,
  'pro': ProIcon,
  'qwen': QwenIcon,
  'reason': ReasonIcon,
  'redo': RedoIcon,
  'rename': RenameIcon,
  'right-arrows': RightArrowsIcon,
  'search': SearchIcon,
  'send': SendIcon,
  'sentry': SentryIcon,
  'settings': SettingsIcon,
  'share': ShareIcon,
  'signout': SignoutIcon,
  'stop': StopIcon,
  'supabase': SupabaseIcon,
  'system': SystemIcon,
  'tavily': TavilyIcon,
  'terms': TermsIcon,
  'theme': ThemeIcon,
  'theme-auto': ThemeAutoIcon,
  'theme-dark': ThemeDarkIcon,
  'theme-light': ThemeLightIcon,
  'thumbs-down': ThumbsDownIcon,
  'thumbs-up': ThumbsUpIcon,
  'unpin': UnpinIcon,
  'upstash': UpstashIcon,
  'vercel': VercelIcon,
  'x-twitter': XTwitterIcon,
  'zai': ZaiIcon,
};

export function Icon({
  name,
  className = '',
  size = 16,
  style,
  'aria-label': ariaLabel,
  role = 'img',
}: IconProps & { name: IconName }) {
  const { resolvedTheme } = useTheme();

  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`[Icon] Icon "${name}" not found in iconMap!`);
    return null;
  }

  return (
    <IconComponent
      className={className}
      size={size}
      style={style}
      aria-label={ariaLabel || name}
      role={role}
      theme={resolvedTheme}
    />
  );
}

export default Icon;
