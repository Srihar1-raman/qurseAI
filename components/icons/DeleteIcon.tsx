'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function DeleteIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M14 16H20M21 10V9C21 7.89543 20.1046 7 19 7H5C3.89543 7 3 7.89543 3 9V11C3 12.1046 3.89543 13 5 13H11" fill="none" stroke="currentColor" strokeWidth="2" />
    </BaseIcon>
  );
}
