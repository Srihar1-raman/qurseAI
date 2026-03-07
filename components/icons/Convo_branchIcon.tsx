'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function Convo_branchIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M14.368 18.2209C14.368 19.5248 15.4251 20.5818 16.729 20.5818C18.0329 20.5818 19.0899 19.5248 19.0899 18.2209C19.0899 16.917 18.0329 15.86 16.729 15.86C15.4251 15.86 14.368 16.917 14.368 18.2209ZM14.368 18.2209H10.4004C8.19134 18.2209 6.40051 16.4302 6.40041 14.2211L6.3999 4M13.9254 8.77719H6.3999M19.0899 8.77719C19.0899 10.0811 18.0329 11.1381 16.729 11.1381C15.4251 11.1381 14.368 10.0811 14.368 8.77719C14.368 7.47329 15.4251 6.41626 16.729 6.41626C18.0329 6.41626 19.0899 7.47329 19.0899 8.77719Z" fill="none" stroke="currentColor" strokeWidth="2" />
    </BaseIcon>
  );
}
