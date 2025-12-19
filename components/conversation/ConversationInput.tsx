/**
 * Conversation input component
 * Handles message input, model selection, and web search mode
 */

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import ModelSelector from '@/components/homepage/ModelSelector';
import WebSearchSelector from '@/components/homepage/WebSearchSelector';
import { getOptionFromChatMode, getChatModeFromOption } from '@/lib/conversation/chat-mode-utils';

interface ConversationInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isLoading: boolean;
  isRateLimited: boolean;
  chatMode: string;
  onChatModeChange: (mode: string) => void;
}

export function ConversationInput({
  input,
  onInputChange,
  onSubmit,
  onKeyPress,
  textareaRef,
  isLoading,
  isRateLimited,
  chatMode,
  onChatModeChange,
}: ConversationInputProps) {
  const { resolvedTheme, mounted } = useTheme();

  return (
    <div className="input-section">
      <div className="input-section-content">
        <form onSubmit={onSubmit} className="input-container conversation-input-container">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Message Qurse..."
            className="main-input conversation-input"
            rows={1}
            disabled={isLoading}
          />

          <div className="input-buttons-background" />

          <div className="input-actions-left">
            <div className="input-model-selector">
              <ModelSelector />
            </div>

            <div className="input-model-selector">
              <WebSearchSelector
                selectedOption={getOptionFromChatMode(chatMode)}
                onSelectOption={(optionName) => {
                  onChatModeChange(getChatModeFromOption(optionName));
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                // Attach file functionality
              }}
              className="attach-btn"
              title="Attach file"
            >
              <Image
                src={getIconPath('attach', resolvedTheme, false, mounted)}
                alt="Attach"
                width={16}
                height={16}
              />
            </button>
          </div>

          <div className="input-actions-right">
            <button
              type="submit"
              className={`send-btn ${input.trim() ? 'active' : ''}`}
              title="Send message"
              disabled={!input.trim() || isLoading}
            >
              <Image
                src={input.trim() ? '/icon_light/send.svg' : getIconPath('send', resolvedTheme, false, mounted)}
                alt="Send"
                width={16}
                height={16}
              />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

