'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function SentryIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M12 2l10 5v10l-10 5L2 17V7l10-5z" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}
