'use client';

import React, { useMemo } from 'react';
import { extractRedditInfo, isRedditUrl } from '@/lib/embed-utils';

interface RedditEmbedProps {
  url: string;
  className?: string;
}

export const RedditEmbed: React.FC<RedditEmbedProps> = React.memo(({ url, className = '' }) => {
  const info = useMemo(() => {
    console.log('RedditEmbed URL:', url);
    if (!isRedditUrl(url)) {
      console.log('Not a valid Reddit URL');
      return null;
    }
    const extracted = extractRedditInfo(url);
    console.log('Extracted Reddit info:', extracted);
    return extracted;
  }, [url]);

  if (!info) {
    return (
      <div className={`border border-border rounded-lg p-4 bg-muted/30 ${className}`}>
        <p className="text-sm text-destructive">Invalid Reddit URL</p>
      </div>
    );
  }

  const embedUrl = `https://www.redditmedia.com/r/${info.subreddit}/comments/${info.postId}.html?ref_source=embed&amp;ref=share&amp;embed=true`;

  return (
    <div className={`my-6 rounded-lg overflow-hidden border border-border ${className}`}>
      <iframe
        id="reddit-embed"
        src={embedUrl}
        title="Reddit post"
        className="w-full border-0"
        style={{ height: '500px', width: '100%' }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        scrolling="yes"
      />
    </div>
  );
});

RedditEmbed.displayName = 'RedditEmbed';
