'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function NextjsIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M20 0H0V20H20V0Z" fill="currentColor" stroke="none" />
      <path d="M10 19.2188C15.0914 19.2188 19.2188 15.0914 19.2188 10C19.2188 4.90862 15.0914 0.78125 10 0.78125C4.90862 0.78125 0.78125 4.90862 0.78125 10C0.78125 15.0914 4.90862 19.2188 10 19.2188Z" fill="currentColor" stroke="none" />
      <path d="M13.2875 13.75V6.25Z" fill="currentColor" stroke="none" />
      <path d="M13.2875 13.75V6.25" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7.49377 6.25109L5.93127 6.25V13.75H7.49377V8.70997L15.4519 18.3845C15.89 18.0991 16.3043 17.7803 16.6913 17.4316L7.49377 6.25109Z" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}
