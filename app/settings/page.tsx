'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HistorySidebar from '@/components/layout/history/HistorySidebar';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';

function SettingsPageContent() {
  const [activeSection, setActiveSection] = useState('accounts');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingChats, setIsClearingChats] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [userStats, setUserStats] = useState<{ totalConversations: number }>({ totalConversations: 0 });
  const [autoSaveConversations, setAutoSaveConversations] = useState(true);
  const [language, setLanguage] = useState('English');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mock user for testing (will come from auth later)
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: undefined
  };

  // Handle URL parameters for section
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['accounts', 'general', 'payment', 'system'].includes(section)) {
      setActiveSection(section);
    } else {
      setActiveSection('accounts');
    }
  }, [searchParams]);

  // Auto-save settings when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSaveSettings(true);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [autoSaveConversations, language]);

  const handleSaveSettings = async (isAutoSave: boolean = false) => {
    if (!isAutoSave) {
      setIsSaving(true);
      setSaveStatus('saving');
    }
    try {
      // TODO: Implement API call to save settings
      console.log('Saving settings:', { autoSaveConversations, language });
      if (!isAutoSave) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      if (!isAutoSave) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  };

  const handleSignOut = async () => {
    // TODO: Implement sign out logic
    console.log('Sign out');
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type "DELETE" to confirm account deletion.');
      return;
    }
    
    try {
      setIsDeleting(true);
      // TODO: Implement API call to delete account
      console.log('Deleting account');
      await handleSignOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
      alert('Failed to delete account');
    }
  };

  const handleClearAllChats = async () => {
    try {
      setIsClearingChats(true);
      // TODO: Implement API call to clear chats
      console.log('Clearing all chats');
      setUserStats({ totalConversations: 0 });
      setShowClearChatsConfirm(false);
      router.push('/');
    } catch (error) {
      console.error('Error clearing chats:', error);
      setIsClearingChats(false);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    // TODO: Save theme preference to user account
    console.log('Theme changed to:', newTheme);
  };

  const getConnectedProvider = (email: string) => {
    if (email?.includes('@gmail.com')) return 'google';
    if (email?.includes('@github.com')) return 'github';
    return 'email';
  };

  const sections = [
    { id: 'accounts', label: 'Accounts', icon: 'accounts' },
    { id: 'general', label: 'General', icon: 'general' },
    { id: 'payment', label: 'Payment', icon: 'payment' },
    { id: 'system', label: 'System', icon: 'system' }
  ];

  const handleNewChatClick = () => {
    router.push('/');
  };

  const handleHistoryClick = () => {
    setIsHistoryOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header 
        user={mockUser}
        showNewChatButton={true}
        onNewChatClick={handleNewChatClick}
        showHistoryButton={true}
        onHistoryClick={handleHistoryClick}
      />
      
      {/* Settings Tabs - Center aligned below header */}
      <div className="info-tabs-container">
        <div className="info-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                const url = new URL(window.location.href);
                url.searchParams.set('section', section.id);
                window.history.pushState({}, '', url.toString());
              }}
              className={`info-tab ${activeSection === section.id ? 'active' : ''}`}
            >
              <Image 
                src={getIconPath(section.icon, resolvedTheme, activeSection === section.id, mounted)} 
                alt={section.label} 
                width={16} 
                height={16} 
                className="icon" 
              />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '768px', margin: '0 auto', padding: '20px', marginTop: '-20px' }}>
        <div className="settings-content">
          {activeSection === 'accounts' && (
            <div className="settings-section">
              <h2>Account Settings</h2>
              {mockUser ? (
                <>
                  <div className="settings-group">
                    <label className="settings-label">Account Profile</label>
                    <div className="account-info">
                      <div className="account-avatar">
                        {mockUser.avatar_url ? (
                          <Image
                            src={mockUser.avatar_url}
                            alt={mockUser.name || 'User'}
                            width={48}
                            height={48}
                            className="user-avatar-large"
                            style={{ borderRadius: '50%' }}
                          />
                        ) : (
                          <div className="user-avatar-placeholder">
                            {mockUser.name?.charAt(0) || mockUser.email?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="account-details">
                        <h4>{mockUser.name || 'User'}</h4>
                        <p>{mockUser.email}</p>
                        <p className="auth-provider-info">
                          Connected via {getConnectedProvider(mockUser.email) === 'google' ? 'Google' : 'Email'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Linked Providers Section */}
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
                        <span className={`provider-status ${getConnectedProvider(mockUser.email) === 'google' ? 'connected' : 'not-connected'}`}>
                          {getConnectedProvider(mockUser.email) === 'google' ? 'Connected' : 'Not Connected'}
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
                        <span className={`provider-status ${getConnectedProvider(mockUser.email) === 'github' ? 'connected' : 'not-connected'}`}>
                          {getConnectedProvider(mockUser.email) === 'github' ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                  </div>

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

                  <div className="settings-group">
                    <label className="settings-label">Account Actions</label>
                    <div className="settings-item danger-item">
                      <div className="settings-item-content">
                        <h4>Sign Out</h4>
                        <p>Sign out of your account on this device</p>
                      </div>
                      <button 
                        className="settings-btn-secondary-small"
                        onClick={handleSignOut}
                      >
                        Sign Out
                      </button>
                    </div>
                    <div className="settings-item danger-item">
                      <div className="settings-item-content">
                        <h4>Clear All Chats</h4>
                        <p>Delete all your conversations and start fresh. This action cannot be undone.</p>
                      </div>
                      <button 
                        className="settings-btn-danger-small"
                        onClick={() => setShowClearChatsConfirm(true)}
                        title="Clear all conversations"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="settings-item danger-item">
                      <div className="settings-item-content">
                        <h4>Delete Account</h4>
                        <p>Permanently delete your account and all data</p>
                      </div>
                      <button 
                        className="settings-btn-danger-small"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="account-signin-prompt">
                  <p>Sign in to manage your account settings</p>
                  <button className="settings-btn-primary">
                    Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSection === 'general' && (
            <div className="settings-section">
              <h2>General Settings</h2>
              
              <div className="settings-group">
                <div className="settings-item">
                  <div className="settings-item-content">
                    <h4>Theme</h4>
                    <p>Choose your preferred appearance. Auto follows your system settings.</p>
                  </div>
                  <div className="theme-options">
                    {(['auto', 'light', 'dark'] as const).map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => handleThemeChange(themeOption)}
                        className={`theme-btn ${theme === themeOption ? 'active' : ''}`}
                        title={themeOption === 'auto' ? 'Follow system' : themeOption === 'light' ? 'Light theme' : 'Dark theme'}
                      >
                        <Image 
                          src={getIconPath(`theme-${themeOption}`, resolvedTheme, theme === themeOption, mounted)} 
                          alt={themeOption} 
                          width={14} 
                          height={14} 
                          className="icon-sm" 
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-item">
                  <div className="settings-item-content">
                    <h4>Auto-save Conversations</h4>
                    <p>Automatically save your conversations to your account for future reference and access across devices.</p>
                  </div>
                  <div className="settings-toggle">
                    <input 
                      type="checkbox" 
                      id="auto-save" 
                      checked={autoSaveConversations}
                      onChange={(e) => setAutoSaveConversations(e.target.checked)}
                    />
                    <label htmlFor="auto-save"></label>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label">Language</label>
                <p className="settings-description">
                  Select your preferred language for the interface.
                </p>
                <select 
                  className="settings-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                </select>
              </div>

              <div className="settings-group">
                <div className="settings-item">
                  <div className="settings-item-content">
                    <h4>Settings Sync</h4>
                    <p>
                      {mockUser ? 
                        'Your settings are automatically saved to your account and will sync across all devices.' :
                        'Sign in to save your settings and sync them across all devices.'
                      }
                    </p>
                    {saveStatus === 'saved' && (
                      <p className="settings-success">✓ Settings saved successfully!</p>
                    )}
                    {saveStatus === 'error' && (
                      <p className="settings-error">✗ Failed to save settings. Please try again.</p>
                    )}
                    {mockUser && saveStatus === 'idle' && (
                      <p className="settings-note">Settings will be saved automatically when you make changes.</p>
                    )}
                  </div>
                  {mockUser && (
                    <button 
                      className={`settings-btn-secondary-small ${isSaving ? 'loading' : ''}`}
                      onClick={() => handleSaveSettings(false)}
                      disabled={isSaving}
                      title="Manually save settings"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'payment' && (
            <div className="settings-section">
              <h2>Payment & Billing</h2>
              <div className="settings-group">
                <label className="settings-label">Current Plan</label>
                <div className="account-info">
                  <div className="account-details">
                    <h4>Free Plan</h4>
                    <p>0 messages remaining this month</p>
                  </div>
                  <button className="settings-btn-primary">
                    Upgrade Plan
                  </button>
                </div>
              </div>
              <div className="settings-group">
                <label className="settings-label">Payment Method</label>
                <div className="account-info">
                  <div className="account-details">
                    <h4>No payment method</h4>
                    <p>Add a payment method to upgrade</p>
                  </div>
                  <button className="settings-btn-secondary">
                    Add Payment Method
                  </button>
                </div>
              </div>
              <div className="settings-group">
                <label className="settings-label">Billing History</label>
                <p className="settings-description">No billing history available</p>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="settings-section">
              <h2>System Settings</h2>
              <div className="settings-group">
                <label className="settings-label">Custom System Message</label>
                <p className="settings-description">
                  Set a custom system message that will be sent to the AI at the beginning of each conversation. 
                  This helps define the AI's role, behavior, and context for all your chats.
                </p>
                <textarea 
                  className="settings-textarea"
                  placeholder="You are a helpful AI assistant. You are knowledgeable, friendly, and always try to provide accurate and helpful responses..."
                  rows={6}
                  defaultValue="You are a helpful AI assistant. You are knowledgeable, friendly, and always try to provide accurate and helpful responses."
                />
                <div className="settings-textarea-actions">
                  <button className="settings-btn-secondary-small">
                    Reset
                  </button>
                  <button className="settings-btn-primary-small">
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1003,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => {
            setShowDeleteConfirm(false);
            setDeleteConfirmation('');
          }}
        >
          <div 
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 8px 32px var(--color-shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#ef4444'
            }}>
              Delete Account
            </h3>
            <p style={{ 
              margin: '0 0 16px 0', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              This will permanently delete your account and all associated data, including:
            </p>
            <ul style={{
              margin: '0 0 20px 20px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              <li>All conversations ({userStats?.totalConversations || 0} total)</li>
              <li>Account profile and settings</li>
              <li>Any uploaded files and attachments</li>
            </ul>
            <p style={{ 
              margin: '0 0 24px 0', 
              color: '#ef4444',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              This action cannot be undone.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--color-text)'
              }}>
                Type "DELETE" to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text)',
                  fontSize: '14px'
                }}
                disabled={isDeleting}
              />
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmation('');
                }}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== 'DELETE'}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: deleteConfirmation === 'DELETE' ? '#ef4444' : '#6b7280',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: (isDeleting || deleteConfirmation !== 'DELETE') ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: (isDeleting || deleteConfirmation !== 'DELETE') ? 0.6 : 1
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chats Confirmation Modal */}
      {showClearChatsConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1003,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowClearChatsConfirm(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 8px 32px var(--color-shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#ef4444'
            }}>
              Clear All Chats
            </h3>
            <p style={{ 
              margin: '0 0 16px 0', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              This will permanently delete all your conversations ({userStats?.totalConversations || 0} total) and cannot be undone.
            </p>
            <p style={{ 
              margin: '0 0 16px 0', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              This includes:
            </p>
            <ul style={{
              margin: '0 0 16px 20px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              <li>All conversations and messages</li>
              <li>Any uploaded files and attachments</li>
            </ul>
            <p style={{ 
              margin: '0 0 16px 0', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5'
            }}>
              Your account and settings will remain intact.
            </p>
            <p style={{ 
              margin: '0 0 24px 0', 
              color: '#ef4444',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              This action cannot be undone.
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => setShowClearChatsConfirm(false)}
                disabled={isClearingChats}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  borderRadius: '6px',
                  cursor: isClearingChats ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isClearingChats ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllChats}
                disabled={isClearingChats}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: isClearingChats ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isClearingChats ? 0.6 : 1
                }}
              >
                {isClearingChats ? 'Clearing...' : 'Clear All Chats'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
