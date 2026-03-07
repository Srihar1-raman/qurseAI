'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function ExaIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10.5 10.5L16 8L13.5 13.5L8 16L10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="2" />
    </BaseIcon>
  );
}
