'use client';

import { BaseIcon } from './BaseIcon';
import type { BaseIconProps } from './BaseIcon';

export function GrokIcon({ className, size, style, theme, isActive, isInverted, ...props }: BaseIconProps) {
  return (
    <BaseIcon
      className={className}
      size={size}
      style={style}
      theme={theme}
      isActive={isActive}
      isInverted={isInverted}
      viewBox="0 0 48 48"
      {...props}
    >
      <path d="M18.542 30.532l15.956-11.776c0.783-0.576 1.902-0.354 2.274 0.545 1.962 4.728 1.084 10.411-2.819 14.315-3.903 3.901-9.333 4.756-14.299 2.808l-5.423 2.511c7.778 5.315 17.224 4 23.125-1.903 4.682-4.679 6.131-11.058 4.775-16.812l0.011 0.011c-1.966-8.452 0.482-11.829 5.501-18.735 0.116-0.164 0.237-0.33 0.357-0.496l-6.602 6.599v-0.022l-22.86 22.958M15.248 33.392c-5.582-5.329-4.619-13.579 0.142-18.339 3.521-3.522 9.294-4.958 14.331-2.847l5.412-2.497c-0.974-0.704-2.224-1.46-3.659-1.994-6.478-2.666-14.238-1.34-19.505 3.922-5.065 5.064-6.659 12.851-3.924 19.496 2.044 4.965-1.307 8.48-4.682 12.023-1.199 1.255-2.396 2.514-3.363 3.844l15.241-13.608" fill="currentColor" stroke="none"/>
    </BaseIcon>
  );
}
