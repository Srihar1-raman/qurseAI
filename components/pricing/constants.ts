import type { PricingFeature } from './types';

export const FREE_PLAN_FEATURES: PricingFeature[] = [
  {
    title: 'Limited Messages',
    description: '19 messages per day',
    icon: 'history',
  },
  {
    title: 'Access to Free Models',
    description: 'Use free AI models like GPT OSS 120B, Kimi K2, and more',
    icon: 'model',
  },
  {
    title: 'Limited Access to Chat Modes',
    description: 'Some modes restricted, others have message limits',
    icon: 'chat',
  },
  {
    title: 'Limited Uploads',
    description: 'Upload files with size and count restrictions',
    icon: 'attach',
  },
];

export const PRO_PLAN_FEATURES: PricingFeature[] = [
  {
    title: 'Access to All Models',
    description: 'Use premium models like Claude, Grok, and more (some rate-limited)',
    icon: 'model',
  },
  {
    title: 'Unlimited Chat Completions',
    description: 'No daily message limits',
    icon: 'history',
  },
  {
    title: 'Increased File Uploads',
    description: 'Higher file size limits and more uploads',
    icon: 'attach',
  },
  {
    title: 'Priority Support',
    description: 'Get dedicated support',
    icon: 'general',
  },
];

