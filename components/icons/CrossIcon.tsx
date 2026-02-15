'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function CrossIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M18 18L12 12M12 12L6 6M12 12L18 6M12 12L6 18" fill="none" stroke="currentColor" strokeWidth="2" />
    </BaseIcon>
  );
}
