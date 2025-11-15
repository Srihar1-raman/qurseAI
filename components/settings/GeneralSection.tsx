'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import type { GeneralSectionProps } from '@/lib/types';
import { UnifiedButton } from '@/components/ui/UnifiedButton';

export default function GeneralSection({ 
  autoSaveConversations, 
  setAutoSaveConversations,
  language,
  setLanguage,
  user,
  saveStatus,
  isSaving,
  onSaveSettings
}: GeneralSectionProps) {
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
  };

  return (
    <div className="settings-section">
      <h2>General Settings</h2>
      
      {/* Theme */}
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

      {/* Auto-save */}
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

      {/* Language */}
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

      {/* Settings Sync */}
      <div className="settings-group">
        <div className="settings-item">
          <div className="settings-item-content">
            <h4>Settings Sync</h4>
            <p>
              {user ? 
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
            {user && saveStatus === 'idle' && (
              <p className="settings-note">Settings will be saved automatically when you make changes.</p>
            )}
          </div>
          {user && (
            <UnifiedButton 
              variant="secondary"
              onClick={onSaveSettings}
              disabled={isSaving}
              title="Manually save settings"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </UnifiedButton>
          )}
        </div>
      </div>
    </div>
  );
}

