'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { extractGistInfo, isGistUrl } from '@/lib/embed-utils';

interface GistEmbedProps {
  url: string;
  className?: string;
}

export const GistEmbed: React.FC<GistEmbedProps> = React.memo(({ url, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const info = useMemo(() => {
    if (!isGistUrl(url)) return null;
    return extractGistInfo(url);
  }, [url]);

  useEffect(() => {
    if (!info || !containerRef.current) return;

    // Load GitHub Gist embed script
    const script = document.createElement('script');
    script.src = `https://gist.github.com/${info.username}/${info.gistId}.js`;
    script.async = true;
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current && containerRef.current.contains(script)) {
        containerRef.current.removeChild(script);
      }
    };
  }, [info]);

  if (!info) {
    return (
      <div className={`border border-border rounded-lg p-4 bg-muted/30 ${className}`}>
        <p className="text-sm text-destructive">Invalid GitHub Gist URL</p>
      </div>
    );
  }

  return (
    <div className={`my-6 rounded-lg overflow-hidden border border-border ${className}`}>
      <div ref={containerRef} className="p-4 min-h-[200px]" />
      <a href={url} target="_blank" rel="noopener noreferrer" className="block p-2 text-xs text-center text-muted-foreground hover:text-primary">
        View gist on GitHub
      </a>
    </div>
  );
});

GistEmbed.displayName = 'GistEmbed';
