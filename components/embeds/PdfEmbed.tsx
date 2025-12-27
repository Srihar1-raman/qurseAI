'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-provider';
import { getIconPath } from '@/lib/icon-utils';

interface PdfEmbedProps {
  url: string;
  className?: string;
}

export const PdfEmbed: React.FC<PdfEmbedProps> = React.memo(({ url, className = '' }) => {
  const { resolvedTheme, mounted } = useTheme();

  // Use Google Docs Viewer as it's more reliable
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className={`my-6 rounded-lg border border-border overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
        <span className="text-sm font-medium text-foreground">PDF</span>
        <button
          onClick={() => window.open(url, '_blank')}
          className="p-1 rounded border border-border bg-background shadow-sm transition-all duration-200 hover:bg-muted hover:scale-105 text-muted-foreground"
          title="Open PDF in new tab"
          type="button"
        >
          <Image
            src={getIconPath('share', resolvedTheme, false, mounted)}
            alt="Open"
            width={14}
            height={14}
          />
        </button>
      </div>

      <div className="bg-muted/20">
        <iframe
          src={googleViewerUrl}
          className="w-full border-0"
          style={{ height: '600px' }}
          title="PDF"
        />
      </div>
    </div>
  );
});

PdfEmbed.displayName = 'PdfEmbed';
