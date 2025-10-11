// Model and search configuration constants
import type { Model, ModelGroup, SearchOption } from './types';

// Model groups configuration
export const MODEL_GROUPS: Record<string, ModelGroup> = {
  groq: {
    provider: 'GROQ',
    enabled: true,
    models: [
      {
        id: 'openai/gpt-oss-120b',
        name: 'GPT-OSS 120B',
        provider: 'groq',
        reasoningModel: true,
      },
      {
        id: 'openai/gpt-oss-20b',
        name: 'GPT-OSS 20B',
        provider: 'groq',
        reasoningModel: true,
      },
      {
        id: 'deepseek-r1-distill-llama-70b',
        name: 'Deepseek R1 Distill 70B',
        provider: 'groq',
        reasoningModel: true,
      },
      {
        id: 'qwen/qwen3-32b',
        name: 'Qwen3 32B',
        provider: 'groq',
        reasoningModel: true,
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma2 9B',
        provider: 'groq',
      },
      {
        id: 'moonshotai/kimi-k2-instruct',
        name: 'Kimi K2 Instruct',
        provider: 'groq',
      },
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        provider: 'groq',
      },
      {
        id: 'meta-llama/llama-4-scout-17b-16e-instruct',
        name: 'Llama 4 Scout 17B',
        provider: 'groq',
        imageSupport: true,
      },
      {
        id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        name: 'Llama 4 Maverick 17B',
        provider: 'groq',
        imageSupport: true,
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: 'groq',
      }
    ]
  },
  xai: {
    provider: 'XAI',
    enabled: true,
    models: [
      {
        id: 'grok-3-mini',
        name: 'Grok 3 Mini',
        provider: 'xai',
        reasoningModel: true,
      },
      {
        id: 'grok-2-vision-1212',
        name: 'Grok 2 Vision',
        provider: 'xai',
        imageSupport: true,
      },
      {
        id: 'grok-3',
        name: 'Grok 3',
        provider: 'xai',
      },
      {
        id: 'grok-4-0709',
        name: 'Grok 4',
        provider: 'xai',
        reasoningModel: true,
      }
    ]
  },
  openai: {
    provider: 'OpenAI',
    enabled: true,
    models: [
      {
        id: 'o4-mini-2025-04-16',
        name: 'O4 Mini',
        provider: 'openai',
        imageSupport: true,
        reasoningModel: true,
      },
      {
        id: 'gpt-4.1-2025-04-14',
        name: 'GPT-4.1',
        provider: 'openai',
        imageSupport: true,
      }
    ]
  },
  anthropic: {
    provider: 'Anthropic',
    enabled: true,
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        reasoningModel: true,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
      }
    ]
  }
};

// Web search options
export const WEB_SEARCH_OPTIONS: SearchOption[] = [
  { name: 'Chat', enabled: false, icon: 'chat' },
  { name: 'Web Search (Exa)', enabled: true, icon: 'exa' },
  { name: 'arXiv', enabled: false, icon: 'arxiv-logo' }
];

// Export short names for convenience
export const searchOptions = WEB_SEARCH_OPTIONS;

// Helper functions
export function getAllModels(): Model[] {
  const modelsList: Model[] = [];
  Object.values(MODEL_GROUPS).forEach(group => {
    if (group.enabled) {
      modelsList.push(...group.models);
    }
  });
  return modelsList;
}

// Export models array for convenience
export const models = getAllModels();

export function getModelByName(name: string): Model | undefined {
  return getAllModels().find(model => model.name === name);
}

export function isReasoningModel(modelName: string): boolean {
  const model = getModelByName(modelName);
  return model?.reasoningModel === true;
}

// For arXiv mode, specific models are compatible
export function isModelCompatibleWithArxiv(modelName: string, provider: string): boolean {
  const compatibleModels = [
    'GPT-OSS 120B',
    'GPT-OSS 20B',
    'Qwen3 32B',
    'Deepseek R1 Distill 70B',
    'Llama 4 Scout 17B',
    'Kimi K2 Instruct'
  ];
  
  const compatibleProviders = ['XAI', 'OpenAI', 'Anthropic'];
  
  return compatibleModels.includes(modelName) || compatibleProviders.includes(provider);
}

