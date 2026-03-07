'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const kiwiUrl = iataCode ? `https://images.kiwi.com/airlines/64/${iataCode}.png` : null;

  useEffect(() => {
    setError(false);
    setRetryCount(0);
  }, [kiwiUrl]);

  const handleRetry = () => {
    if (retryCount < 3) {
      setError(false);
      setRetryCount(prev => prev + 1);
    }
  };

  const handleError = () => {
    if (imgRef.current && imgRef.current.src) {
      console.error('AirlineLogo failed to load:', imgRef.current.src);
    }
    setError(true);
  };

  if (!kiwiUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-sm", className)}>
        <Plane className="w-1/2 h-1/2 opacity-50" />
      </div>
    );
  }

  if (error && retryCount < 3) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-sm cursor-pointer", className)}
        onClick={handleRetry}
        title="Retry loading logo"
      >
        <Plane className="w-1/2 h-1/2 opacity-50" />
      </div>
    );
  }

  return (
    <img 
      ref={imgRef}
      src={kiwiUrl} 
      alt={name || 'Airline logo'} 
      className={cn("object-contain rounded-sm bg-white", className)}
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={() => setError(false)}
    />
  );
}
