'use client';

import type { IconProps } from './types';

export interface BaseIconProps extends IconProps {
  theme: 'light' | 'dark';
  isActive?: boolean;
  isInverted?: boolean;
  children: React.ReactNode;
  viewBox?: string;
}

export function BaseIcon({
  className = '',
  size = 16,
  style,
  theme,
  isActive = false,
  isInverted = false,
  children,
  viewBox = "0 0 24 24",
  ...props
}: BaseIconProps) {
  const computedClassName = [
    'icon',
    isActive && 'icon-active',
    isInverted && 'icon-inverted',
    className
  ].filter(Boolean).join(' ');

  const computedStyle: React.CSSProperties = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    display: 'inline-block',
    verticalAlign: 'middle',
    ...style,
  };

  return (
    <svg
      className={computedClassName}
      style={computedStyle}
      viewBox={viewBox}
      {...props}
    >
      {children}
    </svg>
  );
}
