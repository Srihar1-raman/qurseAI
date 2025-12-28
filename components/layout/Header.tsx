'use client';

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryStates } from 'nuqs';
import { useTheme } from '@/lib/theme-provider';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useOptimisticNavigation } from '@/hooks/use-optimistic-navigation';
import { getIconPath } from '@/lib/icon-utils';
import { useClickOutside } from '@/hooks/use-click-outside';
import type { HeaderProps } from '@/lib/types';
import { AuthButtons } from './AuthButtons';
import { HeaderDropdown } from './HeaderDropdown';

function Header({
  showNewChatButton = false,
  onNewChatClick,
  showHistoryButton = false,
  onHistoryClick,
  user: propUser = null
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();
  const { user: authUser, isLoading, signOut, isProUser } = useAuth();
  const { navigateOptimistically } = useOptimisticNavigation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use auth user if available, otherwise fall back to prop user
  const user = authUser || propUser;

  // Get all query params using nuqs (for building callback URL)
  // We use an empty object to get all params without specifying them
  const [allParams] = useQueryStates({}, { history: 'replace' });

  // Build callback URL for post-auth redirect (industry standard: query parameter)
  const callbackUrl = useMemo(() => {
    // Build query string from all params
    const queryString = Object.entries(allParams)
      .filter(([_, value]) => value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    const currentUrl = pathname + (queryString ? `?${queryString}` : '');
    // Only add callbackUrl if not already on login/signup pages (avoid loops)
    if (currentUrl.startsWith('/login') || currentUrl.startsWith('/signup')) {
      return '';
    }
    return encodeURIComponent(currentUrl);
  }, [pathname, allParams]);

  // Memoize user initial calculation (derived from user.name/email)
  const userInitial = useMemo(() => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  }, [user?.name, user?.email]);

  // Wrap handleSignOut with useCallback for stable reference
  const handleSignOut = useCallback(async () => {
    await signOut(); // Await for clean state
    setIsDropdownOpen(false);
    window.location.href = '/'; // Full reload to clear all cache
  }, [signOut]);

  // Wrap theme handler with useCallback for stable reference
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
  }, [setTheme]);

  // Close dropdown when clicking outside using hook
  useClickOutside(dropdownRef, () => {
    setIsDropdownOpen(false);
  }, isDropdownOpen);

  // Show loading skeleton while auth is initializing
  if (isLoading) {
    return (
      <header 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'var(--color-bg)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          zIndex: 50,
        }}
      >
        {/* Left side - Logo */}
        <div>
          <Link
            href="/"
            className="font-reenie font-medium hover:opacity-80 transition-opacity"
            style={{
              fontSize: '28px',
              letterSpacing: '-0.5px',
              color: 'var(--color-text)',
              textDecoration: 'none',
            }}
          >
            {isProUser ? '{Qurse Pro}' : '{Qurse}'}
          </Link>
        </div>

        {/* Right side - Loading skeleton */}
        <div className="flex items-center gap-2">
          {/* Skeleton circle for profile/settings button */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--color-bg-secondary)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>
      </header>
    );
  }

  return (
    <header 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'var(--color-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        zIndex: 50,
      }}
    >
      {/* Left side - Logo */}
      <div>
        <Link
          href="/"
          className="font-reenie font-medium hover:opacity-80 transition-opacity"
          style={{
            fontSize: '28px',
            letterSpacing: '-0.5px',
            color: 'var(--color-text)',
            textDecoration: 'none',
          }}
        >
          {isProUser ? '{Qurse Pro}' : '{Qurse}'}
        </Link>
      </div>

      {/* Right side - Auth buttons & Settings */}
      <div className="flex items-center gap-2">
        {!user && <AuthButtons callbackUrl={callbackUrl} />}

        {/* New Chat Button */}
        {showNewChatButton && (
          <button
            onClick={onNewChatClick}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="New Chat"
          >
            <Image 
              src={getIconPath("plus", resolvedTheme, false, mounted)} 
              alt="New Chat" 
              width={16} 
              height={16} 
            />
          </button>
        )}
        
        {/* History Button */}
        {showHistoryButton && (
          <button
            onClick={onHistoryClick}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Chat History"
          >
            <Image 
              src={getIconPath("history", resolvedTheme, false, mounted)} 
              alt="History" 
              width={16} 
              height={16} 
            />
          </button>
        )}

        {/* Settings Dropdown */}
        <div className="relative inline-block" ref={dropdownRef}>
          <HeaderDropdown
            user={user}
            isOpen={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
            onSignOut={handleSignOut}
            callbackUrl={callbackUrl}
            theme={theme}
            onThemeChange={handleThemeChange}
            resolvedTheme={resolvedTheme}
            mounted={mounted}
            userInitial={userInitial}
                  />
        </div>
      </div>
    </header>
  );
}

// Custom comparison function for React.memo()
// Only re-render if user.id, showNewChatButton, showHistoryButton, or theme changes
const areEqual = (prevProps: HeaderProps, nextProps: HeaderProps) => {
  // Compare user by ID (most reliable identifier)
  const prevUserId = prevProps.user?.id;
  const nextUserId = nextProps.user?.id;
  if (prevUserId !== nextUserId) return false;

  // Compare boolean props
  if (prevProps.showNewChatButton !== nextProps.showNewChatButton) return false;
  if (prevProps.showHistoryButton !== nextProps.showHistoryButton) return false;

  // Compare function references (if they change, we need to re-render)
  if (prevProps.onNewChatClick !== nextProps.onNewChatClick) return false;
  if (prevProps.onHistoryClick !== nextProps.onHistoryClick) return false;

  return true;
};

export default memo(Header, areEqual);
