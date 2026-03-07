'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function PinIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
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
      <path d="M7.20005 2.3999C5.8763 2.3999 4.80005 3.47615 4.80005 4.7999V20.3999C4.80005 20.8312 5.03255 21.2324 5.40755 21.4424C5.78255 21.6524 6.2438 21.6487 6.61505 21.4274L12 18.1987L17.3813 21.4274C17.7525 21.6487 18.2138 21.6562 18.5888 21.4424C18.9638 21.2287 19.2 20.8312 19.2 20.3999V4.7999C19.2 3.47615 18.1238 2.3999 16.8 2.3999H7.20005Z" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}
