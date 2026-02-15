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
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path d="M3 16L8 11L12 15L16 11L21 16V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V16Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </BaseIcon>
  );
}
