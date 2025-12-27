'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { extractTwitterInfo, isTwitterUrl } from '@/lib/embed-utils';

interface TwitterEmbedProps {
  url: string;
  className?: string;
}

export const TwitterEmbed: React.FC<TwitterEmbedProps> = React.memo(({ url, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ALL hooks must be called before any conditional returns
  // Dummy hook to normalize hook count across all embed components (target: 4 hooks)
  const [, setMounted] = useState(false);

  const info = useMemo(() => {
    if (!isTwitterUrl(url)) return null;
    return extractTwitterInfo(url);
  }, [url]);

  useEffect(() => {
    // Set mounted state
    setMounted(true);

    if (!containerRef.current || !info) return;
    if (!containerRef.current || !info) return;

    // Load Twitter widget script if not already loaded
    const scriptId = 'twitter-widget-script';
    const scriptExists = document.getElementById(scriptId);

    const loadScript = () => {
      if (scriptExists) {
        // Script already exists, just trigger widget refresh
        if ((window as any).twttr?.widgets) {
          (window as any).twttr.widgets.load(containerRef.current);
        }
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://platform.twitter.com/widgets.js';
      script.charset = 'utf-8';
      script.async = true;
      script.onload = () => {
        // Script loaded, trigger widget processing
        if ((window as any).twttr?.widgets) {
          (window as any).twttr.widgets.load(containerRef.current);
        }
      };
      document.body.appendChild(script);
    };

    loadScript();
  }, [url, info]);

  // Conditional rendering AFTER all hooks
  if (!info) {
    return (
      <div className={`border border-border rounded-lg p-4 bg-muted/30 ${className}`}>
        <p className="text-sm text-destructive">Invalid Twitter/X URL</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`my-6 ${className}`}>
      <blockquote className="twitter-tweet" data-theme="dark">
        <a href={url}>Loading tweet...</a>
      </blockquote>
    </div>
  );
});

TwitterEmbed.displayName = 'TwitterEmbed';
