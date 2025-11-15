'use client';

import { UnifiedButton } from '@/components/ui/UnifiedButton';

export default function SystemSection() {
  return (
    <div className="settings-section">
      <h2>System Settings</h2>
      
      <div className="settings-group">
        <label className="settings-label">Custom System Message</label>
        <p className="settings-description">
          Set a custom system message that will be sent to the AI at the beginning of each conversation. 
          This helps define the AI&apos;s role, behavior, and context for all your chats.
        </p>
        <textarea 
          className="settings-textarea"
          placeholder="You are a helpful AI assistant. You are knowledgeable, friendly, and always try to provide accurate and helpful responses..."
          rows={6}
          defaultValue="You are a helpful AI assistant. You are knowledgeable, friendly, and always try to provide accurate and helpful responses."
        />
        <div className="settings-textarea-actions">
          <UnifiedButton variant="secondary">
            Reset
          </UnifiedButton>
          <UnifiedButton variant="primary">
            Save
          </UnifiedButton>
        </div>
      </div>
    </div>
  );
}


