'use client';

import React, { useState } from 'react';
import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AirlineLogoProps {
  url?: string | null;
  name?: string;
  className?: string;
}

export function AirlineLogo({ url, name, className = "w-8 h-8" }: AirlineLogoProps) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div className={cn("flex items-center justify-center bg-card rounded-sm p-1", className)}>
        <Plane className="w-full h-full opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name || 'Airline logo'}
      className={cn("object-contain rounded-sm bg-white", className)}
      onError={() => setError(true)}
    />
  );
}
