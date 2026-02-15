'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function ImageIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
  return (
    <BaseIcon
      className={className}
      size={size}
      style={style}
      theme={theme}
      isActive={isActive}
      isInverted={isInverted}
      viewBox="0 0 24 24"
      {...props}
    >
      <rect x="4" y="6" width="16" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="8.5" cy="10" r="1" fill="currentColor" />
      <path d="M4 16L8 12L12 15L16 12L20 16" fill="none" stroke="currentColor" strokeWidth="1" />
    </BaseIcon>
  );
}
