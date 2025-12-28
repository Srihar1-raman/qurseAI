'use client';

import { createContext, useContext, ReactNode } from 'react';

interface TypingContextType {
  isTyping: boolean;
}

const TypingContext = createContext<TypingContextType>({
  isTyping: false,
});

export function TypingProvider({ children, isTyping }: { children: ReactNode; isTyping: boolean }) {
  return (
    <TypingContext.Provider value={{ isTyping }}>
      {children}
    </TypingContext.Provider>
  );
}

export function useTyping() {
  const context = useContext(TypingContext);
  return context?.isTyping || false;
}
