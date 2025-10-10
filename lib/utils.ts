import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Icon path utility function
export function getIconPath(iconName: string, resolvedTheme: 'light' | 'dark', isActive: boolean = false, mounted: boolean = true): string {
  // If not mounted, return default
  if (!mounted) {
    return `/icon/${iconName}.svg`;
  }
  
  // If active (like selected model with green background), always use light icons
  if (isActive) {
    return `/icon_light/${iconName}.svg`;
  }
  
  // Otherwise use theme-dependent path
  const iconFolder = resolvedTheme === 'dark' ? 'icon_light' : 'icon';
  return `/${iconFolder}/${iconName}.svg`;
}

// Inverted icon path (for buttons with colored backgrounds)
export function getInvertedIconPath(iconName: string, resolvedTheme: 'light' | 'dark', isActive: boolean = false, mounted: boolean = true): string {
  // If not mounted, return default
  if (!mounted) {
    return `/icon_light/${iconName}.svg`;
  }
  
  // If active, always use light icons (white on green)
  if (isActive) {
    return `/icon_light/${iconName}.svg`;
  }
  
  // Otherwise use inverse of theme (this is used for special cases)
  const iconFolder = resolvedTheme === 'dark' ? 'icon' : 'icon_light';
  return `/${iconFolder}/${iconName}.svg`;
}

