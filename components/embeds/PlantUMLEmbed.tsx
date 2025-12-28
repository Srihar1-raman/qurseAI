'use client';

import React, { useState, useEffect } from 'react';
import encode from 'plantuml-encoder';
import { DiagramActions } from '@/components/markdown/DiagramActions';

interface PlantUMLEmbedProps {
  code: string;
  className?: string;
}

export const PlantUMLEmbed: React.FC<PlantUMLEmbedProps> = React.memo(({ code, className = '' }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setIsLoading(true);
      setError('');
      setHasError(false);

      try {
        // Check if code is empty or just whitespace
        const trimmedCode = code.trim();
        if (!trimmedCode || trimmedCode.length < 3) {
          setHasError(true);
          setIsLoading(false);
          return;
        }

        // Encode the PlantUML code
        const encoded = encode.encode(code);

        // Use the official PlantUML server to render
        const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;

        // Fetch the SVG
        const response = await fetch(url);

        // PlantUML returns 400 for invalid/incomplete diagrams
        if (response.status === 400) {
          setHasError(true);
          setIsLoading(false);
          return;
        }

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
          // Mark as error but don't set error message - we'll show code instead
          setHasError(true);
          setIsLoading(false);
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleDownloadPng = () => {
    // Get the PNG version from PlantUML server
    const encoded = encode.encode(code);
    const url = `https://www.plantuml.com/plantuml/png/${encoded}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${Date.now()}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`my-6 ${className}`}>
      {hasError ? (
        // Show code block when diagram fails to render
        <div className="border border-border rounded-lg bg-muted/30 p-4">
          <pre className="text-sm overflow-x-auto"><code>{code}</code></pre>
        </div>
      ) : (
        <div className="relative group">
          {!isLoading && svg && (
            <DiagramActions
              code={code}
              onDownload={handleDownloadPng}
            />
          )}
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
