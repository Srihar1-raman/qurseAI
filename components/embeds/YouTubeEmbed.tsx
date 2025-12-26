'use client';

import React, { useMemo } from 'react';
import { extractYouTubeInfo, isYouTubeUrl } from '@/lib/embed-utils';

interface YouTubeEmbedProps {
  url: string;
  className?: string;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = React.memo(({ url, className = '' }) => {
  const info = useMemo(() => {
    if (!isYouTubeUrl(url)) return null;
    return extractYouTubeInfo(url);
  }, [url]);

  if (!info) {
    return (
      <div className={`border border-border rounded-lg p-4 bg-muted/30 ${className}`}>
        <p className="text-sm text-destructive">Invalid YouTube URL</p>
      </div>
    );
  }

  const { videoId, startTime } = info;
  const embedUrl = startTime
    ? `https://www.youtube.com/embed/${videoId}?start=${startTime}`
    : `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className={`my-6 rounded-lg overflow-hidden border border-border ${className}`}>
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </div>
  );
});

YouTubeEmbed.displayName = 'YouTubeEmbed';
