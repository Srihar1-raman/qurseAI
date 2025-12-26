'use client';

import React, { useState, useEffect, useRef } from 'react';
import { initializeExcalidraw } from './excalidraw-init';

interface ExcalidrawEmbedProps {
  code: string;
  className?: string;
}

export const ExcalidrawEmbed: React.FC<ExcalidrawEmbedProps> = React.memo(({ code, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [Excalidraw, setExcalidraw] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExcalidraw() {
      setIsLoading(true);
      setError('');

      try {
        const ExcalidrawComponent = await initializeExcalidraw();

        if (!cancelled) {
          setExcalidraw(() => ExcalidrawComponent);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Excalidraw loading error:', err);
          setError('Failed to load Excalidraw');
          setIsLoading(false);
        }
      }
    }

    loadExcalidraw();

    return () => {
      cancelled = true;
    };
  }, []);

  try {
    const data = JSON.parse(code);
    console.log('Excalidraw data parsed:', data);

    return (
      <div className={`my-6 ${className}`}>
        {error ? (
          <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center p-12 min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-sm text-muted-foreground">Loading Excalidraw...</p>
                </div>
              </div>
            ) : Excalidraw ? (
              <div className="excalidraw-wrapper" style={{ height: '500px', maxWidth: '100%', maxHeight: '500px' }}>
                <Excalidraw
                  initialData={data}
                  viewModeEnabled={true}
                  zenModeEnabled={false}
                  gridModeEnabled={false}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center p-12 min-h-[400px]">
                <p className="text-sm text-muted-foreground">Excalidraw viewer</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  } catch (err) {
    return (
      <div className={`my-6 border border-destructive/50 rounded-lg p-4 bg-destructive/10 ${className}`}>
        <p className="text-sm text-destructive font-medium mb-2">Invalid Excalidraw JSON</p>
        <pre className="text-xs text-muted-foreground overflow-x-auto">{code}</pre>
      </div>
    );
  }
});

ExcalidrawEmbed.displayName = 'ExcalidrawEmbed';
