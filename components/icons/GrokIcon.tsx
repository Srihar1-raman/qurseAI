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
      viewBox="0 0 256 256"
      {...props}
    >
      <path d="M98.891 162.845l85.101-62.797c4.174-3.072 10.147-1.888 12.131 2.907 10.459 25.215 5.779 55.528-15.035 76.342-20.814 20.814-49.756 25.378-76.218 14.989l-28.928 13.397c41.463 28.32 91.802 21.312 123.245-10.131 24.948-24.948 32.666-58.964 25.439-89.658l.059.059c-10.478-45.035 2.57-63.027 29.287-99.774.618-.874 1.264-1.758 1.904-2.642l-35.184 35.168v-.117L55.397 218.626M81.323 188.197c-29.765-28.409-24.633-72.415.758-97.806 18.782-18.782 49.572-26.443 76.435-15.181l28.869-13.317c-5.19-3.754-11.857-7.785-19.507-10.636-34.53-14.221-75.891-7.15-103.974 20.933-27.004 27.004-35.494 68.506-20.908 103.974 10.896 26.47-6.969 45.209-24.956 64.122-6.392 6.693-12.779 13.395-17.934 20.481l81.217-72.57" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}
