'use client';

import React, { useMemo } from 'react';
import { extractSpotifyInfo, isSpotifyUrl } from '@/lib/embed-utils';

interface SpotifyEmbedProps {
  url: string;
  className?: string;
}

export const SpotifyEmbed: React.FC<SpotifyEmbedProps> = React.memo(({ url, className = '' }) => {
  const info = useMemo(() => {
    if (!isSpotifyUrl(url)) return null;
    return extractSpotifyInfo(url);
  }, [url]);

  if (!info) {
    return (
      <div className={`border border-border rounded-lg p-4 bg-muted/30 ${className}`}>
        <p className="text-sm text-destructive">Invalid Spotify URL</p>
      </div>
    );
  }

  const embedUrl = `https://open.spotify.com/embed/${info.entityType}/${info.id}`;

  return (
    <div className={`my-6 rounded-lg overflow-hidden border border-border ${className}`}>
      <iframe
        src={embedUrl}
        title="Spotify embed"
        className="w-full rounded-md"
        style={{ height: info.entityType === 'track' ? '152px' : '352px' }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
});

SpotifyEmbed.displayName = 'SpotifyEmbed';
