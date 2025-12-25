'use client';

import { useState, useEffect } from 'react';
import { UnifiedButton } from '@/components/ui/UnifiedButton';
import { useToast } from '@/lib/contexts/ToastContext';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('settings/system');

export default function SystemSection() {
  const [customPrompt, setCustomPrompt] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  // Load custom prompt from preferences on mount
  useEffect(() => {
    async function loadCustomPrompt() {
      try {
        const response = await fetch('/api/user/preferences');
        if (response.ok) {
          const data = await response.json();
          setCustomPrompt(data.custom_prompt || '');
        }
      } catch (error) {
        logger.error('Failed to load custom prompt', error);
      }
    }

    loadCustomPrompt();
  }, []);

  // Detect changes (track if different from loaded value)
  const [initialPrompt, setInitialPrompt] = useState('');
  useEffect(() => {
    if (initialPrompt === '' && customPrompt !== '') {
      setInitialPrompt(customPrompt);
    }
    setHasChanges(customPrompt !== initialPrompt);
  }, [customPrompt, initialPrompt]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_prompt: customPrompt.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save custom prompt');
      }

      setInitialPrompt(customPrompt);
      setHasChanges(false);
      showSuccess('Custom system prompt saved successfully');
    } catch (error) {
      logger.error('Failed to save custom prompt', error);
      showError('Failed to save custom prompt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const newValue = '';
    setCustomPrompt(newValue);
    setHasChanges(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_prompt: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset custom prompt');
      }

      setInitialPrompt(newValue);
      setHasChanges(false);
      showSuccess('Custom system prompt reset to default');
    } catch (error) {
      logger.error('Failed to reset custom prompt', error);
      showError('Failed to reset custom prompt. Please try again.');
    }
  };

  const characterCount = customPrompt.length;
  const maxLength = 5000;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className="settings-section">
      <h2>System Settings</h2>

      <div className="settings-group">
        <label className="settings-label">Custom System Prompt</label>
        <p className="settings-description">
          Add custom instructions that will be applied to all conversations alongside mode-specific prompts.
          This helps define the AI&apos;s behavior, role, and context for all your chats.
        </p>
        <textarea
          className="settings-textarea"
          placeholder="Enter custom instructions for the AI assistant...&#10;&#10;Examples:&#10;- Always explain your reasoning step by step&#10;- Use simple language and avoid jargon&#10;- Provide code examples when relevant"
          rows={8}
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          maxLength={maxLength}
          style={{
            borderColor: isOverLimit ? 'var(--color-error)' : undefined,
          }}
        />
        <div className="settings-textarea-footer">
          <span className={`character-count ${isOverLimit ? 'over-limit' : ''}`}>
            {characterCount}/{maxLength} characters
            {isOverLimit && ' (exceeds limit)'}
          </span>
        </div>
        <div className="settings-textarea-actions">
          <UnifiedButton
            variant="secondary"
            onClick={handleReset}
            disabled={isSaving || !customPrompt}
          >
            Reset to Default
          </UnifiedButton>
          <UnifiedButton
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !hasChanges || isOverLimit}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </UnifiedButton>
        </div>
        {hasChanges && !isOverLimit && (
          <p className="settings-hint">You have unsaved changes</p>
        )}
        {isOverLimit && (
          <p className="settings-error">Please reduce your prompt to {maxLength} characters or less</p>
        )}
      </div>
    </div>
  );
}
