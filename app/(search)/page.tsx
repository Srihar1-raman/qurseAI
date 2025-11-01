'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/homepage/Hero';
import ModelSelector from '@/components/homepage/ModelSelector';
import DeepSearchButton from '@/components/homepage/DeepSearchButton';
import WebSearchSelector from '@/components/homepage/WebSearchSelector';
import MainInput from '@/components/homepage/MainInput';
import HistorySidebar from '@/components/layout/history/HistorySidebar';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function HomePage() {
  const [selectedSearchOption, setSelectedSearchOption] = useState('Chat');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="homepage-container">
      <Header 
        user={user}
        showHistoryButton={true}
        onHistoryClick={() => setIsHistoryOpen(true)}
      />
      
      {/* Main Content */}
      <main 
        className="flex-1 flex flex-col justify-center items-center px-5 py-10 max-w-3xl mx-auto w-full"
      >
        {/* Error Test Link - Remove this in production */}
        <Link 
          href="/test-errors"
          style={{
            marginBottom: '1rem',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'var(--color-bg-hover)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontSize: '12px',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-primary)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          🧪 Test Error Handling
        </Link>
        
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
      
      {/* History Sidebar */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
