'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DiagramActions } from '@/components/markdown/DiagramActions';

interface VegaLiteEmbedProps {
  code: string;
  className?: string;
}

export const VegaLiteEmbed: React.FC<VegaLiteEmbedProps> = React.memo(({ code, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [vegaEmbed, setVegaEmbed] = useState<any>(null);
  const [view, setView] = useState<any>(null);

  // Dynamically import vega-embed only on client side
  useEffect(() => {
    let cancelled = false;

    async function loadVegaEmbed() {
      try {
        const module = await import('vega-embed');
        if (!cancelled) {
          setVegaEmbed(() => module.default);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load vega-embed:', err);
          setError('Failed to load chart renderer');
          setIsLoading(false);
        }
      }
    }

    loadVegaEmbed();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !vegaEmbed) return;

    let cancelled = false;

    async function renderChart() {
      setIsLoading(true);
      setError('');

      try {
        const spec = JSON.parse(code);

        const result = await vegaEmbed(containerRef.current!, spec, {
          actions: false,
          renderer: 'svg',
        });

        if (!cancelled) {
          setView(result.view);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Vega-Lite rendering error:', err);
          setError('Failed to render chart');
          setIsLoading(false);
        }
      }
    }

    renderChart();

    return () => {
      cancelled = true;
      // Clean up previous chart
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [code, vegaEmbed]);

  const handleDownloadPng = async () => {
    if (!view) return;

    try {
      // Get the SVG from the view
      const url = await view.toImageURL('png', 2);

      // Fetch the image data
      const response = await fetch(url);
      const blob = await response.blob();

      // Create download link
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `chart-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download chart:', err);
    }
  };

  return (
    <div className={`my-6 ${className}`}>
      {error ? (
        <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10">
          <p className="text-sm text-destructive font-medium mb-2">Failed to render Vega-Lite chart</p>
          <pre className="text-xs text-muted-foreground overflow-x-auto">{code}</pre>
        </div>
      ) : (
        <div className="relative group">
          {!isLoading && view && (
            <DiagramActions
              code={code}
              onDownload={handleDownloadPng}
            />
          )}
          {isLoading && (
            <div className="flex items-center justify-center p-12 min-h-[300px]">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          <div
            ref={containerRef}
            className="vega-lite-chart p-4 flex justify-center"
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        </div>
      )}
    </div>
  );
});

VegaLiteEmbed.displayName = 'VegaLiteEmbed';
