'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useConversation } from '@/lib/contexts/ConversationContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { getIconPath } from '@/lib/icon-utils';
import { models, canUseModel, type ModelConfig, getModelConfig } from '@/ai/models';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/use-click-outside';
import { GuestRateLimitPopup, FreeUserRateLimitPopup } from '@/components/rate-limit';

interface GroupedModels {
  category: string;
  models: ModelConfig[];
}

export default function ModelSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, mounted } = useTheme();
  const { user, isProUser } = useAuth();
  const { selectedModel, setSelectedModel } = useConversation();
  const { error: showToastError } = useToast();
  const router = useRouter();

  // Popup states
  const [showGuestPopup, setShowGuestPopup] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [modelClickCount, setModelClickCount] = useState(0);
  const [selectedModelForPopup, setSelectedModelForPopup] = useState<ModelConfig | null>(null);

  // Group models by category and filter by search
  const groupedModels = useMemo(() => {
    const query = searchQuery.toLowerCase();

    // Filter models by search query
    const filteredModels = models.filter(model =>
      !query ||
      model.label.toLowerCase().includes(query) ||
      model.description.toLowerCase().includes(query) ||
      model.provider.toLowerCase().includes(query) ||
      model.tags?.some(tag => tag.toLowerCase().includes(query))
    );

    // Group by category
    const groups: GroupedModels[] = [];
    const categoryOrder = ['Free', 'Pro'];

    categoryOrder.forEach(category => {
      const categoryModels = filteredModels.filter(m => m.category === category);
      if (categoryModels.length > 0) {
        groups.push({
          category,
          models: categoryModels,
        });
      }
    });

    return groups;
  }, [searchQuery]);

  // Get selected model config
  const selectedModelConfig = models.find(m => m.value === selectedModel);

  // Close dropdown on outside click using hook
  useClickOutside(dropdownRef, () => {
    if (mounted) {
      setIsOpen(false);
      setSearchQuery('');
    }
  }, isOpen);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (mounted && isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen, mounted]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Button variant="secondary" className="justify-between gap-2" disabled>
        <div className="flex items-center gap-2">
          <Image
            src={getIconPath('model', resolvedTheme, false, mounted)}
            alt="Model"
            width={16}
            height={16}
            className="icon-sm"
          />
          <span className="model-selector-text">Loading...</span>
        </div>
      </Button>
    );
  }

  const handleSelectModel = (modelValue: string) => {
    const model = getModelConfig(modelValue);
    if (!model) {
      showToastError('Model not found');
      return;
    }

    // Use actual Pro status from auth context
    const accessCheck = canUseModel(modelValue, user, isProUser);
    
    if (!accessCheck.canUse) {
      setModelClickCount(prev => prev + 1);
      
      // Guest user clicking on Pro model - show sign in popup (they need to sign in first, then can upgrade)
      if (!user && model.requiresPro) {
        setSelectedModelForPopup(model);
        setShowGuestPopup(true);
        setIsOpen(false);
        setSearchQuery('');
        return;
      }
      
      // Guest user clicking on free model that requires auth - show sign in popup
      if (!user && model.requiresAuth) {
        setSelectedModelForPopup(model);
        setShowGuestPopup(true);
        setIsOpen(false);
        setSearchQuery('');
        return;
      }
      
      // Free user clicking on Pro model - show upgrade popup
      if (user && model.requiresPro && !isProUser) {
        setShowUpgradePopup(true);
        setIsOpen(false);
        setSearchQuery('');
        return;
      }
      
      // Fallback: show toast for other cases
      const errorMessage = accessCheck.reason || 'You do not have access to this model';
      showToastError(errorMessage);
      return;
    }

    setSelectedModel(modelValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="secondary"
        className={cn(
          "justify-center rounded-md border px-2.5 py-1.5 h-auto text-sm font-normal model-selector-mobile",
          isOpen && "border-primary"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Image
            src={getIconPath('model', resolvedTheme, false, mounted)}
            alt="Model"
            width={16}
            height={16}
          />
          <span className="model-selector-text">
            {selectedModelConfig?.label || selectedModel}
          </span>
          <Image
            src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
            alt="Dropdown"
            width={12}
            height={12}
            className={cn("transition-transform", isOpen && "rotate-180")}
          />
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 min-w-[280px] max-h-[400px] bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Image
                src={getIconPath('search', resolvedTheme, false, mounted)}
                alt="Search"
                width={14}
                height={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-muted border border-border rounded-md focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Model List */}
          <div className="overflow-y-auto flex-1">
            {groupedModels.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No models found
              </div>
            ) : (
              groupedModels.map((group) => (
                <div key={group.category}>
                  {/* Category Header */}
                  <div 
                    style={{
                      padding: '8px 12px 4px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: 'var(--color-bg-secondary)',
                    }}
                  >
                    {group.category}
                  </div>

                  {/* Models */}
                  {group.models.map((model) => {
                    // Use actual Pro status from auth context
                    const accessCheck = canUseModel(model.value, user, isProUser);
                    const isSelected = selectedModel === model.value;
                    const isDisabled = !accessCheck.canUse;

                    return (
                      <div
                        key={model.value}
                        onClick={() => handleSelectModel(model.value)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isDisabled && "opacity-50 cursor-not-allowed",
                          !isDisabled && "hover:bg-muted",
                          isSelected && "bg-primary text-white hover:bg-primary/90"
                        )}
                        style={{
                          padding: '10px 12px',
                        }}
                        title={isDisabled ? accessCheck.reason : model.description}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: isSelected ? 'white' : 'var(--color-text)',
                                }}
                              >
                                {model.label}
                              </span>
                              
                              {/* Tags */}
                              {model.tags?.slice(0, 2).map(tag => (
                                <span
                                  key={tag}
                                  className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold",
                                    isSelected 
                                      ? "bg-white/20 text-white" 
                                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                                  )}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            
                            <p 
                              style={{
                                fontSize: '11px',
                                color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)',
                                lineHeight: '1.4',
                              }}
                              className="truncate"
                            >
                              {model.description}
                            </p>
                          </div>

                          {/* Icons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {model.vision && (
                              <div 
                                className={cn(
                                  "w-[18px] h-[18px] rounded flex items-center justify-center",
                                  isSelected
                                    ? "bg-white/10 border border-white/20"
                                    : "bg-muted/50 border border-border/50"
                                )}
                                title="Vision support"
                              >
                                <Image
                                  src={getIconPath('image', resolvedTheme, isSelected, mounted)}
                                  alt="Vision"
                                  width={10}
                                  height={10}
                                />
                              </div>
                            )}
                            
                            {model.reasoning && (
                              <div 
                                className={cn(
                                  "w-[18px] h-[18px] rounded flex items-center justify-center",
                                  isSelected
                                    ? "bg-white/10 border border-white/20"
                                    : "bg-muted/50 border border-border/50"
                                )}
                                title="Reasoning model"
                              >
                                <Image
                                  src={getIconPath('reason', resolvedTheme, isSelected, mounted)}
                                  alt="Reasoning"
                                  width={10}
                                  height={10}
                                />
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Guest popup - for guests clicking on models */}
      {showGuestPopup && modelClickCount > 0 && selectedModelForPopup && (
        <GuestRateLimitPopup
          key={modelClickCount}
          isOpen={true}
          onClose={() => {
            setShowGuestPopup(false);
            setModelClickCount(0);
            setSelectedModelForPopup(null);
          }}
          reset={Date.now() + 24 * 60 * 60 * 1000}
          layer="database"
          customTitle="Sign in to continue"
          customMessage={
            selectedModelForPopup.requiresPro
              ? "Upgrade to Pro after signing in to unlock premium models like Claude, Grok, and more."
              : "Sign in to unlock access to this model and other features."
          }
          showPricing={selectedModelForPopup.requiresPro}
        />
      )}

      {/* Upgrade popup - for free users clicking on Pro models */}
      {showUpgradePopup && modelClickCount > 0 && (
        <FreeUserRateLimitPopup
          key={modelClickCount}
          isOpen={true}
          onClose={() => {
            setShowUpgradePopup(false);
            setModelClickCount(0);
          }}
          onUpgrade={async () => {
            setShowUpgradePopup(false);
            setModelClickCount(0);
            try {
              const response = await fetch('/api/payments/checkout', {
                method: 'POST',
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session');
              }

              const data = await response.json();

              if (!data.checkout_url) {
                throw new Error('No checkout URL returned');
              }

              window.location.href = data.checkout_url;
            } catch (error) {
              console.error('Checkout error:', error);
              showToastError(
                error instanceof Error
                  ? error.message
                  : 'Failed to start checkout. Please try again.'
              );
            }
          }}
          reset={Date.now() + 24 * 60 * 60 * 1000}
          customTitle="Upgrade to Pro"
          customMessage="Upgrade to Pro to unlock access to premium models like Claude, Grok, and more advanced AI capabilities."
        />
      )}
    </div>
  );
}
