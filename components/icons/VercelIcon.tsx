'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function VercelIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M9.99913 0L20 20H0L9.99913 0Z" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}
