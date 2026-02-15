'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function DownloadIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12" fill="none" stroke="currentColor" strokeWidth="2" />
    </BaseIcon>
  );
}
