'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function Dropdown({ trigger, children, open, onOpenChange, align = 'start', className }: DropdownProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 min-w-[200px] rounded-lg border border-border bg-background shadow-lg",
            align === 'center' && 'left-1/2 -translate-x-1/2',
            align === 'end' && 'right-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  active?: boolean;
}

export function DropdownItem({ children, active, className, ...props }: DropdownItemProps) {
  return (
    <div
      className={cn(
        "flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition-colors",
        "hover:bg-muted",
        active && "bg-primary text-white hover:bg-primary/90",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface DropdownSeparatorProps {
  className?: string;
}

export function DropdownSeparator({ className }: DropdownSeparatorProps) {
  return <div className={cn("h-px bg-border", className)} />;
}

interface DropdownLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownLabel({ children, className }: DropdownLabelProps) {
  return (
    <div
      className={cn(
        "px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50",
        className
      )}
    >
      {children}
    </div>
  );
}

