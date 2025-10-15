/**
 * Conversation Context
 * Manages selected model and chat mode across homepage and conversation page
 */

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

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

