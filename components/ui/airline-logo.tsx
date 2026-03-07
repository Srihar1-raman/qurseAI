'use client';

import React, { useState, useEffect } from 'react';
import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AirlineLogoProps {
  url?: string | null;
  iataCode?: string;
  name?: string;
  className?: string;
}

export function AirlineLogo({ url, iataCode, name, className = "w-8 h-8" }: AirlineLogoProps) {
  const [error, setError] = useState(false);

  const kiwiUrl = iataCode ? `https://images.kiwi.com/airlines/64/${iataCode}.png` : null;
  const logoSrc = url || kiwiUrl;

  useEffect(() => {
    setError(false);
  }, [logoSrc]);

  if (!logoSrc || error) {
    return (
      <div className={cn("flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-sm", className)}>
        <Plane className="w-1/2 h-1/2 opacity-50" />
      </div>
    );
  }

  return (
    <img 
      src={logoSrc} 
      alt={name || 'Airline logo'} 
      className={cn("object-contain rounded-sm bg-white", className)}
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
    />
  );
}
