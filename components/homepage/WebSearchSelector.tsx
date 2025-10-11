'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { WEB_SEARCH_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WebSearchSelectorProps {
  selectedOption: string;
  onSelectOption: (option: string) => void;
}

export default function WebSearchSelector({ selectedOption, onSelectOption }: WebSearchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, mounted } = useTheme();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectOption = (optionName: string, enabled: boolean) => {
    // Always allow selection, just show disabled state visually
    onSelectOption(optionName);
    setIsOpen(false);
  };

  // Show all options, not just enabled ones
  const allOptions = WEB_SEARCH_OPTIONS;
  const selectedOptionData = allOptions.find(opt => opt.name === selectedOption);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        variant="secondary"
        className={cn(
          "justify-center rounded-md border px-2.5 py-1.5 h-auto text-sm font-normal web-search-mobile",
          isOpen && "border-primary"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Image
            src={getIconPath(
              selectedOptionData?.icon || 'search',
              resolvedTheme,
              false,
              mounted
            )}
            alt={selectedOption}
            width={16}
            height={16}
            className={selectedOptionData?.icon === 'arxiv-logo' ? 'arxiv-icon' : ''}
          />
          <span className="web-search-text">{selectedOption}</span>
          <Image
            src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
            alt="Dropdown"
            width={12}
            height={12}
            className={cn(
              "transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 min-w-[200px] bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {allOptions.map((option) => {
            const isSelected = selectedOption === option.name;
            const isDisabled = !option.enabled;
            
            return (
              <div
                key={option.name}
                onClick={() => handleSelectOption(option.name, option.enabled)}
                className={cn(
                  "flex items-center justify-between gap-2 cursor-pointer transition-colors",
                  isSelected && "bg-primary text-white hover:bg-primary/90",
                  !isSelected && !isDisabled && "hover:bg-muted"
                )}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isSelected ? 'white' : 'var(--color-text)',
                }}
              >
                <span>{option.name}</span>
                <div className={cn(
                  "w-[16px] h-[16px] rounded flex items-center justify-center flex-shrink-0",
                  isSelected
                    ? "bg-white/10 border border-white/20 opacity-100"
                    : "bg-muted/50 border border-border/50 opacity-70"
                )}>
                  <Image
                    src={getIconPath(option.icon, resolvedTheme, isSelected, mounted)}
                    alt={option.name}
                    width={9}
                    height={9}
                    className={option.icon === 'arxiv-logo' ? 'arxiv-icon-sm' : ''}
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

