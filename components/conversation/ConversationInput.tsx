/**
 * Conversation input component
 * Handles message input, model selection, and web search mode
 */

import React from 'react';
import { useTheme } from '@/lib/theme-provider';
import { Icon } from '@/components/icons';
import ModelSelector from '@/components/homepage/ModelSelector';
import WebSearchSelector from '@/components/homepage/WebSearchSelector';
import { getOptionFromChatMode, getChatModeFromOption } from '@/lib/conversation/chat-mode-utils';
import { ContextIndicator } from './ContextIndicator';
import type { ContextUsage } from './types';

interface ConversationInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isLoading: boolean;
  chatMode: string;
  onChatModeChange: (mode: string) => void;
  onStop?: () => void;
  showStopButton?: boolean;
  disabled?: boolean;
  onDisabledClick?: () => void;
  contextUsage?: ContextUsage | null;
  showSelectors?: boolean;
}

export function ConversationInput({
  input,
  onInputChange,
  onSubmit,
  onKeyPress,
  textareaRef,
  isLoading,
  chatMode,
  onChatModeChange,
  onStop,
  showStopButton = false,
  disabled = false,
  onDisabledClick,
  contextUsage,
  showSelectors = true,
}: ConversationInputProps) {
  const { resolvedTheme, mounted } = useTheme();

  return (
    <div className="input-section">
      <div className="input-section-content">
        <form onSubmit={onSubmit} className="input-container conversation-input-container">
          <div
            onClick={(e) => {
              if (disabled && onDisabledClick) {
                e.preventDefault();
                e.stopPropagation();
                onDisabledClick();
              }
            }}
            onMouseDown={(e) => {
              if (disabled && onDisabledClick) {
                e.preventDefault();
                e.stopPropagation();
                onDisabledClick();
              }
            }}
            onTouchStart={(e) => {
              if (disabled && onDisabledClick) {
                e.preventDefault();
                e.stopPropagation();
                onDisabledClick();
              }
            }}
            style={{
              position: 'relative',
              width: '100%',
              cursor: disabled ? 'not-allowed' : 'text',
              pointerEvents: disabled ? 'auto' : 'auto',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
              onClick={(e) => {
                if (disabled && onDisabledClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDisabledClick();
                }
              }}
              onFocus={(e) => {
                if (disabled && onDisabledClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDisabledClick();
                }
              }}
              onKeyDown={(e) => {
                if (disabled && onDisabledClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDisabledClick();
                }
              }}
              onMouseDown={(e) => {
                if (disabled && onDisabledClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDisabledClick();
                }
              }}
              placeholder="Message Qurse..."
              className="main-input conversation-input"
              rows={1}
              disabled={isLoading || disabled}
              style={disabled ? { pointerEvents: 'none' } : undefined}
            />
          </div>

          <div className="input-buttons-background" />

          <div className="input-actions-left">
            {showSelectors && (
              <>
                <div className="input-model-selector">
                  <ModelSelector showChevron={false} />
                </div>

                <div className="input-model-selector">
                  <WebSearchSelector
                    selectedOption={getOptionFromChatMode(chatMode)}
                    onSelectOption={(optionName) => {
                      onChatModeChange(getChatModeFromOption(optionName));
                    }}
                    showChevron={false}
                  />
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                // TODO: Implement attach file functionality
              }}
              className="attach-btn"
              title="Attach file"
            >
              <Icon
                name="attach"
                size={16}
                aria-label="Attach"
              />
            </button>

            <ContextIndicator contextUsage={contextUsage || null} />
          </div>

          <div className="input-actions-right">
            {showStopButton && onStop ? (
              <button
                type="button"
                className="send-btn active"
                title="Stop generation"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStop();
                }}
              >
                <div style={{ opacity: 1 }}>
                  <Icon
                    name="stop"
                    size={16}
                    aria-label="Stop"
                    className="icon-active"
                  />
                </div>
              </button>
            ) : (
              <button
                type="submit"
                className={`send-btn ${input.trim() ? 'active' : ''}`}
                title="Send message"
                disabled={!input.trim() || isLoading}
              >
                <div style={{ opacity: 1 }}>
                  <Icon
                    name="send"
                    size={16}
                    aria-label="Send"
                    className={input.trim() ? "icon-active" : ""}
                  />
                </div>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
