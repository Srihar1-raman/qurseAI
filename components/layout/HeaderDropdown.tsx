'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { useOptimisticNavigation } from '@/hooks/use-optimistic-navigation';
import { Icon } from '@/components/icons';
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
            <Icon
              name="profile"
              size={16}
              aria-label="Settings"
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
              <img
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
          <Icon
            name="general"
            size={16}
            aria-label="Pricing"
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
              <Icon
                name="settings"
                size={16}
                aria-label="Settings"
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
          <Icon
            name="about"
            size={16}
            aria-label="About"
          />
          <span>About</span>
        </div>
      </DropdownItem>

      <DropdownItem
        onClick={() => navigateOptimistically('/info?section=terms')}
        onMouseEnter={() => router.prefetch('/info?section=terms')}
      >
        <div className="flex items-center gap-3">
          <Icon
            name="terms"
            size={16}
            aria-label="Terms"
          />
          <span>Terms</span>
        </div>
      </DropdownItem>

      <DropdownItem
        onClick={() => navigateOptimistically('/info?section=privacy')}
        onMouseEnter={() => router.prefetch('/info?section=privacy')}
      >
        <div className="flex items-center gap-3">
          <Icon
            name="privacy"
            size={16}
            aria-label="Privacy"
          />
          <span>Privacy</span>
        </div>
      </DropdownItem>

      <DropdownSeparator />

      <DropdownItem
        onClick={() => window.open('https://github.com/Srihar1-raman/qurseAI', '_blank', 'noopener,noreferrer')}
      >
        <div className="flex items-center gap-3">
          <Icon
            name="github"
            size={16}
            aria-label="GitHub"
          />
          <span>GitHub</span>
        </div>
      </DropdownItem>

      <DropdownItem
        onClick={() => window.open('https://x.com/qursechat', '_blank', 'noopener,noreferrer')}
      >
        <div className="flex items-center gap-3">
          <Icon
            name="x-twitter"
            size={16}
            aria-label="X"
          />
          <span>X</span>
        </div>
      </DropdownItem>

      <DropdownSeparator />

      {user ? (
        <DropdownItem onClick={onSignOut}>
          <div className="flex items-center gap-3">
            <Icon
              name="signout"
              size={16}
              aria-label="Sign out"
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
            <Icon
              name="profile"
              size={16}
              aria-label="Sign in"
            />
            <span>Sign in / Sign up</span>
          </div>
        </DropdownItem>
      )}
    </Dropdown>
  );
}
