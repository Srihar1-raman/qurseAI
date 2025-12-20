'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { useOptimisticNavigation } from '@/hooks/use-optimistic-navigation';
import { getIconPath } from '@/lib/icon-utils';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import type { User } from '@/lib/types';

interface HeaderDropdownProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
  callbackUrl: string;
  theme: 'light' | 'dark' | 'auto';
  onThemeChange: (theme: 'light' | 'dark' | 'auto') => void;
  resolvedTheme: 'light' | 'dark';
  mounted: boolean;
  userInitial: string;
}

export function HeaderDropdown({
  user,
  isOpen,
  onOpenChange,
  onSignOut,
  callbackUrl,
  theme,
  onThemeChange,
  resolvedTheme,
  mounted,
  userInitial,
}: HeaderDropdownProps) {
  const router = useRouter();
  const { navigateOptimistically } = useOptimisticNavigation();

  return (
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
      open={isOpen}
      onOpenChange={onOpenChange}
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
      <ThemeSelector
        theme={theme}
        onThemeChange={onThemeChange}
        resolvedTheme={resolvedTheme}
        mounted={mounted}
      />

      {/* Pricing Section - Show for all users */}
      <DropdownSeparator />
      <DropdownItem 
        onClick={() => navigateOptimistically('/pricing')}
        onMouseEnter={() => router.prefetch('/pricing')}
      >
        <div className="flex items-center gap-3">
          <Image
            src={getIconPath('general', resolvedTheme, false, mounted)}
            alt="Pricing"
            width={16}
            height={16}
          />
          <span>Pricing</span>
        </div>
      </DropdownItem>

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
        <DropdownItem onClick={onSignOut}>
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
        <DropdownItem onClick={() => {
          const url = callbackUrl ? `/login?callbackUrl=${callbackUrl}` : '/login';
          window.location.href = url;
        }}>
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
  );
}

