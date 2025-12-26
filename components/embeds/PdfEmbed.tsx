'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfEmbedProps {
  url: string;
  className?: string;
}

export const PdfEmbed: React.FC<PdfEmbedProps> = React.memo(({ url, className = '' }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [PdfComponents, setPdfComponents] = useState<any>(null);

  // Load PDF components client-side only
  useEffect(() => {
    import('react-pdf').then((module) => {
      setPdfComponents({
        Document: module.Document,
        Page: module.Page,
      });

      // Set worker
      module.pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${module.pdfjs.version}/pdf.worker.min.js`;
    });
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError('');
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err);
    setError('Failed to load PDF');
    setIsLoading(false);
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPageNumber(Math.max(1, Math.min(newPage, numPages)));
  }, [numPages]);

  const handleDownload = useCallback(() => {
    window.open(url, '_blank');
  }, [url]);

  if (!PdfComponents) {
    return (
      <div className={`my-6 rounded-lg border border-border overflow-hidden ${className}`}>
        <div className="flex items-center justify-center p-12 min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  const { Document: PdfDocument, Page: PdfPage } = PdfComponents;

  return (
    <div className={`my-6 rounded-lg border border-border overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
        <span className="text-sm font-medium text-foreground">PDF Viewer</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Page {pageNumber} of {numPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changePage(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="h-7 w-7 p-0"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changePage(pageNumber + 1)}
              disabled={pageNumber >= numPages}
              className="h-7 w-7 p-0"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 w-7 p-0"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-muted/20 flex justify-center p-4 min-h-[400px]">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              Open PDF in new tab
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <PdfDocument
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            }
            className="max-w-full"
          >
            <PdfPage
              pageNumber={pageNumber}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="max-w-full h-auto"
            />
          </PdfDocument>
        )}
      </div>
    </div>
  );
});

PdfEmbed.displayName = 'PdfEmbed';
