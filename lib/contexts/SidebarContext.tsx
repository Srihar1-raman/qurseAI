/**
 * Sidebar Context
 * Provides optimistic update functionality for conversation sidebar
 * Allows MainInput to immediately add conversations to sidebar before API confirmation
 */

'use client';

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import type { Conversation } from '@/lib/types';

interface SidebarContextValue {
  addConversationOptimistically: (conversation: Conversation) => void;
  registerHandler: (handler: (conversation: Conversation) => void) => () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
}

/**
 * SidebarProvider
 * Provides sidebar update functions to child components
 * Handles registration of optimistic update handlers
 */
export function SidebarProvider({ children }: SidebarProviderProps) {
  const [addConversationHandler, setAddConversationHandler] = useState<
    ((conversation: Conversation) => void) | null
  >(null);

  const addConversationOptimistically = useCallback((conversation: Conversation) => {
    // Validate conversation object
    if (!conversation || !conversation.id) {
      return;
    }

    // Call registered handler if available
    if (addConversationHandler) {
      addConversationHandler(conversation);
    }
  }, [addConversationHandler]);

  // Function to register handler (used by HistorySidebar)
  const registerHandler = useCallback((handler: (conversation: Conversation) => void) => {
    setAddConversationHandler(() => handler);
    // Return cleanup function
    return () => setAddConversationHandler(null);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        addConversationOptimistically,
        registerHandler,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

/**
 * useSidebar Hook
 * Provides access to sidebar update functions
 * Returns null-safe functions that do nothing if sidebar not mounted
 */
export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    // Return no-op functions if context not available (graceful degradation)
    return {
      addConversationOptimistically: () => {},
      registerHandler: () => () => {},
    };
  }

  return context;
}

