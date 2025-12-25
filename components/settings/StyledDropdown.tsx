'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/use-click-outside';

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface StyledDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  label?: string;
  description?: string;
  placeholder?: string;
}

export function StyledDropdown({
  value,
  onChange,
  options,
  label,
  description,
  placeholder = 'Select an option...'
}: StyledDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, mounted } = useTheme();

  // Get selected option
  const selectedOption = options.find(o => o.value === value);

  // Close dropdown on outside click
  useClickOutside(dropdownRef, () => {
    setIsOpen(false);
  }, isOpen);

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="settings-group">
      {label && <label className="settings-label">{label}</label>}
      {description && <p className="settings-description">{description}</p>}

      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          type="button"
          className={cn(
            "settings-select",
            "flex items-center justify-between gap-2",
            isOpen && "border-primary"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
          <Image
            src={getIconPath('dropdown-arrow', resolvedTheme, false, mounted)}
            alt="Dropdown"
            width={12}
            height={12}
            className={cn("transition-transform flex-shrink-0", isOpen && "rotate-180")}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 min-w-[280px] max-h-[400px] bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden flex flex-col"
            style={{ zIndex: 100 }}
          >
            {/* Options List */}
            <div className="overflow-y-auto flex-1">
              {options.map((option) => {
                const isSelected = value === option.value;

                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelectOption(option.value)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      "hover:bg-muted",
                      isSelected && "bg-primary text-white hover:bg-primary/90"
                    )}
                    style={{
                      padding: option.description ? '10px 12px' : '8px 12px',
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: isSelected ? 'white' : 'var(--color-text)',
                        }}
                      >
                        {option.label}
                      </span>
                      {option.description && (
                        <p
                          style={{
                            fontSize: '11px',
                            color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)',
                            lineHeight: '1.4',
                          }}
                          className="truncate"
                        >
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
