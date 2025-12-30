/**
 * Conversation Context
 * Manages selected model and chat mode across homepage and conversation page
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface ConversationContextType {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  chatMode: string;
  setChatMode: (mode: string) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

interface ConversationProviderProps {
  children: ReactNode;
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-120b'); // Default free model
  const [chatMode, setChatMode] = useState<string>('chat'); // Default chat mode
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuth();

  // Initialize state from localStorage and user preferences on mount (client-side only)
  useEffect(() => {
    // Load from localStorage first (for instant UI)
    let initialMode = 'chat';
    let initialModel = 'openai/gpt-oss-120b';

    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('user_chat_mode');
      const savedModel = localStorage.getItem('user_default_model');
      if (savedMode) initialMode = savedMode;
      if (savedModel) initialModel = savedModel;
    }

    // Apply initial values
    setChatMode(initialMode);
    setSelectedModel(initialModel);

    // Mark as initialized to prevent re-initialization
    setIsInitialized(true);

    // Then load user's default model from preferences (can override localStorage)
    async function loadDefaultModel() {
      try {
        const response = await fetch('/api/user/preferences');
        if (!response.ok) return;

        const preferences = await response.json();
        const defaultModel = preferences.default_model;

        if (defaultModel) {
          setSelectedModel(defaultModel);
          // Cache to localStorage for instant load on next visit
          if (typeof window !== 'undefined') {
            localStorage.setItem('user_default_model', defaultModel);
          }
        }
      } catch (error) {
        console.error('Failed to load default model from preferences:', error);
      }
    }

    loadDefaultModel();
  }, [user?.id]);

  // Persist chatMode changes to localStorage (only after initialization)
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem('user_chat_mode', chatMode);
    }
  }, [chatMode, isInitialized]);

  return (
    <ConversationContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        chatMode,
        setChatMode,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}

