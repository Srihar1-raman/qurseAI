'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import type { AccountSectionProps } from '@/lib/types';

export default function AccountSection({ 
  user, 
  userStats, 
  onSignOut, 
  onClearChats, 
  onDeleteAccount 
}: AccountSectionProps) {
  const { resolvedTheme, mounted } = useTheme();

  const getConnectedProvider = (email?: string) => {
    if (email?.includes('@gmail.com')) return 'google';
    if (email?.includes('@github.com')) return 'github';
    return 'email';
  };

  if (!user) {
    return (
      <div className="settings-section">
        <h2>Account Settings</h2>
        <div className="account-signin-prompt">
          <p>Sign in to manage your account settings</p>
          <button className="settings-btn-primary">Sign In</button>
        </div>
      </div>
    );
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
              Connected via {getConnectedProvider(user.email) === 'google' ? 'Google' : 'Email'}
            </p>
          </div>
        </div>
      </div>

      {/* Linked Providers */}
      <div className="settings-group">
        <label className="settings-label">Linked Accounts</label>
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
            <span className={`provider-status ${getConnectedProvider(user.email) === 'google' ? 'connected' : 'not-connected'}`}>
              {getConnectedProvider(user.email) === 'google' ? 'Connected' : 'Not Connected'}
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
            <span className={`provider-status ${getConnectedProvider(user.email) === 'github' ? 'connected' : 'not-connected'}`}>
              {getConnectedProvider(user.email) === 'github' ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
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
            <p>Recently</p>
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
          <button className="settings-btn-secondary-small" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
        <div className="settings-item danger-item">
          <div className="settings-item-content">
            <h4>Clear All Chats</h4>
            <p>Delete all your conversations and start fresh. This action cannot be undone.</p>
          </div>
          <button className="settings-btn-danger-small" onClick={onClearChats} title="Clear all conversations">
            Clear
          </button>
        </div>
        <div className="settings-item danger-item">
          <div className="settings-item-content">
            <h4>Delete Account</h4>
            <p>Permanently delete your account and all data</p>
          </div>
          <button className="settings-btn-danger-small" onClick={onDeleteAccount}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

