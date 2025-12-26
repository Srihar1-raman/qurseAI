import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
  type BundledTheme,
} from 'shiki';

// Store multiple highlighters for different themes
const highlighters: Map<string, Highlighter> = new Map();
const highlighterPromises: Map<string, Promise<Highlighter>> = new Map();

/**
 * Get or create a Shiki highlighter for a specific theme
 * Each theme gets its own highlighter instance
 */
export async function getHighlighter(theme: string = 'github-dark'): Promise<Highlighter> {
  // Return existing highlighter if available
  if (highlighters.has(theme)) {
    return highlighters.get(theme)!;
  }

  // Return existing promise if initializing
  if (highlighterPromises.has(theme)) {
    return highlighterPromises.get(theme)!;
  }

  // Create new highlighter for this theme
  const promise = (async () => {
    const highlighter = await createHighlighter({
      themes: [theme],
      langs: [
        'javascript',
        'typescript',
        'jsx',
        'tsx',
        'python',
        'java',
        'c',
        'cpp',
        'csharp',
        'go',
        'rust',
        'ruby',
        'php',
        'swift',
        'kotlin',
        'scala',
        'html',
        'css',
        'json',
        'yaml',
        'markdown',
        'bash',
        'shell',
        'sql',
        'xml',
      ],
    });

    highlighters.set(theme, highlighter);
    return highlighter;
  })();

  highlighterPromises.set(theme, promise);
  return promise;
}

/**
 * Highlight code with syntax highlighting
 * @param code - The code to highlight
 * @param lang - The language (defaults to 'text')
 * @param isDark - Whether to use dark theme (deprecated, use theme instead)
 * @param theme - The theme to use (defaults to 'github-dark' or 'github-light' based on isDark)
 */
export async function highlightCode(
  code: string,
  lang: string = 'text',
  isDark: boolean = true,
  theme?: string
): Promise<string> {
  try {
    // Determine which theme to use
    const effectiveTheme = theme || (isDark ? 'github-dark' : 'github-light');

    const highlighter = await getHighlighter(effectiveTheme);

    // Normalize language
    const normalizedLang = normalizeLanguage(lang);

    // Highlight the code
    const html = highlighter.codeToHtml(code, {
      lang: normalizedLang as BundledLanguage,
      theme: effectiveTheme as BundledTheme,
    });

    return html;
  } catch (error) {
    console.warn('Shiki highlighting failed, falling back to plain text:', error);
    // Fallback: escape HTML and return as pre
    return escapeHtml(code);
  }
}

/**
 * Normalize language aliases to Shiki-supported languages
 */
function normalizeLanguage(lang: string): string {
  if (!lang) return 'text';

  const langLower = lang.toLowerCase();

  // Language aliases
  const aliases: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'c++': 'cpp',
    'cs': 'csharp',
    'sh': 'bash',
    'yml': 'yaml',
    'Plain Text': 'text',
    'plaintext': 'text',
    'txt': 'text',
  };

  return aliases[langLower] || langLower;
}

/**
 * Escape HTML entities for fallback
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check if a language is supported by Shiki
 */
export function isSupportedLanguage(lang: string): boolean {
  const supportedLangs = [
    'javascript',
    'typescript',
    'jsx',
    'tsx',
    'python',
    'java',
    'c',
    'cpp',
    'csharp',
    'go',
    'rust',
    'ruby',
    'php',
    'swift',
    'kotlin',
    'scala',
    'html',
    'css',
    'json',
    'yaml',
    'markdown',
    'bash',
    'shell',
    'sql',
    'xml',
    'text',
  ];

  const normalized = normalizeLanguage(lang);
  return supportedLangs.includes(normalized);
}
