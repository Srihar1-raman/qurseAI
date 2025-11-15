'use client';

import React from 'react';

export interface UnifiedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'danger' | 'success';
  children: React.ReactNode;
  className?: string;
}

export function UnifiedButton({
  variant,
  children,
  className,
  disabled,
  onMouseEnter,
  onMouseLeave,
  style,
  ...props
}: UnifiedButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'transparent',
    fontFamily: 'inherit',
  };

  const variantStyles: Record<
    'primary' | 'secondary' | 'danger' | 'success',
    {
      default: React.CSSProperties;
      hover: React.CSSProperties;
      disabled: React.CSSProperties;
    }
  > = {
    primary: {
      default: {
        background: 'var(--color-text)',
        color: 'var(--color-bg)',
      },
      hover: {
        filter: 'brightness(0.9)',
      },
      disabled: {
        opacity: 0.5,
      },
    },
    secondary: {
      default: {
        background: 'transparent',
        color: 'var(--color-text)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-border)',
      },
      hover: {
        background: 'var(--color-bg-hover)',
        borderColor: 'var(--color-border-hover)',
      },
      disabled: {
        opacity: 0.5,
      },
    },
    danger: {
      default: {
        background: '#ef4444',
        color: 'white',
      },
      hover: {
        background: '#dc2626',
      },
      disabled: {
        opacity: 0.5,
      },
    },
    success: {
      default: {
        background: '#10a37f',
        color: 'white',
      },
      hover: {
        background: '#0d8a6b',
      },
      disabled: {
        opacity: 0.5,
      },
    },
  };

  const currentVariant = variantStyles[variant];
  const currentStyle: React.CSSProperties = {
    ...baseStyle,
    ...currentVariant.default,
    ...(isHovered && !disabled ? currentVariant.hover : {}),
    ...(disabled ? currentVariant.disabled : {}),
    ...style, // User styles applied last, can override variant styles
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      setIsHovered(true);
      onMouseEnter?.(e);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    onMouseLeave?.(e);
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={className}
      style={currentStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
}

