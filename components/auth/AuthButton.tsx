'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';

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
  const { error: showToastError } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (onClick) {
      onClick();
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as 'github' | 'google' | 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        showToastError(`Failed to sign in with ${config.name}. Please try again.`);
        setIsLoading(false);
      }
      // No need to setIsLoading(false) on success - user will be redirected
    } catch (error) {
      showToastError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
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
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        textDecoration: 'none',
        opacity: isLoading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.background = 'var(--color-bg-hover)';
          e.currentTarget.style.borderColor = 'var(--color-border-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.currentTarget.style.background = 'var(--color-bg)';
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }
      }}
    >
      {isLoading ? (
        <>
          <span style={{ 
            width: '20px', 
            height: '20px', 
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }} />
          Signing in...
        </>
      ) : (
        <>
          <Image 
            src={getIconPath(config.icon, resolvedTheme, false, mounted)}
            alt={config.name} 
            width={20} 
            height={20} 
          />
          {config.name}
        </>
      )}
    </button>
  );
}


