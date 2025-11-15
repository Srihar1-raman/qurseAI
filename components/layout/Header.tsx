'use client';

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-provider';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useOptimisticNavigation } from '@/hooks/use-optimistic-navigation';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { getIconPath, getInvertedIconPath } from '@/lib/icon-utils';
import { useClickOutside } from '@/hooks/use-click-outside';
import type { HeaderProps } from '@/lib/types';
import { UnifiedButton } from '@/components/ui/UnifiedButton';

function Header({
  showNewChatButton = false,
  onNewChatClick,
  showHistoryButton = false,
  onHistoryClick,
  user: propUser = null
}: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();
  const { user: authUser, isLoading, signOut } = useAuth();
  const { navigateOptimistically } = useOptimisticNavigation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use auth user if available, otherwise fall back to prop user
  const user = authUser || propUser;

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
  const handleSignOut = useCallback(() => {
    signOut(); // Don't await - let auth state change naturally
    setIsDropdownOpen(false);
    router.push('/');
  }, [signOut, router]);

  // Wrap theme handlers with useCallback for stable references
  const handleThemeAuto = useCallback(() => {
    setTheme('auto');
  }, [setTheme]);

  const handleThemeLight = useCallback(() => {
    setTheme('light');
  }, [setTheme]);

  const handleThemeDark = useCallback(() => {
    setTheme('dark');
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
            {'{Qurse}'}
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
          {'{Qurse}'}
        </Link>
      </div>

      {/* Right side - Auth buttons & Settings */}
      <div className="flex items-center gap-2">
        {!user && (
          <>
            {/* Desktop auth buttons */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <UnifiedButton variant="primary">
                  Log in
                </UnifiedButton>
              </Link>
              <Link href="/signup">
                <UnifiedButton variant="secondary">
                  Sign up
                </UnifiedButton>
              </Link>
            </div>
          </>
        )}

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
          <Dropdown
            trigger={
              <button
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: user ? 'var(--color-text)' : 'var(--color-bg-secondary)',
                  color: user ? 'var(--color-bg)' : 'var(--color-text)',
                  border: user ? 'none' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 0,
                  fontSize: '14px',
                  fontWeight: 600,
                }}
                aria-label={user ? 'Profile' : 'Settings'}
              >
                {user ? (
                  <span style={{ color: 'var(--color-bg)' }}>
                    {userInitial}
                  </span>
                ) : (
                  <Image
                    src={getIconPath('profile', resolvedTheme, false, mounted)}
                    alt="Settings"
                    width={16}
                    height={16}
                  />
                )}
              </button>
            }
            open={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
            align="end"
            className="min-w-[240px]"
          >
            {/* User Profile Section - Only show when authenticated */}
            {user && (
              <>
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {user.avatar_url && (
                    <Image
                      src={user.avatar_url}
                      alt={user.name || 'User'}
                      width={32}
                      height={32}
                      style={{ borderRadius: '50%' }}
                    />
                  )}
                  <div className="flex flex-col overflow-hidden">
                    {user.name && (
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {user.name}
                      </div>
                    )}
                    {user.email && (
                      <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Theme Selector */}
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <Image
                  src={getIconPath('theme', resolvedTheme, false, mounted)}
                  alt="Theme"
                  width={16}
                  height={16}
                />
                <span className="text-sm font-medium">Theme</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleThemeAuto}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                    theme === 'auto' 
                      ? 'bg-primary text-white' 
                      : 'bg-bg-secondary hover:bg-bg-hover'
                  }`}
                  aria-label="Auto theme"
                >
                   <Image
                     src={getIconPath('theme-auto', resolvedTheme, theme === 'auto', mounted)}
                     alt="Auto"
                     width={14}
                     height={14}
                   />
                </button>
                <button
                  onClick={handleThemeLight}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                    theme === 'light' 
                      ? 'bg-primary text-white' 
                      : 'bg-bg-secondary hover:bg-bg-hover'
                  }`}
                  aria-label="Light theme"
                >
                   <Image
                     src={getIconPath('theme-light', resolvedTheme, theme === 'light', mounted)}
                     alt="Light"
                     width={14}
                     height={14}
                   />
                </button>
                <button
                  onClick={handleThemeDark}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                    theme === 'dark' 
                      ? 'bg-primary text-white' 
                      : 'bg-bg-secondary hover:bg-bg-hover'
                  }`}
                  aria-label="Dark theme"
                >
                   <Image
                     src={getIconPath('theme-dark', resolvedTheme, theme === 'dark', mounted)}
                     alt="Dark"
                     width={14}
                     height={14}
                   />
                </button>
              </div>
            </div>

            {/* Settings Section - Only show when authenticated */}
            {user && (
              <>
                <DropdownSeparator />
                <DropdownItem 
                  onClick={() => navigateOptimistically('/settings')}
                  onMouseEnter={() => router.prefetch('/settings')}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={getIconPath('settings', resolvedTheme, false, mounted)}
                      alt="Settings"
                      width={16}
                      height={16}
                    />
                    <span>Settings</span>
                  </div>
                </DropdownItem>
              </>
            )}

            <DropdownSeparator />

            <DropdownItem 
              onClick={() => navigateOptimistically('/info?section=about')}
              onMouseEnter={() => router.prefetch('/info?section=about')}
            >
              <div className="flex items-center gap-3">
                <Image
                  src={getIconPath('about', resolvedTheme, false, mounted)}
                  alt="About"
                  width={16}
                  height={16}
                />
                <span>About</span>
              </div>
            </DropdownItem>

            <DropdownItem 
              onClick={() => navigateOptimistically('/info?section=terms')}
              onMouseEnter={() => router.prefetch('/info?section=terms')}
            >
              <div className="flex items-center gap-3">
                <Image
                  src={getIconPath('terms', resolvedTheme, false, mounted)}
                  alt="Terms"
                  width={16}
                  height={16}
                />
                <span>Terms</span>
              </div>
            </DropdownItem>

            <DropdownItem 
              onClick={() => navigateOptimistically('/info?section=privacy')}
              onMouseEnter={() => router.prefetch('/info?section=privacy')}
            >
              <div className="flex items-center gap-3">
                <Image
                  src={getIconPath('privacy', resolvedTheme, false, mounted)}
                  alt="Privacy"
                  width={16}
                  height={16}
                />
                <span>Privacy</span>
              </div>
            </DropdownItem>

            <DropdownSeparator />

            <DropdownItem 
              onClick={() => window.open('https://github.com/Srihar1-raman/qurseAI', '_blank', 'noopener,noreferrer')}
            >
              <div className="flex items-center gap-3">
                <Image
                  src={getIconPath('github', resolvedTheme, false, mounted)}
                  alt="GitHub"
                  width={16}
                  height={16}
                />
                <span>GitHub</span>
              </div>
            </DropdownItem>

            <DropdownItem 
              onClick={() => window.open('https://x.com/qursechat', '_blank', 'noopener,noreferrer')}
            >
              <div className="flex items-center gap-3">
                <Image
                  src={getIconPath('x-twitter', resolvedTheme, false, mounted)}
                  alt="X"
                  width={16}
                  height={16}
                />
                <span>X</span>
              </div>
            </DropdownItem>

            <DropdownSeparator />

            {user ? (
              <DropdownItem onClick={handleSignOut}>
                <div className="flex items-center gap-3">
                  <Image
                    src={getIconPath('signout', resolvedTheme, false, mounted)}
                    alt="Sign out"
                    width={16}
                    height={16}
                  />
                  <span>Sign out</span>
                </div>
              </DropdownItem>
            ) : (
              <DropdownItem onClick={() => window.location.href = '/login'}>
                <div className="flex items-center gap-3">
                  <Image
                    src={getIconPath('profile', resolvedTheme, false, mounted)}
                    alt="Sign in"
                    width={16}
                    height={16}
                  />
                  <span>Sign in / Sign up</span>
                </div>
              </DropdownItem>
            )}
          </Dropdown>
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
