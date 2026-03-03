'use client';

import { useState, useRef } from 'react';
import { useTheme } from '@/lib/theme-provider';
import { Icon } from '@/components/icons';
import { WEB_SEARCH_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/use-click-outside';
import type { WebSearchSelectorProps } from '@/lib/types';

export default function WebSearchSelector({ 
  selectedOption, 
  onSelectOption,
  showChevron = true 
}: WebSearchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, mounted } = useTheme();

  useClickOutside(dropdownRef, () => {
    setIsOpen(false);
  }, isOpen);

  const handleSelectOption = (optionName: string) => {
    onSelectOption(optionName);
    setIsOpen(false);
  };

  const selectedOptionData = WEB_SEARCH_OPTIONS.find(opt => opt.name === selectedOption);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="secondary"
        className={cn(
          "justify-center rounded-md border px-2.5 py-1.5 h-auto text-sm font-normal web-search-mobile",
          isOpen && "border-primary"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Icon
            name={(selectedOptionData?.icon || 'search') as any}
            size={16}
            aria-label={selectedOption}
          />
          <span className="web-search-text">{selectedOption}</span>
          {showChevron && (
            <Icon
              name="dropdown-arrow"
              size={12}
              aria-label="Dropdown"
              className={cn(
                "transition-transform",
                isOpen && "icon-rotate-180"
              )}
            />
          )}
        </div>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 min-w-[200px] bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {WEB_SEARCH_OPTIONS.map((option) => {
            const isSelected = selectedOption === option.name;

            return (
              <div
                key={option.name}
                onClick={() => handleSelectOption(option.name)}
                className={cn(
                  "flex items-center justify-between gap-2 cursor-pointer transition-colors",
                  isSelected && "bg-primary text-white"
                )}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isSelected ? 'white' : 'var(--color-text)',
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  } else {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                  } else {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span>{option.name}</span>
                <div className={cn(
                  "w-[16px] h-[16px] rounded flex items-center justify-center flex-shrink-0",
                  isSelected
                    ? "bg-white/10 border border-white/20 opacity-100"
                    : "bg-muted/50 border border-border/50 opacity-70"
                )}>
                  <Icon
                    name={option.icon as any}
                    size={9}
                    aria-label={option.name}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
