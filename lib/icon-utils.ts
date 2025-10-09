// Icon utility functions for theme-aware icon loading

type ResolvedTheme = 'light' | 'dark';

/**
 * Get the correct icon path based on theme and active state
 * @param iconName - Name of the icon (without extension)
 * @param resolvedTheme - Current resolved theme ('light' or 'dark')
 * @param isActive - Whether the icon is in an active/selected state
 * @param mounted - Whether the component is mounted (prevents hydration mismatch)
 * @returns Path to the icon
 */
export function getIconPath(
  iconName: string,
  resolvedTheme: ResolvedTheme,
  isActive: boolean = false,
  mounted: boolean = true
): string {
  // During SSR, default to light theme icons
  if (!mounted) {
    return `/icon/${iconName}.svg`;
  }
  
  // Active state (e.g., selected in dropdown with green background) needs light icons for contrast
  if (isActive) {
    return `/icon_light/${iconName}.svg`;
  }
  
  // Normal state: dark theme uses light icons, light theme uses dark icons
  const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
  return `/${iconFolder}/${iconName}.svg`;
}

/**
 * Get icon path for inverted backgrounds (like header buttons with dark/light backgrounds)
 * @param iconName - Name of the icon (without extension)
 * @param resolvedTheme - Current resolved theme ('light' or 'dark')
 * @param mounted - Whether the component is mounted
 * @returns Path to the icon
 */
export function getInvertedIconPath(
  iconName: string,
  resolvedTheme: ResolvedTheme,
  mounted: boolean = true
): string {
  if (!mounted) {
    return `/icon/${iconName}.svg`;
  }
  
  // Inverted: dark theme uses dark icons, light theme uses light icons
  const iconFolder = resolvedTheme === 'dark' ? 'icon' : 'icon_light';
  return `/${iconFolder}/${iconName}.svg`;
}

