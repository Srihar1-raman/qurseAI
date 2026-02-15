'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function ZaiIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path 
        d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z" 
        fill="currentColor" 
        stroke="none"
      />
    </BaseIcon>
  );
}
