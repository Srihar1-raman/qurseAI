'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function SupabaseIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
  return (
    <BaseIcon
      className={className}
      size={size}
      style={style}
      theme={theme}
      isActive={isActive}
      isInverted={isInverted}
      viewBox="0 0 20 20"
      {...props}
    >
      <path d="M11.2623 19.4698C10.7584 20.1065 9.73108 19.7589 9.71936 18.9464L9.54358 7.04794H17.5436C18.9928 7.04794 19.8014 8.71982 18.899 9.85654L11.2623 19.4698Z" fill="currentColor"/>
      <path d="M11.2623 19.4698C10.7584 20.1065 9.73108 19.7589 9.71936 18.9464L9.54358 7.04794H17.5436C18.9928 7.04794 19.8014 8.71982 18.899 9.85654L11.2623 19.4698Z" fill="currentColor" fillOpacity="0.3"/>
      <path d="M8.01229 0.329191C8.51619 -0.307527 9.54354 0.0401288 9.55525 0.852629L9.63338 12.7472H1.73494C0.285724 12.7472 -0.52287 11.0753 0.379473 9.93857L8.01229 0.329191Z" fill="currentColor"/>
    </BaseIcon>
  );
}
