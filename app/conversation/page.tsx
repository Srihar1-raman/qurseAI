'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import ChatMessage from '@/components/chat/ChatMessage';
import HistorySidebar from '@/components/layout/history/HistorySidebar';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { MODEL_GROUPS, WEB_SEARCH_OPTIONS, isModelCompatibleWithArxiv } from '@/lib/constants';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  model?: string;
}

export default function ConversationPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('GPT-OSS 120B');
  const [selectedWebSearchOption, setSelectedWebSearchOption] = useState('Chat');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isWebSearchDropdownOpen, setIsWebSearchDropdownOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const webSearchDropdownRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, mounted } = useTheme();

  // Mock user for testing logged-in state (will come from auth later)
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: undefined
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea when inputValue changes
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, 200) + 'px';
      
      // If content exceeds max height, scroll to bottom to keep cursor visible
      if (scrollHeight > 200) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    }
  }, [inputValue]);

  // Auto-focus textarea on page load
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
        setModelSearchQuery('');
      }
      if (webSearchDropdownRef.current && !webSearchDropdownRef.current.contains(event.target as Node)) {
        setIsWebSearchDropdownOpen(false);
      }
    };

    if (isModelDropdownOpen || isWebSearchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelDropdownOpen, isWebSearchDropdownOpen]);

  // Filter models based on search query and arxiv compatibility
  const getFilteredModels = () => {
    return Object.values(MODEL_GROUPS)
      .filter(group => group.enabled)
      .map(group => ({
        ...group,
        models: group.models
          .filter(model => 
            !modelSearchQuery ||
            model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
            group.provider.toLowerCase().includes(modelSearchQuery.toLowerCase())
          )
          .map(model => ({
            ...model,
            disabled: selectedWebSearchOption === 'arXiv' && 
                      !isModelCompatibleWithArxiv(model.name, group.provider)
          }))
      }))
      .filter(group => group.models.length > 0);
  };

  const filteredModels = getFilteredModels();

  const handleSendMessage = async () => {
    const messageText = inputValue.trim();
    if (!messageText || isLoading) return;

    const now = Date.now();
    const userMessage: Message = {
      id: `user-${now}`,
      text: messageText,
      isUser: true,
      timestamp: new Date(now).toISOString()
    };

    setInputValue('');
    setIsLoading(true);
    setMessages(currentMessages => [...currentMessages, userMessage]);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        text: `This is a simulated response to: "${messageText}". In production, this would be a real AI response.`,
        isUser: false,
        timestamp: new Date().toISOString(),
        model: selectedModel
      };
      
      setMessages(currentMessages => [...currentMessages, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChatClick = () => {
    router.push('/');
  };

  const handleHistoryClick = () => {
    setIsHistoryOpen(true);
  };

  return (
    <div className="homepage-container">
      <Header 
        user={mockUser}
        showNewChatButton={true}
        onNewChatClick={handleNewChatClick}
        showHistoryButton={true}
        onHistoryClick={handleHistoryClick}
      />
      
      <main className="conversation-main-content">
        {/* Conversation Container */}
        <div className="conversation-container">
          <div className="conversation-thread">
            
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                content={message.text}
                isUser={message.isUser}
                model={message.model}
                onRedo={!message.isUser ? () => {
                  // Handle redo logic
                  console.log('Redo message');
                } : undefined}
              />
            ))}
            
            {isLoading && (
              <div className="message bot-message">
                <div style={{ maxWidth: '95%', marginRight: 'auto' }}>
                  <div className="message-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        backgroundColor: 'var(--color-primary)', 
                        borderRadius: '50%', 
                        animation: 'reasoning 2s infinite linear',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: 'white', 
                          borderRadius: '50%',
                          animation: 'reasoningPulse 1s infinite ease-in-out'
                        }}></div>
                      </div>
                      <span style={{ 
                        color: 'var(--color-text-secondary)', 
                        fontSize: '14px',
                        fontStyle: 'italic'
                      }}>
                        Reasoning...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={conversationEndRef} />
          </div>
        </div>

        {/* Input Section */}
        <div className="input-section">
          <div className="input-section-content">
            <div className="input-container conversation-input-container">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message Qurse..."
                className="main-input conversation-input"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                }}
              />
              
              {/* Background strip behind buttons */}
              <div className="input-buttons-background"></div>
              
              {/* Bottom Left - Model Selector and Attach Button */}
              <div className="input-actions-left">
                {/* Model Selector */}
                <div className="input-model-selector" ref={modelDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="model-selector-btn"
                    title="Select model"
                  >
                    <Image src={getIconPath("model", resolvedTheme, false, mounted)} alt="Model" width={16} height={16} />
                  </button>
                  
                  {isModelDropdownOpen && (
                    <div className="input-dropdown-menu show">
                      {/* Search */}
                      <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>
                        <input
                          type="text"
                          placeholder="Search models..."
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            background: 'var(--color-bg-secondary)',
                            color: 'var(--color-text)',
                            fontSize: '13px',
                            outline: 'none',
                            transition: 'border-color 0.2s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--color-primary)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'var(--color-border)';
                          }}
                        />
                      </div>
                      {/* Models */}
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredModels.map((group) => (
                        <div key={group.provider}>
                          <div style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase'
                          }}>
                            {group.provider}
                          </div>
                          {group.models.map((model) => (
                            <div
                              key={model.name}
                              onClick={() => {
                                if (!model.disabled) {
                                  setSelectedModel(model.name);
                                  setIsModelDropdownOpen(false);
                                  setModelSearchQuery('');
                                }
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                cursor: model.disabled ? 'not-allowed' : 'pointer',
                                background: selectedModel === model.name ? 'var(--color-primary)' : 'transparent',
                                color: selectedModel === model.name ? 'white' : 'var(--color-text)',
                                opacity: model.disabled ? 0.4 : 1
                              }}
                            >
                              {model.name}
                            </div>
                          ))}
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Web Search Selector */}
                <div className="input-model-selector" ref={webSearchDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsWebSearchDropdownOpen(!isWebSearchDropdownOpen)}
                    className="model-selector-btn"
                    title="Select web search option"
                  >
                    <Image 
                      src={getIconPath(
                        selectedWebSearchOption === 'Chat' ? 'chat' : 
                        selectedWebSearchOption === 'Web Search (Exa)' ? 'exa' : 
                        'arxiv-logo',
                        resolvedTheme,
                        false,
                        mounted
                      )} 
                      alt="Web Search" 
                      width={16} 
                      height={16}
                      className={selectedWebSearchOption === 'arXiv' ? 'arxiv-icon' : ''}
                    />
                  </button>
                  
                  {isWebSearchDropdownOpen && (
                    <div className="input-dropdown-menu show">
                      {WEB_SEARCH_OPTIONS.map((option) => (
                        <div
                          key={option.name}
                          onClick={() => {
                            setSelectedWebSearchOption(option.name);
                            setIsWebSearchDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            background: selectedWebSearchOption === option.name ? 'var(--color-primary)' : 'transparent',
                            color: selectedWebSearchOption === option.name ? 'white' : 'var(--color-text)'
                          }}
                        >
                          {option.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attach Button */}
                <button
                  type="button"
                  onClick={() => {/* Attach file functionality */}}
                  className="attach-btn"
                  title="Attach file"
                >
                  <Image src={getIconPath("attach", resolvedTheme, false, mounted)} alt="Attach" width={16} height={16} />
                </button>
              </div>
              
              {/* Bottom Right - Send Button */}
              <div className="input-actions-right">
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className={`send-btn ${inputValue.trim() ? 'active' : ''}`}
                  title="Send message"
                  disabled={!inputValue.trim() || isLoading}
                >
                  <Image 
                    src={inputValue.trim() ? '/icon_light/send.svg' : getIconPath('send', resolvedTheme, false, mounted)} 
                    alt="Send" 
                    width={16} 
                    height={16} 
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* History Sidebar */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

