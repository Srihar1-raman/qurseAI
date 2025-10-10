'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-provider';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { getIconPath, getInvertedIconPath } from '@/lib/icon-utils';

interface HeaderProps {
  showNewChatButton?: boolean;
  onNewChatClick?: () => void;
  showHistoryButton?: boolean;
  onHistoryClick?: () => void;
  user?: {
    name?: string;
    email?: string;
    avatar_url?: string;
  } | null;
}

export default function Header({
  showNewChatButton = false,
  onNewChatClick,
  showHistoryButton = false,
  onHistoryClick,
  user = null
}: HeaderProps = {}) {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user's first initial
  const getUserInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleSignOut = async () => {
    // TODO: Implement sign out logic
    console.log('Sign out');
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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
                <button
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    background: 'var(--color-text)',
                    color: 'var(--color-bg)',
                    border: 'none',
                  }}
                >
                  Log in
                </button>
              </Link>
              <Link href="/signup">
                <button
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: 'transparent',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                  className="hover:bg-bg-hover"
                >
                  Sign up
                </button>
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
                  background: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: 'none',
                  padding: 0,
                  fontSize: '14px',
                  fontWeight: 600,
                }}
                aria-label={user ? 'Profile' : 'Settings'}
              >
                {user ? (
                  <span style={{ color: 'var(--color-bg)' }}>
                    {getUserInitial()}
                  </span>
                ) : (
                  <Image
                    src={getInvertedIconPath('profile', resolvedTheme, mounted)}
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
                  onClick={() => setTheme('auto')}
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
                  onClick={() => setTheme('light')}
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
                  onClick={() => setTheme('dark')}
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
                <DropdownItem onClick={() => router.push('/settings')}>
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

            <DropdownItem onClick={() => router.push('/info?section=about')}>
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

            <DropdownItem onClick={() => router.push('/info?section=terms')}>
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

            <DropdownItem onClick={() => router.push('/info?section=privacy')}>
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

            <DropdownItem onClick={() => console.log('GitHub')}>
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

            <DropdownItem onClick={() => console.log('X')}>
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
