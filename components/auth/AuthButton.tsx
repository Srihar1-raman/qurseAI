'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import { useQueryState } from 'nuqs';
import { callbackUrlParser } from '@/lib/url-params/parsers';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';

interface AuthButtonProps {
  provider: 'github' | 'google' | 'twitter';
  onClick?: () => void;
  callbackUrl?: string; // Override callback URL
  iconOnly?: boolean; // Show only icon, no text
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

export default function AuthButton({ provider, onClick, callbackUrl: callbackUrlProp, iconOnly = false }: AuthButtonProps) {
  const config = providerConfig[provider];
  const { resolvedTheme, mounted } = useTheme();
  const { error: showToastError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Read callbackUrl from prop, URL param, or default to '/'
  // Using nuqs - no Suspense needed!
  const [callbackUrlParam] = useQueryState('callbackUrl', callbackUrlParser);

  // Read callbackUrl from prop, current page URL, or default to '/'
  // This allows post-auth redirect to the page user was on before login
  const callbackUrl = useMemo(() => {
    const url = callbackUrlProp || callbackUrlParam || '/';
    // Encode to pass through OAuth flow safely
    return encodeURIComponent(url);
  }, [callbackUrlProp, callbackUrlParam]);

  const handleClick = async () => {
    if (onClick) {
      onClick();
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Include callbackUrl in redirectTo so it's preserved through OAuth flow
      // Supabase OAuth preserves query parameters in redirectTo URL
      const redirectTo = `${window.location.origin}/auth/callback?callbackUrl=${callbackUrl}`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as 'github' | 'google' | 'twitter',
        options: {
          redirectTo,
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
        gap: iconOnly ? '0' : '12px',
        padding: iconOnly ? '10px 12px' : '12px 16px',
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
        width: iconOnly ? '100%' : 'auto',
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
            width: iconOnly ? '24px' : '20px', 
            height: iconOnly ? '24px' : '20px', 
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }} />
          {!iconOnly && 'Signing in...'}
        </>
      ) : (
        <>
          <Image 
            src={getIconPath(config.icon, resolvedTheme, false, mounted)}
            alt={config.name} 
            width={iconOnly ? 24 : 20} 
            height={iconOnly ? 24 : 20} 
            style={{ opacity: 0.9 }}
          />
          {!iconOnly && config.name}
        </>
      )}
    </button>
  );
}


