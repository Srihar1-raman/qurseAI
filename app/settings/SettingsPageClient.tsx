'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const [language, setLanguage] = useState('English');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const { resolvedTheme, mounted } = useTheme();
  const { user: mockUser, signOut, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  
  // Client-side auth check and redirect (handles race condition with server-side check)
  // Wait for auth to initialize, then redirect if not authenticated
  useEffect(() => {
    // Don't redirect while auth is still loading (prevents race condition)
    if (isAuthLoading || hasRedirectedRef.current) {
      return;
    }
    
    // If auth finished loading and no user, redirect to homepage
    if (!mockUser) {
      hasRedirectedRef.current = true;
      logger.debug('Client-side auth check: No user, redirecting to homepage');
      router.replace('/');
    }
  }, [isAuthLoading, mockUser, router]);
  
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
  const { error: showToastError, warning: showToastWarning } = useToast();
  const searchParams = useSearchParams();

  // Handle URL parameters for section
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['accounts', 'general', 'payment', 'system'].includes(section)) {
      setActiveSection(section);
    } else {
      setActiveSection('accounts');
    }
  }, [searchParams]);

  // Wrap handleSaveSettings with useCallback for stable reference
  const handleSaveSettings = useCallback(async (isAutoSave: boolean = false) => {
    if (!isAutoSave) {
      setIsSaving(true);
      setSaveStatus('saving');
    }
    try {
      // TODO: Implement API call to save settings
      if (!isAutoSave) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      if (!isAutoSave) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        showToastError('Failed to save settings. Please try again.');
      }
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  }, [showToastError, autoSaveConversations, language]);

  // Auto-save settings when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSaveSettings(true);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [autoSaveConversations, language, handleSaveSettings]);

  // Wrap handleSignOut with useCallback for stable reference
  const handleSignOut = useCallback(async () => {
    signOut();
    router.push('/');
  }, [signOut, router]);

  // Wrap handleDeleteAccount with useCallback for stable reference
  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmation !== 'DELETE') {
      showToastWarning('Please type "DELETE" to confirm account deletion.');
      return;
    }
    
    try {
      setIsDeleting(true);
      // TODO: Implement API call to delete account
      await handleSignOut();
    } catch (error) {
      setIsDeleting(false);
      showToastError('Failed to delete account. Please try again.');
    }
  }, [deleteConfirmation, showToastWarning, showToastError, handleSignOut]);

  // Wrap handleClearAllChats with useCallback for stable reference
  const handleClearAllChats = useCallback(async () => {
    try {
      setIsClearingChats(true);
      // TODO: Implement API call to clear chats
      // Update both local state and context for consistency
      setUserStats({ totalConversations: 0 });
      setTotalConversationCount(0);
      setShowClearChatsConfirm(false);
      router.push('/');
    } catch (error) {
      setIsClearingChats(false);
      showToastError('Failed to clear chats. Please try again.');
    }
  }, [showToastError, router, setTotalConversationCount]);

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

  // Show skeleton while auth is loading (prevents flash of content)
  if (isAuthLoading) {
    return <SettingsPageSkeleton />;
  }
  
  // Don't render content if no user (redirect will happen in useEffect)
  if (!mockUser) {
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
      
      {/* Lazy load HistorySidebar only when opened */}
      {isHistoryOpen && (
        <HistorySidebar 
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
      
      <main className="settings-main">
        <div className="settings-content">
          {/* Keep all sections mounted to preserve state (use display:none instead of conditional render) */}
          <div style={{ display: activeSection === 'accounts' ? 'block' : 'none' }}>
            <AccountSection
              user={mockUser}
              userStats={userStats}
              onSignOut={handleSignOut}
              onClearChats={() => setShowClearChatsConfirm(true)}
              onDeleteAccount={() => setShowDeleteConfirm(true)}
            />
          </div>

          <div style={{ display: activeSection === 'general' ? 'block' : 'none' }}>
            <GeneralSection
              autoSaveConversations={autoSaveConversations}
              setAutoSaveConversations={setAutoSaveConversations}
              language={language}
              setLanguage={setLanguage}
              user={mockUser}
              saveStatus={saveStatus}
              isSaving={isSaving}
              onSaveSettings={() => handleSaveSettings(false)}
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

