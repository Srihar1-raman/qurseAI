/**
 * Document Transcription Service
 * Converts documents (PDF, DOCX, Excel, etc.) to text for AI processing
 */

import type { Attachment } from '@/lib/types';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
}

export async function transcribeDocument(
  attachment: Attachment
): Promise<TranscriptionResult> {
  const contentType = attachment.contentType.toLowerCase();

  try {
    // TXT, MD, JSON, HTML, XML, etc.
    if (
      contentType === 'text/plain' ||
      contentType === 'text/markdown' ||
      contentType === 'application/json' ||
      contentType === 'text/html' ||
      contentType === 'application/xml'
    ) {
      const content = await fetchTextFile(attachment.url);
      return { success: true, text: content };
    }

    // Images (return placeholder)
    if (contentType.startsWith('image/')) {
      return { success: true, text: '[Image: File attached but text not extracted]' };
    }

    // Other formats - for now return unsupported
    return {
      success: false,
      error: `File type ${contentType} transcription not yet implemented`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transcription failed',
    };
  }
}

async function fetchTextFile(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}

// Note: PDF, DOCX, Excel transcription requires additional setup
// These can be added by installing and configuring the appropriate packages
