'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { MODEL_GROUPS, isModelCompatibleWithArxiv } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ModelSelectorProps, ModelGroup } from '@/lib/types';

export default function ModelSelector({ selectedModel, onSelectModel, selectedWebSearchOption }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, mounted } = useTheme();

  // Filter model groups based on search query and arxiv compatibility
  const getFilteredModelGroups = (): ModelGroup[] => {
    const filtered = Object.values(MODEL_GROUPS)
      .filter(group => group.enabled)
      .map(group => ({
        ...group,
        models: group.models
          .filter(model => 
            !searchQuery || 
            model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.provider.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(model => ({
            ...model,
            disabled: selectedWebSearchOption === 'arXiv' && 
                      !isModelCompatibleWithArxiv(model.name, group.provider)
          }))
      }))
      .filter(group => group.models.length > 0);

    return filtered;
  };

  const filteredGroups = getFilteredModelGroups();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectModel = (modelName: string, disabled?: boolean) => {
    if (disabled) return;
    onSelectModel(modelName);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        variant="secondary"
        className={cn(
          "min-w-[160px] justify-between rounded-md border px-2.5 py-1.5 h-auto text-sm font-normal model-selector-mobile",
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
          <span className="model-selector-text">{selectedModel}</span>
        </div>
        <Image
          src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
          alt="Dropdown"
          width={12}
          height={12}
          className={cn("transition-transform", isOpen && "rotate-180")}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 min-w-[200px] max-h-[300px] bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden flex flex-col">
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
            {filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No models found
              </div>
            ) : (
              filteredGroups.map((group) => (
                  <div key={group.provider}>
                    {/* Group Header */}
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
                      {group.provider}
                    </div>
                  {/* Models */}
                  {group.models.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => handleSelectModel(model.name, model.disabled)}
                      className={cn(
                        "flex items-center justify-between cursor-pointer transition-colors",
                        model.disabled && "opacity-40 cursor-not-allowed",
                        !model.disabled && "hover:bg-muted",
                        selectedModel === model.name && "bg-primary text-white hover:bg-primary/90"
                      )}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: selectedModel === model.name ? 'white' : 'var(--color-text)',
                      }}
                    >
                      <span>{model.name}</span>
                      <div className="flex items-center gap-1">
                        {model.imageSupport && (
                          <div className={cn(
                            "w-[16px] h-[16px] rounded flex items-center justify-center",
                            selectedModel === model.name
                              ? "bg-white/10 border border-white/20 opacity-100"
                              : "bg-muted/50 border border-border/50 opacity-70"
                          )}>
                            <Image
                              src={getIconPath('image', resolvedTheme, selectedModel === model.name, mounted)}
                              alt="Image support"
                              width={9}
                              height={9}
                            />
                          </div>
                        )}
                        {model.reasoningModel && (
                          <div className={cn(
                            "w-[16px] h-[16px] rounded flex items-center justify-center",
                            selectedModel === model.name
                              ? "bg-white/10 border border-white/20 opacity-100"
                              : "bg-muted/50 border border-border/50 opacity-70"
                          )}>
                            <Image
                              src={getIconPath('reason', resolvedTheme, selectedModel === model.name, mounted)}
                              alt="Reasoning model"
                              width={9}
                              height={9}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

