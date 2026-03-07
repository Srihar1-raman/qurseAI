'use client';

import React, { useState } from 'react';
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

  if (!logoSrc || error) {
    return (
      <div className={cn("flex items-center justify-center bg-card rounded-sm p-1", className)}>
        <Plane className="w-full h-full opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={name || 'Airline logo'}
      className={cn("object-contain rounded-sm", className)}
      onError={() => setError(true)}
      crossOrigin="anonymous"
    />
  );
}
