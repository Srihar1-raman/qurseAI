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
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    // Initialize from localStorage if available (for instant UI)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_default_model');
      if (saved) return saved;
    }
    return 'openai/gpt-oss-120b'; // Default free model
  });
  const [chatMode, setChatMode] = useState<string>('chat'); // Default chat mode
  const { user } = useAuth();

  // Load user's default model from preferences on mount
  useEffect(() => {
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

