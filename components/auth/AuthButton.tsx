'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';

interface AuthButtonProps {
  provider: 'github' | 'google' | 'twitter';
  onClick?: () => void;
}

const providerConfig = {
  github: {
    name: 'GitHub',
    icon: 'github'
  },
  google: {
    name: 'Google', 
    icon: 'google'
  },
  twitter: {
    name: 'X (Twitter)',
    icon: 'x-twitter'
  }
};

export default function AuthButton({ provider, onClick }: AuthButtonProps) {
  const config = providerConfig[provider];
  const { resolvedTheme, mounted } = useTheme();

  const handleClick = async () => {
    if (onClick) {
      onClick();
    } else {
      // TODO: Implement Supabase Auth for OAuth authentication
      console.log(`Sign in with ${provider}`);
    }
  };

  return (
    <button 
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '12px 16px',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-bg-hover)';
        e.currentTarget.style.borderColor = 'var(--color-border-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-bg)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      <Image 
        src={getIconPath(config.icon, resolvedTheme, false, mounted)}
        alt={config.name} 
        width={20} 
        height={20} 
      />
      {config.name}
    </button>
  );
}

