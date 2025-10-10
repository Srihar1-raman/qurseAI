'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/homepage/Hero';
import ModelSelector from '@/components/homepage/ModelSelector';
import DeepSearchButton from '@/components/homepage/DeepSearchButton';
import WebSearchSelector from '@/components/homepage/WebSearchSelector';
import MainInput from '@/components/homepage/MainInput';
import HistorySidebar from '@/components/layout/history/HistorySidebar';

export default function HomePage() {
  const [selectedModel, setSelectedModel] = useState('GPT-OSS 120B');
  const [selectedSearchOption, setSelectedSearchOption] = useState('Chat');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Mock user for testing logged-in state (will come from auth later)
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: undefined
  };

  return (
    <div className="homepage-container">
      <Header 
        user={mockUser}
        showHistoryButton={true}
        onHistoryClick={() => setIsHistoryOpen(true)}
      />
      
      {/* Main Content */}
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
          <ModelSelector
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            selectedWebSearchOption={selectedSearchOption}
          />
          
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
