'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mock user for UI testing (will be replaced with real auth later)
  const mockUser: User = {
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: undefined,
  };

  const handleSignOut = () => {
    // Will implement real sign out logic when auth is added
    console.log('Sign out clicked');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user: mockUser, 
        isAuthenticated: true,
        signOut: handleSignOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

