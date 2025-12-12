'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { AccountSectionProps } from '@/lib/types';
import { UnifiedButton } from '@/components/ui/UnifiedButton';

export default function AccountSection({ 
  user, 
  userStats, 
  onSignOut, 
  onClearChats, 
  onDeleteAccount 
}: AccountSectionProps) {
  const { resolvedTheme, mounted } = useTheme();
  // Get linked providers from AuthContext (cached across navigations)
  const { linkedProviders, isLoadingProviders } = useAuth();

  // Get primary provider (first one) for "Connected via..." text
  const getPrimaryProvider = (): string => {
    if (linkedProviders.length === 0) return 'Email';
    
    // Capitalize first letter
    const provider = linkedProviders[0];
    if (provider === 'twitter') return 'X (Twitter)';
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  // Check if a specific provider is connected
  const isProviderConnected = (provider: string): boolean => {
    return linkedProviders.includes(provider);
  };

  // Type guard: This should never happen due to page-level auth check in SettingsPageClient
  // but satisfies TypeScript's strict null checks
  if (!user) {
    return null;
  }

  return (
    <div className="settings-section">
      <h2>Account Settings</h2>

      {/* Account Profile */}
      <div className="settings-group">
        <label className="settings-label">Account Profile</label>
        <div className="account-info">
          <div className="account-avatar">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.name || 'User'}
                width={48}
                height={48}
                className="user-avatar-large rounded-full"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="account-details">
            <h4>{user.name || 'User'}</h4>
            <p>{user.email}</p>
            <p className="auth-provider-info">
              {isLoadingProviders ? (
                'Loading providers...'
              ) : linkedProviders.length > 1 ? (
                `Connected via ${linkedProviders.length} providers (${getPrimaryProvider()} + ${linkedProviders.length - 1} more)`
              ) : (
                `Connected via ${getPrimaryProvider()}`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Linked Providers */}
      <div className="settings-group">
        <label className="settings-label">Linked Accounts</label>
        {isLoadingProviders ? (
          <div className="linked-providers-list">
            <p style={{ color: 'var(--color-text-muted)', padding: '12px 0' }}>Loading linked accounts...</p>
          </div>
        ) : (
          <div className="linked-providers-list">
            <div className="provider-item">
              <Image 
                src={getIconPath('google', resolvedTheme, false, mounted)} 
                alt="Google" 
                width={20} 
                height={20} 
                className="provider-icon" 
              />
              <span className="provider-name">Google</span>
              <span className={`provider-status ${isProviderConnected('google') ? 'connected' : 'not-connected'}`}>
                {isProviderConnected('google') ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div className="provider-item">
              <Image 
                src={getIconPath('github', resolvedTheme, false, mounted)} 
                alt="GitHub" 
                width={20} 
                height={20} 
                className="provider-icon" 
              />
              <span className="provider-name">GitHub</span>
              <span className={`provider-status ${isProviderConnected('github') ? 'connected' : 'not-connected'}`}>
                {isProviderConnected('github') ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div className="provider-item">
              <Image 
                src={getIconPath('x-twitter', resolvedTheme, false, mounted)} 
                alt="X (Twitter)" 
                width={20} 
                height={20} 
                className="provider-icon" 
              />
              <span className="provider-name">X (Twitter)</span>
              <span className={`provider-status ${isProviderConnected('twitter') ? 'connected' : 'not-connected'}`}>
                {isProviderConnected('twitter') ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Account Activity */}
      <div className="settings-group">
        <label className="settings-label">Account Activity</label>
        <div className="settings-item">
          <div className="settings-item-content">
            <h4>Last Login</h4>
            <p>{new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="settings-item">
          <div className="settings-item-content">
            <h4>Account Created</h4>
            <p>
              {user.created_at
                ? `${new Date(user.created_at).toLocaleDateString()} at ${new Date(user.created_at).toLocaleTimeString()}`
                : 'Recently'}
            </p>
          </div>
        </div>
        <div className="settings-item">
          <div className="settings-item-content">
            <h4>Total Conversations</h4>
            <p>{userStats?.totalConversations || 0} conversations</p>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="settings-group">
        <label className="settings-label">Account Actions</label>
        <div className="settings-item danger-item">
          <div className="settings-item-content">
            <h4>Sign Out</h4>
            <p>Sign out of your account on this device</p>
          </div>
          <UnifiedButton variant="secondary" onClick={onSignOut}>
            Sign Out
          </UnifiedButton>
        </div>
        <div className="settings-item danger-item">
          <div className="settings-item-content">
            <h4>Clear All Chats</h4>
            <p>Delete all your conversations and start fresh. This action cannot be undone.</p>
          </div>
          <UnifiedButton variant="danger" onClick={onClearChats} title="Clear all conversations">
            Clear
          </UnifiedButton>
        </div>
        <div className="settings-item danger-item">
          <div className="settings-item-content">
            <h4>Delete Account</h4>
            <p>Permanently delete your account and all data</p>
          </div>
          <UnifiedButton variant="danger" onClick={onDeleteAccount}>
            Delete
          </UnifiedButton>
        </div>
      </div>
    </div>
  );
}

