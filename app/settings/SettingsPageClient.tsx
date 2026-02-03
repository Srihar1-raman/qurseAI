'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AccountSection from '@/components/settings/AccountSection';
import GeneralSection from '@/components/settings/GeneralSection';
import PaymentSection from '@/components/settings/PaymentSection';
import SystemSection from '@/components/settings/SystemSection';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useHistorySidebar } from '@/lib/contexts/HistorySidebarContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { createScopedLogger } from '@/lib/utils/logger';
import { SettingsPageSkeleton } from '@/components/ui/SettingsPageSkeleton';

const logger = createScopedLogger('settings/client');

// Lazy load HistorySidebar - only load when sidebar is opened
const HistorySidebar = dynamic(
  () => import('@/components/layout/history/HistorySidebar'),
  { ssr: false }
);

// Lazy load modals - only load when modals are opened
const DeleteAccountModal = dynamic(
  () => import('@/components/settings/DeleteAccountModal'),
  { ssr: false }
);

const ClearChatsModal = dynamic(
  () => import('@/components/settings/ClearChatsModal'),
  { ssr: false }
);

function SettingsPageContent() {
  const [activeSection, setActiveSection] = useState('accounts');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingChats, setIsClearingChats] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [autoSaveConversations, setAutoSaveConversations] = useState(true);
  const [enableSupermemory, setEnableSupermemory] = useState(true);
  const [language, setLanguage] = useState('English');
  const [defaultModel, setDefaultModel] = useState<string>(() => {
    // Initialize from localStorage if available (for instant UI)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_default_model');
      if (saved) return saved;
    }
    return 'openai/gpt-oss-120b';
  });
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  
  const { resolvedTheme, mounted } = useTheme();
  const { user: mockUser, signOut, signOutAllDevices } = useAuth();
  const router = useRouter();

  // Get conversation count from HistorySidebarContext (shared cache)
  const { totalConversationCount, loadConversations, setTotalConversationCount } = useHistorySidebar();
  const [userStats, setUserStats] = useState<{ totalConversations: number }>({ 
    totalConversations: totalConversationCount ?? 0 
  });
  
  // Update userStats when totalConversationCount changes (from context)
  useEffect(() => {
    if (totalConversationCount !== null) {
      setUserStats({ totalConversations: totalConversationCount });
    }
  }, [totalConversationCount]);
  
  // Load conversation count if not already loaded (when settings page mounts)
  useEffect(() => {
    if (mockUser && mockUser.id && totalConversationCount === null) {
      // Trigger loadConversations which will fetch count asynchronously
      loadConversations();
    }
    // loadConversations is stable (wrapped in useCallback in context with [user] dependency)
    // We include it in deps for correctness, but effect only runs when user/count changes
  }, [mockUser?.id, totalConversationCount, loadConversations]);

  // Load user preferences on mount
  useEffect(() => {
    if (!mockUser?.id) {
      setIsLoadingPreferences(false);
      return;
    }

    async function loadPreferences() {
      try {
        setIsLoadingPreferences(true);
        const response = await fetch('/api/user/preferences');
        
        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated - use defaults
            setIsLoadingPreferences(false);
            return;
          }
          throw new Error('Failed to load preferences');
        }

        const preferences = await response.json();
        setAutoSaveConversations(preferences.auto_save_conversations ?? true);
        setEnableSupermemory(preferences.enable_supermemory ?? true);
        setLanguage(preferences.language ?? 'English');
        setDefaultModel(preferences.default_model ?? 'openai/gpt-oss-120b');
        // Cache to localStorage for instant load on next visit
        if (typeof window !== 'undefined' && preferences.default_model) {
          localStorage.setItem('user_default_model', preferences.default_model);
        }

        // Sync theme from database to theme provider
        if (preferences.theme && typeof window !== 'undefined') {
          const currentTheme = localStorage.getItem('theme');
          if (currentTheme !== preferences.theme) {
            // Update theme provider if different
            localStorage.setItem('theme', preferences.theme);
            // Trigger theme update by dispatching a custom event
            window.dispatchEvent(new CustomEvent('theme-sync', { detail: { theme: preferences.theme } }));
          }
        }
      } catch (error) {
        logger.error('Error loading preferences', error);
        // Use defaults on error
      } finally {
        setIsLoadingPreferences(false);
      }
    }

    loadPreferences();
  }, [mockUser?.id]);
  const { error: showToastError, warning: showToastWarning, success: showToastSuccess } = useToast();

  // Immediate save handlers with optimistic UI
  const handleAutoSaveChange = useCallback(async (newValue: boolean) => {
    const oldValue = autoSaveConversations;
    setAutoSaveConversations(newValue); // Optimistic update

    if (!mockUser?.id) return;

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_save_conversations: newValue }),
      });

      if (!response.ok) throw new Error('Failed to save');
      showToastSuccess('Settings saved');
    } catch (error) {
      setAutoSaveConversations(oldValue); // Revert on error
      showToastError('Failed to save settings');
      logger.error('Error saving auto-save preference', error);
    }
  }, [autoSaveConversations, mockUser?.id, showToastSuccess, showToastError]);

  const handleSupermemoryChange = useCallback(async (newValue: boolean) => {
    const oldValue = enableSupermemory;
    setEnableSupermemory(newValue); // Optimistic update

    if (!mockUser?.id) return;

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_supermemory: newValue }),
      });

      if (!response.ok) throw new Error('Failed to save');
      showToastSuccess('Settings saved');
    } catch (error) {
      setEnableSupermemory(oldValue); // Revert on error
      showToastError('Failed to save settings');
      logger.error('Error saving supermemory preference', error);
    }
  }, [enableSupermemory, mockUser?.id, showToastSuccess, showToastError]);

  const handleLanguageChange = useCallback(async (newValue: string) => {
    const oldValue = language;
    setLanguage(newValue); // Optimistic update

    if (!mockUser?.id) return;

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newValue }),
      });

      if (!response.ok) throw new Error('Failed to save');
      showToastSuccess('Settings saved');
    } catch (error) {
      setLanguage(oldValue); // Revert on error
      showToastError('Failed to save settings');
      logger.error('Error saving language preference', error);
    }
  }, [language, mockUser?.id, showToastSuccess, showToastError]);

  const handleDefaultModelChange = useCallback(async (newValue: string) => {
    const oldValue = defaultModel;
    setDefaultModel(newValue); // Optimistic update

    // Update localStorage immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_default_model', newValue);
    }

    if (!mockUser?.id) return;

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_model: newValue }),
      });

      if (!response.ok) throw new Error('Failed to save');
      showToastSuccess('Settings saved');
    } catch (error) {
      setDefaultModel(oldValue); // Revert on error
      showToastError('Failed to save settings');
      logger.error('Error saving default model preference', error);
    }
  }, [defaultModel, mockUser?.id, showToastSuccess, showToastError]);

  // Read tab and section from URL using nuqs - no Suspense needed!
  const [tab] = useQueryState('tab', parseAsString);
  const [section] = useQueryState('section', parseAsString);

  // Handle URL parameters for section and pricing redirect
  useEffect(() => {
    if (tab === 'pricing') {
      router.replace('/pricing');
      return;
    }
    
    if (section && ['accounts', 'general', 'payment', 'system'].includes(section)) {
      setActiveSection(section);
    } else {
      setActiveSection('accounts');
    }
  }, [tab, section, router]);

  // Update localStorage immediately when defaultModel changes (for instant UI sync)
  useEffect(() => {
    if (defaultModel && typeof window !== 'undefined') {
      localStorage.setItem('user_default_model', defaultModel);
    }
  }, [defaultModel]);

  // Wrap handleSignOut with useCallback for stable reference
  const handleSignOut = useCallback(async () => {
    await signOut(); // Await for clean state
    window.location.href = '/'; // Full reload to clear all cache
  }, [signOut]);

  // Wrap handleDeleteAccount with useCallback for stable reference
  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmation !== 'DELETE') {
      showToastWarning('Please type "DELETE" to confirm account deletion.');
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account deleted successfully - sign out and redirect
      await handleSignOut();
    } catch (error) {
      setIsDeleting(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account. Please try again.';
      showToastError(errorMessage);
      logger.error('Error deleting account', error);
    }
  }, [deleteConfirmation, showToastWarning, showToastError, handleSignOut]);

  // Wrap handleClearAllChats with useCallback for stable reference
  const handleClearAllChats = useCallback(async () => {
    try {
      setIsClearingChats(true);
      
      const response = await fetch('/api/user/conversations', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to clear conversations');
      }

      // Update both local state and context for consistency
      setUserStats({ totalConversations: 0 });
      setTotalConversationCount(0);
      
      // Force refresh history sidebar to clear stale data
      await loadConversations(true);
      
      setShowClearChatsConfirm(false);
      router.push('/');
    } catch (error) {
      setIsClearingChats(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear chats. Please try again.';
      showToastError(errorMessage);
      logger.error('Error clearing conversations', error);
    }
  }, [showToastError, router, setTotalConversationCount, loadConversations]);

  // Memoize sections array (never changes)
  const sections = useMemo(() => [
    { id: 'accounts', label: 'Accounts', icon: 'accounts' },
    { id: 'general', label: 'General', icon: 'general' },
    { id: 'payment', label: 'Payment', icon: 'payment' },
    { id: 'system', label: 'System', icon: 'system' }
  ], []);

  // Wrap handleNewChatClick with useCallback for stable reference
  const handleNewChatClick = useCallback(() => {
    router.push('/');
  }, [router]);

  // Wrap handleHistoryClick with useCallback for stable reference
  const handleHistoryClick = useCallback(() => {
    setIsHistoryOpen(true);
  }, []);

  // Show skeleton while preferences are loading (prevents flash of content)
  if (isLoadingPreferences) {
    return <SettingsPageSkeleton />;
  }

  return (
    <ErrorBoundary>
    <div className="settings-page-container">
      <Header 
        user={mockUser}
        showNewChatButton={true}
        onNewChatClick={handleNewChatClick}
        showHistoryButton={true}
        onHistoryClick={handleHistoryClick}
      />
      
      {/* Settings Tabs */}
      <div className="info-tabs-container">
        <div className="info-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                // Use Next.js router to update URL (maintains router state)
                router.replace(`/settings?section=${section.id}`, { scroll: false });
              }}
              className={`info-tab ${activeSection === section.id ? 'active' : ''}`}
            >
              <Image 
                src={getIconPath(section.icon, resolvedTheme, activeSection === section.id, mounted)} 
                alt={section.label} 
                width={16} 
                height={16} 
                className="icon" 
              />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* History Sidebar - Always mounted for smooth animations */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      
      <main className="settings-main">
        <div className="settings-content">
          {/* Keep all sections mounted to preserve state (use display:none instead of conditional render) */}
          <div style={{ display: activeSection === 'accounts' ? 'block' : 'none' }}>
            <AccountSection
              user={mockUser}
              userStats={userStats}
              onSignOut={handleSignOut}
              onSignOutAllDevices={signOutAllDevices}
              onClearChats={() => setShowClearChatsConfirm(true)}
              onDeleteAccount={() => setShowDeleteConfirm(true)}
            />
          </div>

          <div style={{ display: activeSection === 'general' ? 'block' : 'none' }}>
            <GeneralSection
              autoSaveConversations={autoSaveConversations}
              onAutoSaveChange={handleAutoSaveChange}
              enableSupermemory={enableSupermemory}
              onSupermemoryChange={handleSupermemoryChange}
              language={language}
              onLanguageChange={handleLanguageChange}
              user={mockUser}
              defaultModel={defaultModel}
              onDefaultModelChange={handleDefaultModelChange}
            />
          </div>

          <div style={{ display: activeSection === 'payment' ? 'block' : 'none' }}>
            <PaymentSection />
          </div>

          <div style={{ display: activeSection === 'system' ? 'block' : 'none' }}>
            <SystemSection />
          </div>
        </div>
      </main>

      <Footer />

      {/* Lazy load modals only when opened */}
      {showDeleteConfirm && (
        <DeleteAccountModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteConfirmation('');
          }}
          onConfirm={handleDeleteAccount}
          deleteConfirmation={deleteConfirmation}
          setDeleteConfirmation={setDeleteConfirmation}
          isDeleting={isDeleting}
          userStats={userStats}
        />
      )}

      {showClearChatsConfirm && (
        <ClearChatsModal
          isOpen={showClearChatsConfirm}
          onClose={() => setShowClearChatsConfirm(false)}
          onConfirm={handleClearAllChats}
          isClearingChats={isClearingChats}
          userStats={userStats}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}

export default function SettingsPageClient() {
  return <SettingsPageContent />;
}

