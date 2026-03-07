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
      viewBox="0 0 20 20"
      {...props}
    >
      <g clipPath="url(#clip0_35319_18109)" transform="scale(1.3) translate(-2.3, -3)">
        <mask id="mask0_35319_18109" style={{maskType: 'luminance'}} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
          <path d="M20 0H0V20H20V0Z" fill="white"/>
        </mask>
        <g mask="url(#mask0_35319_18109)">
          <path d="M13.2875 13.75V6.25Z" fill="currentColor"/>
          <path d="M13.2875 13.75V6.25" fill="none" stroke="url(#paint0_linear_nextjs)" strokeMiterlimit="1.41421" strokeLinejoin="round"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M7.49377 6.25109L5.93127 6.25V13.75H7.49377V8.70997L15.4519 18.3845C15.89 18.0991 16.3043 17.7803 16.6913 17.4316L7.49377 6.25109Z" fill="url(#paint1_linear_nextjs)"/>
        </g>
      </g>
      <defs>
        <linearGradient id="paint0_linear_nextjs" x1="nan" y1="nan" x2="nan" y2="nan" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor"/>
          <stop offset="0.609375" stopColor="currentColor" stopOpacity="0.57"/>
          <stop offset="0.796875" stopColor="currentColor" stopOpacity="0"/>
          <stop offset="1" stopColor="currentColor" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="paint1_linear_nextjs" x1="12.4219" y1="11.3281" x2="16.9468" y2="16.749" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor"/>
          <stop offset="1" stopColor="currentColor" stopOpacity="0"/>
        </linearGradient>
        <clipPath id="clip0_35319_18109">
          <rect width="20" height="20" fill="white"/>
        </clipPath>
      </defs>
    </BaseIcon>
  );
}
