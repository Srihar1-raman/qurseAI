'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function InfoIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M12 16v-4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8h.01" fill="none" stroke="currentColor" strokeWidth="2" />
    </BaseIcon>
  );
}
