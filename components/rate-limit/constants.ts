/**
 * Shared constants for rate limit popup components
 */

export const RATE_LIMIT_CONSTANTS = {
  // Logo positioning
  LOGO_OFFSET_TOP: '-55px',
  LOGO_FONT_SIZE: '60px',
  LOGO_LINE_HEIGHT: '1.05',
  
  // Pricing text
  PRICING_FONT_SIZE: '16px',
  PRICING_WORD_SPACING: '12px',
  PRICING_LETTER_SPACING: '0.5px',
  
  // Carousel
  CAROUSEL_OFFSET_TOP: '20px',
  CAROUSEL_HEIGHT: '100px',
  CAROUSEL_GAP: '16px',
  CAROUSEL_ICON_SIZE: 52,
  CAROUSEL_ICON_CONTAINER_SIZE: 64,
  CAROUSEL_ITEM_MIN_WIDTH: '80px',
  CAROUSEL_MASK_FADE: '60px',
  
  // Animation speeds (milliseconds)
  CAROUSEL_SPEED_NORMAL: 20000, // 20s
  CAROUSEL_SPEED_HOVER: 30000, // 30s
  
  // Background image
  BG_IMAGE_OFFSET_TOP: '-40px',
  BG_IMAGE_OFFSET_BOTTOM: '-40px',
  BG_IMAGE_OPACITY: 0.15,
  BG_IMAGE_MASK_START: '15%',
  BG_IMAGE_MASK_END: '85%',
  
  // Container
  CONTAINER_PADDING: '20px',
  CONTAINER_MAX_WIDTH: '320px',
  CONTAINER_BORDER_RADIUS: '12px',
  CONTAINER_BACKDROP_BLUR: 'blur(10px)',
  
  // Spacing
  SECTION_MARGIN: '20px -20px',
  SECTION_PADDING: '20px 20px',
  DIVIDER_MARGIN: '16px 0',
  
  // Auth buttons (guest popup)
  AUTH_BUTTON_GRID_GAP: '8px',
  AUTH_BUTTON_ICON_SIZE: 24,
  AUTH_BUTTON_PADDING: '10px 12px',
  
  // Tooltip
  TOOLTIP_OFFSET: 12,
  TOOLTIP_FONT_SIZE: '11px',
  TOOLTIP_PADDING: '4px 8px',
  TOOLTIP_BORDER_RADIUS: '4px',
} as const;

/**
 * Premium model icons configuration
 */
export const PREMIUM_MODELS = [
  { name: 'OpenAI', icon: 'OpenAI' },
  { name: 'Anthropic', icon: 'Anthropic' },
  { name: 'Grok', icon: 'grok' },
  { name: 'Exa AI', icon: 'exaAI' },
  { name: 'Tavily', icon: 'tavily' },
  { name: 'Moonshot', icon: 'moonshot' },
  { name: 'Zai', icon: 'zai' },
  { name: 'DeepSeek', icon: 'deepseek' },
  { name: 'Gemini', icon: 'gemini' },
  { name: 'Qwen', icon: 'qwen' },
] as const;

