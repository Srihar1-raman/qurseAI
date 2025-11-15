'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DeleteAccountModal from '@/components/settings/DeleteAccountModal';
import ClearChatsModal from '@/components/settings/ClearChatsModal';
import ClearHistoryModal from '@/components/layout/history/ClearHistoryModal';
import AuthButton from '@/components/auth/AuthButton';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';

export default function UIComponentsTestPage() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clearChatsModalOpen, setClearChatsModalOpen] = useState(false);
  const [clearHistoryModalOpen, setClearHistoryModalOpen] = useState(false);
  const [baseModalOpen, setBaseModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingChats, setIsClearingChats] = useState(false);
  const { resolvedTheme, mounted } = useTheme();
  const { success, error, warning, info } = useToast();

  const mockUserStats = {
    totalConversations: 42,
    messagesThisMonth: 150,
    lastLoginAt: '2024-01-15T10:30:00Z',
  };

  const handleDeleteAccount = () => {
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeleteConfirmation('');
      success('Account deleted (mock)');
    }, 2000);
  };

  const handleClearChats = () => {
    setIsClearingChats(true);
    setTimeout(() => {
      setIsClearingChats(false);
      setClearChatsModalOpen(false);
      success('All chats cleared (mock)');
    }, 2000);
  };

  const handleClearHistory = () => {
    setClearHistoryModalOpen(false);
    success('History cleared (mock)');
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '40px', textAlign: 'center' }}>
        UI Components Test Page
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '60px' }}>
        All reusable UI components in their current state
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
        
        {/* Section 0: Proposed Solution - Base Modal vs ConfirmModal */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '30px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-primary)' }}>
            🎯 PROPOSED SOLUTION: Base Modal vs ConfirmModal
          </h2>
          <div style={{ padding: '20px', border: '2px solid var(--color-primary)', borderRadius: '8px', background: 'var(--color-bg-secondary)', marginBottom: '30px' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              <strong>Base Modal</strong> = Just the wrapper (overlay + container). You put your own content inside.<br/>
              <strong>ConfirmModal</strong> = Ready-to-use confirmation dialog built on top of Base Modal. Has title, message, buttons already.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Base Modal Example */}
            <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Base Modal (Wrapper Only)</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                This is just the overlay + content container. You can put ANY content inside.
                <br/><strong>Use case:</strong> Custom modals, forms, complex content
              </p>
              <button
                onClick={() => setBaseModalOpen(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  border: 'none',
                }}
              >
                Open Base Modal (Custom Content)
              </button>
            </div>

            {/* ConfirmModal Example */}
            <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>ConfirmModal (Ready-to-Use)</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Built on top of Base Modal. Has title, message, cancel/confirm buttons already.
                <br/><strong>Use case:</strong> Delete confirmations, clear confirmations, any yes/no dialogs
              </p>
              <button
                onClick={() => setConfirmModalOpen(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  border: 'none',
                }}
              >
                Open ConfirmModal (Ready-to-Use)
              </button>
            </div>
          </div>
        </section>

        {/* Section 1: Modals */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '30px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            1. Modals / Confirmation Dialogs
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>DeleteAccountModal</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Uses CSS classes: modal-overlay, modal-content, modal-btn
              </p>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="settings-btn-danger-small"
              >
                Open Delete Account Modal
              </button>
            </div>

            <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>ClearChatsModal</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Uses CSS classes: modal-overlay, modal-content, modal-btn
              </p>
              <button
                onClick={() => setClearChatsModalOpen(true)}
                className="settings-btn-danger-small"
              >
                Open Clear Chats Modal
              </button>
            </div>

            <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>ClearHistoryModal</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Uses inline styles (inconsistent with others)
              </p>
              <button
                onClick={() => setClearHistoryModalOpen(true)}
                className="settings-btn-danger-small"
              >
                Open Clear History Modal
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Auth Buttons */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '30px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            2. Auth / Sign-In Buttons
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* AuthButton Component */}
            <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>AuthButton Component (OAuth)</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Used in login/signup pages - Uses inline styles
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px' }}>
                <AuthButton provider="github" />
                <AuthButton provider="google" />
                <AuthButton provider="twitter" />
              </div>
            </div>

            {/* Header Login/Signup Buttons */}
            <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Header Login/Signup Buttons</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Used in Header - Inline styles, different from AuthButton
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link href="/login">
                  <button
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      background: 'var(--color-text)',
                      color: 'var(--color-bg)',
                      border: 'none',
                    }}
                  >
                    Log in
                  </button>
                </Link>
                <Link href="/signup">
                  <button
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: 'transparent',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                    className="hover:bg-bg-hover"
                  >
                    Sign up
                  </button>
                </Link>
              </div>
            </div>

            {/* HistorySidebar Sign In Button */}
            <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>HistorySidebar Sign In Button</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Used in HistorySidebar - Inline styles, different styling
              </p>
              <Link 
                href="/login"
                style={{
                  marginTop: '16px',
                  padding: '6px 14px',
                  background: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </Link>
            </div>

            {/* AccountSection Sign In Button */}
            <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>AccountSection Sign In Button</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Used in AccountSection - Uses CSS class settings-btn-primary
              </p>
              <button
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  border: 'none',
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Button Variants */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '30px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            3. Button Variants (Settings)
          </h2>
          <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Primary Buttons</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      background: 'var(--color-text)',
                      color: 'var(--color-bg)',
                      border: 'none',
                    }}
                  >
                    Primary
                  </button>
                  <button
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      background: 'var(--color-text)',
                      color: 'var(--color-bg)',
                      border: 'none',
                    }}
                  >
                    Primary Small
                  </button>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Secondary Buttons</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: 'transparent',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                    className="hover:bg-bg-hover"
                  >
                    Secondary
                  </button>
                  <button
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: 'transparent',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                    className="hover:bg-bg-hover"
                  >
                    Secondary Small
                  </button>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Danger Buttons</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button className="settings-btn-danger-small">Danger Small</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Modal Buttons */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '30px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            4. Modal Buttons
          </h2>
          <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                className="hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Toast System */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '30px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            5. Toast System (Already Unified ✅)
          </h2>
          <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
              Toast system is already unified - using ToastContext
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => success('Success message!')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  border: 'none',
                }}
              >
                Show Success Toast
              </button>
              <button 
                onClick={() => error('Error message!')}
                className="settings-btn-danger-small"
              >
                Show Error Toast
              </button>
              <button 
                onClick={() => warning('Warning message!')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                className="hover:bg-bg-hover"
              >
                Show Warning Toast
              </button>
              <button 
                onClick={() => info('Info message!')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                className="hover:bg-bg-hover"
              >
                Show Info Toast
              </button>
            </div>
          </div>
        </section>

        {/* Section 6: Inline Styled Buttons (ClearHistoryModal) */}
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '30px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
            6. Inline Styled Buttons (Inconsistent)
          </h2>
          <div style={{ padding: '20px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-secondary)' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
              Used in ClearHistoryModal - Inline styles instead of classes
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                style={{
                  padding: '6px 14px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                className="hover:bg-bg-hover"
              >
                Cancel (Inline)
              </button>
              <button
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear All (Inline)
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* Proposed Solution Modals - Examples */}
      {/* Base Modal - Custom Content */}
      {baseModalOpen && (
        <div className="modal-overlay" onClick={() => setBaseModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Base Modal Example</h3>
            <p className="modal-text">
              This is a <strong>Base Modal</strong> - just the wrapper. You can put ANY content here.
            </p>
            <div style={{ padding: '16px', background: 'var(--color-bg-secondary)', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                You could put forms, images, complex layouts, anything you want inside this modal.
              </p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setBaseModalOpen(false)}
                className="modal-btn modal-btn-cancel"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ConfirmModal - Ready-to-Use */}
      {confirmModalOpen && (
        <div className="modal-overlay" onClick={() => setConfirmModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title danger">Confirm Action</h3>
            <p className="modal-text">
              This is a <strong>ConfirmModal</strong> - ready to use with title, message, and buttons.
            </p>
            <p className="modal-text">
              It's built on top of Base Modal, but has all the common confirmation dialog parts already included.
            </p>
            <p className="modal-warning">
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="modal-btn modal-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmModalOpen(false);
                  success('Action confirmed!');
                }}
                className="modal-btn modal-btn-danger"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Modals */}
      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteConfirmation('');
        }}
        onConfirm={handleDeleteAccount}
        deleteConfirmation={deleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
        isDeleting={isDeleting}
        userStats={mockUserStats}
      />

      <ClearChatsModal
        isOpen={clearChatsModalOpen}
        onClose={() => setClearChatsModalOpen(false)}
        onConfirm={handleClearChats}
        isClearingChats={isClearingChats}
        userStats={mockUserStats}
      />

      <ClearHistoryModal
        isOpen={clearHistoryModalOpen}
        onClose={() => setClearHistoryModalOpen(false)}
        onConfirm={handleClearHistory}
      />

      <div style={{ marginTop: '60px', padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Notes</h3>
        <ul style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Modals: 3 different implementations - 2 use CSS classes, 1 uses inline styles</li>
          <li>Auth Buttons: 4 different implementations with inconsistent styling</li>
          <li>Button Variants: Mix of CSS classes and inline styles</li>
          <li>Toast System: Already unified ✅</li>
          <li>All components are functional - test interactions to see current behavior</li>
        </ul>
      </div>
    </div>
  );
}

