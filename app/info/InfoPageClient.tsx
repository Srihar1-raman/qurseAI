'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { sectionParser } from '@/lib/url-params/parsers';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/lib/contexts/AuthContext';
import { InfoPageSkeleton } from '@/components/ui/InfoPageSkeleton';

// Lazy load HistorySidebar - only load when sidebar is opened
const HistorySidebar = dynamic(
  () => import('@/components/layout/history/HistorySidebar'),
  { ssr: false }
);

function InfoPageContent() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Read section from URL using nuqs - no Suspense needed!
  const [sectionParam, setSectionParam] = useQueryState('section', sectionParser);
  
  // Validate and set active section
  const validSections = ['about', 'terms', 'privacy', 'cookies'] as const;
  const activeSection = (sectionParam && validSections.includes(sectionParam as typeof validSections[number]))
    ? (sectionParam as typeof validSections[number])
    : 'about';

  // Update URL when section changes (two-way binding)
  const setActiveSection = useCallback((section: string) => {
    if (validSections.includes(section as typeof validSections[number])) {
      setSectionParam(section);
    }
  }, [setSectionParam]);

  // Memoize sections array (never changes)
  const sections = useMemo(() => [
    { id: 'about', label: 'About' },
    { id: 'terms', label: 'Terms' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'cookies', label: 'Cookies' }
  ], []);

  // Wrap handleNewChatClick with useCallback for stable reference
  const handleNewChatClick = useCallback(() => {
    router.push('/');
  }, [router]);

  // Wrap handleHistoryClick with useCallback for stable reference
  const handleHistoryClick = useCallback(() => {
    setIsHistoryOpen(true);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header 
        user={user}
        showNewChatButton={true}
        onNewChatClick={handleNewChatClick}
        showHistoryButton={true}
        onHistoryClick={handleHistoryClick}
      />
      
      {/* Info Tabs - Center aligned below header */}
      <div className="info-tabs-container">
        <div className="info-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`info-tab ${activeSection === section.id ? 'active' : ''}`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '768px', margin: '0 auto', padding: '20px', marginTop: '-20px' }}>
        {/* Content Sections */}
        <div className="info-content">
          {activeSection === 'about' && (
            <div className="info-section">
              <h2>About Qurse</h2>
              <p>Qurse is a modern AI chat interface that provides seamless conversations with advanced language models. Our platform offers a clean, intuitive experience for users to interact with AI assistants across multiple models.</p>
              
              <h3>Features</h3>
              <ul>
                <li>Multiple AI models including GPT-4o, Claude 3.5 Sonnet, and more</li>
                <li>Real-time conversation capabilities</li>
                <li>Local storage for conversation history</li>
                <li>Dark and light theme support</li>
                <li>Responsive design for all devices</li>
                <li>Secure authentication options</li>
              </ul>

              <h3>Technology</h3>
              <p>Built with Next.js, TypeScript, and modern web technologies, Qurse provides a fast and reliable chat experience. We integrate with leading AI providers to offer the best possible conversation quality.</p>
            </div>
          )}

          {activeSection === 'terms' && (
            <div className="info-section">
              <h2>Terms of Service</h2>
              <p>By using Qurse, you agree to these terms of service. Please read them carefully before using our platform.</p>
              
              <h3>Acceptance of Terms</h3>
              <p>By accessing and using Qurse, you accept and agree to be bound by the terms and provision of this agreement.</p>
              
              <h3>Use License</h3>
              <p>Permission is granted to temporarily use Qurse for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>
              
              <h3>User Responsibilities</h3>
              <ul>
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You must not use the service for any unlawful purpose</li>
                <li>You must not transmit any harmful or malicious content</li>
                <li>You must respect the intellectual property rights of others</li>
              </ul>
              
              <h3>Limitation of Liability</h3>
              <p>Qurse shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>
              
              <h3>Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of any changes.</p>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="info-section">
              <h2>Privacy Policy</h2>
              <p>Your privacy is important to us. This policy describes how we collect, use, and protect your information.</p>
              
              <h3>Information We Collect</h3>
              <ul>
                <li><strong>Account Information:</strong> Email, name, and profile information when you create an account</li>
                <li><strong>Conversation Data:</strong> Messages you send and receive through our platform</li>
                <li><strong>Usage Data:</strong> How you interact with our service, including features used and time spent</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies</li>
              </ul>
              
              <h3>How We Use Your Information</h3>
              <ul>
                <li>To provide and maintain our chat service</li>
                <li>To process your conversations with AI models</li>
                <li>To improve our platform and user experience</li>
                <li>To communicate with you about our service</li>
                <li>To ensure security and prevent abuse</li>
              </ul>
              
              <h3>Data Storage</h3>
              <p>Conversation data is stored locally in your browser for your convenience. We do not permanently store your conversations on our servers unless you explicitly opt in.</p>
              
              <h3>Data Sharing</h3>
              <p>We do not sell, trade, or otherwise transfer your personal information to third parties except as described in this policy or with your consent.</p>
              
              <h3>Your Rights</h3>
              <p>You have the right to access, correct, or delete your personal information. You can also request a copy of your data or withdraw consent at any time.</p>
            </div>
          )}

          {activeSection === 'cookies' && (
            <div className="info-section">
              <h2>Cookie Policy</h2>
              <p>This policy explains how we use cookies and similar technologies on Qurse.</p>
              
              <h3>What Are Cookies</h3>
              <p>Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience and understand how you use our service.</p>
              
              <h3>Types of Cookies We Use</h3>
              <ul>
                <li><strong>Essential Cookies:</strong> Required for basic website functionality and security</li>
                <li><strong>Authentication Cookies:</strong> Help maintain your login session</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
              </ul>
              
              <h3>How We Use Cookies</h3>
              <ul>
                <li>To keep you signed in during your session</li>
                <li>To remember your theme preferences (dark/light mode)</li>
                <li>To improve website performance and user experience</li>
                <li>To analyze usage patterns and optimize our service</li>
              </ul>
              
              <h3>Managing Cookies</h3>
              <p>You can control and manage cookies through your browser settings. You can delete existing cookies and prevent new ones from being set. However, disabling certain cookies may affect the functionality of our service.</p>
              
              <h3>Third-Party Cookies</h3>
              <p>We may use third-party services that set their own cookies. These services help us provide authentication, analytics, and other features. Please refer to their respective privacy policies for more information.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
      
      {/* History Sidebar - Always mounted for smooth animations */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

export default InfoPageContent;

