'use client';

import React, { useState, useEffect } from 'react';
import encode from 'plantuml-encoder';

interface PlantUMLEmbedProps {
  code: string;
  className?: string;
}

export const PlantUMLEmbed: React.FC<PlantUMLEmbedProps> = React.memo(({ code, className = '' }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setIsLoading(true);
      setError('');

      try {
        // Encode the PlantUML code
        const encoded = encode.encode(code);

        // Use the official PlantUML server to render
        const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;

        // Fetch the SVG
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const svgText = await response.text();

        if (!cancelled) {
          setSvg(svgText);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('PlantUML rendering error:', err);
          setError('Failed to render PlantUML diagram');
          setIsLoading(false);
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className={`my-6 ${className}`}>
      {error ? (
        <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10">
          <p className="text-sm text-destructive font-medium mb-2">Failed to render PlantUML diagram</p>
          <pre className="text-xs text-muted-foreground overflow-x-auto">{code}</pre>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-background overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 min-h-[300px]">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-sm text-muted-foreground">Rendering PlantUML diagram...</p>
              </div>
            </div>
          ) : (
            <div
              className="p-4 flex justify-center overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      )}
    </div>
  );
});

PlantUMLEmbed.displayName = 'PlantUMLEmbed';
