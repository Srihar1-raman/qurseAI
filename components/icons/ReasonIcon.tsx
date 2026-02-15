'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function ReasonIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
        d="M7.5 19.5H6.5C5.1 19.5 4 18.4 4 17V12.5C4 11.8 2.5 11.5 2.5 11.5C2.5 11.5 4 11.2 4 10.5V6.5C4 5.1 5.1 4 6.5 4H7.5M16.5 4H17.5C18.9 4 20 5.1 20 6.5V10.8C20 11.5 21.5 11.8 21.5 11.8C21.5 11.8 20 12.1 20 12.8V17.5C20 18.9 18.9 20 17.5 20H16.5M8 12H8.5M12 12H12.5M16 12H16.5" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}
