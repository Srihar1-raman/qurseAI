'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/homepage/Hero';
import ModelSelector from '@/components/homepage/ModelSelector';
import DeepSearchButton from '@/components/homepage/DeepSearchButton';
import WebSearchSelector from '@/components/homepage/WebSearchSelector';
import MainInput from '@/components/homepage/MainInput';
import HistorySidebar from '@/components/layout/history/HistorySidebar';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useConversationId } from '@/hooks/use-conversation-id';
import { SidebarProvider } from '@/lib/contexts/SidebarContext';

// Lazy load ConversationClient to code split AI SDK
// AI SDK code is only loaded when needed
const ConversationClient = dynamic(
  () => import('@/components/conversation/ConversationClient').then(mod => ({ default: mod.ConversationClient })),
  {
    loading: () => (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        color: 'var(--color-text)'
      }}>
        Loading conversation...
      </div>
    ),
  }
);

export default function HomePage() {
  const searchParams = useSearchParams();
  const [selectedSearchOption, setSelectedSearchOption] = useState('Chat');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { user } = useAuth();

  // Extract conversation ID from URL pathname using hook
  const conversationId = useConversationId();

  // Check if URL has message params (for Phase 2 - MainInput uses URL params)
  const hasInitialMessageParam = useMemo(() => {
    return !!searchParams.get('message');
  }, [searchParams]);

  // Handle New Chat button click
  const handleNewChat = () => {
    // Update URL instantly (no navigation)
    window.history.replaceState({}, '', '/');
    // HomePage will detect URL change via usePathname() and show homepage UI
  };

  // Always mount ConversationClient (matching Scira's pattern)
  // Conditionally show homepage UI or ConversationClient based on conversationId
  return (
    <SidebarProvider>
    <div className="homepage-container">
      <Header 
        user={user}
        showHistoryButton={true}
        onHistoryClick={() => setIsHistoryOpen(true)}
        showNewChatButton={!!conversationId}
        onNewChatClick={handleNewChat}
      />
      
      {/* Show homepage UI when no conversation */}
      {!conversationId && (
        <>
      <main 
        className="flex-1 flex flex-col justify-center items-center px-5 py-10 max-w-3xl mx-auto w-full"
      >
        <Hero />
        
        {/* Input comes FIRST */}
        <div style={{ marginTop: '12px', marginBottom: '8px', width: '100%' }}>
          <MainInput />
        </div>

        {/* Control Buttons come BELOW the input */}
        <div 
          className="flex gap-3 flex-wrap justify-center items-center"
          style={{ 
            marginTop: '0',
            marginBottom: '0',
          }}
        >
          <ModelSelector />
          
          <DeepSearchButton />
          
          <WebSearchSelector
            selectedOption={selectedSearchOption}
            onSelectOption={setSelectedSearchOption}
          />
        </div>
      </main>

      <Footer />
        </>
      )}
      
      {/* Always mount ConversationClient (matching Scira's pattern) */}
      {/* When conversationId exists, it's visible; when null, it's hidden but mounted */}
      {/* This pre-initializes useChat hook for instant sends when conversation starts */}
      <div style={{ display: conversationId ? 'block' : 'none' }}>
        <ConversationClient
          conversationId={conversationId || 'temp-new'}
          initialMessages={[]}
          initialHasMore={false}
          initialDbRowCount={0}
          hasInitialMessageParam={hasInitialMessageParam}
        />
      </div>
      
      {/* History Sidebar */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
    </SidebarProvider>
  );
}
