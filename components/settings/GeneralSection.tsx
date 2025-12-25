'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import type { GeneralSectionProps } from '@/lib/types';
import { UnifiedButton } from '@/components/ui/UnifiedButton';
import { ModelPreferenceSelector } from '@/components/settings/ModelPreferenceSelector';
import { StyledDropdown } from '@/components/settings/StyledDropdown';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('components/settings/GeneralSection');

export default function GeneralSection({
  autoSaveConversations,
  setAutoSaveConversations,
  language,
  setLanguage,
  user,
  isSaving,
  onSaveSettings,
  defaultModel,
  setDefaultModel
}: GeneralSectionProps) {
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    
    // Persist theme to database if user is logged in
    if (user) {
      try {
        const response = await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme: newTheme,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.warn('Failed to save theme to database', {
            status: response.status,
            error: errorData.error || 'Unknown error',
          });
        }
      } catch (error) {
        // Silently fail - theme is already saved to localStorage
        logger.error('Error saving theme to database', error);
      }
    }
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
      <StyledDropdown
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'English', label: 'English' },
          { value: 'Spanish', label: 'Spanish' },
          { value: 'French', label: 'French' },
          { value: 'German', label: 'German' },
          { value: 'Chinese', label: 'Chinese' },
          { value: 'Japanese', label: 'Japanese' },
        ]}
        label="Language"
        description="Select your preferred language for the interface."
      />

      {/* Default Model */}
      <ModelPreferenceSelector
        value={defaultModel}
        onChange={setDefaultModel}
      />

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

