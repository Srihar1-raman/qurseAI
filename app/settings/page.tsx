'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HistorySidebar from '@/components/layout/history/HistorySidebar';
import AccountSection from '@/components/settings/AccountSection';
import GeneralSection from '@/components/settings/GeneralSection';
import PaymentSection from '@/components/settings/PaymentSection';
import SystemSection from '@/components/settings/SystemSection';
import DeleteAccountModal from '@/components/settings/DeleteAccountModal';
import ClearChatsModal from '@/components/settings/ClearChatsModal';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getConversationCount } from '@/lib/db/queries';

function SettingsPageContent() {
  const [activeSection, setActiveSection] = useState('accounts');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingChats, setIsClearingChats] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [userStats, setUserStats] = useState<{ totalConversations: number }>({ totalConversations: 0 });
  const [autoSaveConversations, setAutoSaveConversations] = useState(true);
  const [language, setLanguage] = useState('English');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const { resolvedTheme, mounted } = useTheme();
  const { user: mockUser, signOut } = useAuth();
  const { error: showToastError, warning: showToastWarning } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle URL parameters for section
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['accounts', 'general', 'payment', 'system'].includes(section)) {
      setActiveSection(section);
    } else {
      setActiveSection('accounts');
    }
  }, [searchParams]);

  // Fetch conversation count on mount
  useEffect(() => {
    if (mockUser && mockUser.id) {
      getConversationCount(mockUser.id)
        .then(count => {
          setUserStats({ totalConversations: count });
        })
        .catch(err => {
          // Silently fail - count will remain 0
          console.error('Failed to fetch conversation count', err);
        });
    }
  }, [mockUser]);

  // Auto-save settings when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSaveSettings(true);
    }, 1000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveConversations, language]);

  const handleSaveSettings = async (isAutoSave: boolean = false) => {
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
  };

  const handleSignOut = async () => {
    signOut();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
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
  };

  const handleClearAllChats = async () => {
    try {
      setIsClearingChats(true);
      // TODO: Implement API call to clear chats
      setUserStats({ totalConversations: 0 });
      setShowClearChatsConfirm(false);
      router.push('/');
    } catch (error) {
      setIsClearingChats(false);
      showToastError('Failed to clear chats. Please try again.');
    }
  };

  const sections = [
    { id: 'accounts', label: 'Accounts', icon: 'accounts' },
    { id: 'general', label: 'General', icon: 'general' },
    { id: 'payment', label: 'Payment', icon: 'payment' },
    { id: 'system', label: 'System', icon: 'system' }
  ];

  const handleNewChatClick = () => {
    router.push('/');
  };

  const handleHistoryClick = () => {
    setIsHistoryOpen(true);
  };

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
                const url = new URL(window.location.href);
                url.searchParams.set('section', section.id);
                window.history.pushState({}, '', url.toString());
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
      
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      
      <main className="settings-main">
        <div className="settings-content">
          {activeSection === 'accounts' && (
            <AccountSection
              user={mockUser}
              userStats={userStats}
              onSignOut={handleSignOut}
              onClearChats={() => setShowClearChatsConfirm(true)}
              onDeleteAccount={() => setShowDeleteConfirm(true)}
            />
          )}

          {activeSection === 'general' && (
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
          )}

          {activeSection === 'payment' && <PaymentSection />}

          {activeSection === 'system' && <SystemSection />}
        </div>
      </main>

      <Footer />

      {/* Modals */}
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

      <ClearChatsModal
        isOpen={showClearChatsConfirm}
        onClose={() => setShowClearChatsConfirm(false)}
        onConfirm={handleClearAllChats}
        isClearingChats={isClearingChats}
        userStats={userStats}
      />
    </div>
    </ErrorBoundary>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
