'use client';

import React, { useMemo } from 'react';
import { extractTwitterInfo, isTwitterUrl } from '@/lib/embed-utils';

interface TwitterEmbedProps {
  url: string;
  className?: string;
}

export const TwitterEmbed: React.FC<TwitterEmbedProps> = React.memo(({ url, className = '' }) => {
  const info = useMemo(() => {
    if (!isTwitterUrl(url)) return null;
    return extractTwitterInfo(url);
  }, [url]);

  if (!info) {
    return (
      <div className={`border border-border rounded-lg p-4 bg-muted/30 ${className}`}>
        <p className="text-sm text-destructive">Invalid Twitter/X URL</p>
      </div>
    );
  }

  // Load Twitter widget script if not already loaded
  React.useEffect(() => {
    const scriptId = 'twitter-widget-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://platform.twitter.com/widgets.js';
    script.charset = 'utf-8';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Don't remove the script as it might be used by other embeds
    };
  }, []);

  return (
    <div className={`my-6 ${className}`}>
      <blockquote className="twitter-tweet" data-theme="dark">
        <a href={url}>Loading tweet...</a>
      </blockquote>
    </div>
  );
});

TwitterEmbed.displayName = 'TwitterEmbed';
