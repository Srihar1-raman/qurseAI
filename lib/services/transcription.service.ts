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
    const fileContent = await fetchFileContent(attachment.url);

    // TXT, MD, JSON, HTML, XML, etc.
    if (
      contentType === 'text/plain' ||
      contentType === 'text/markdown' ||
      contentType === 'application/json' ||
      contentType === 'text/html' ||
      contentType === 'application/xml'
    ) {
      return { success: true, text: fileContent };
    }

    // PDF
    if (contentType === 'application/pdf') {
      return await transcribePDF(fileContent);
    }

    // DOCX
    if (contentType.includes('wordprocessingml.document')) {
      return await transcribeDOCX(attachment.url);
    }

    // Excel
    if (contentType.includes('spreadsheetml.sheet') || contentType === 'application/vnd.ms-excel' || contentType === 'text/csv') {
      return await transcribeExcel(attachment.url);
    }

    return {
      success: false,
      error: `Unsupported file type: ${contentType}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transcription failed',
    };
  }
}

async function fetchFileContent(url: string): Promise<string> {
  const response = await fetch(url);
  const text = await response.text();
  return text;
}

async function transcribePDF(text: string): Promise<TranscriptionResult> {
  try {
    const pdfParse: any = await import('pdf-parse');
    const data = await pdfParse.default(text);

    let content = '';

    if (data.text) {
      content = data.text;
    } else if (data.pages && data.pages.length > 0) {
      for (const page of data.pages) {
        content += page.text + '\n\n';
      }
    }

    return {
      success: true,
      text: content.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to transcribe PDF: ${error}`,
    };
  }
}

async function transcribeDOCX(url: string): Promise<TranscriptionResult> {
  try {
    const mammoth: any = await import('mammoth');
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    const result = await mammoth.extractRawText({ arrayBuffer });

    return {
      success: true,
      text: result.value,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to transcribe DOCX: ${error}`,
    };
  }
}

async function transcribeExcel(url: string): Promise<TranscriptionResult> {
  try {
    const xlsx: any = await import('xlsx');
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    const workbook = xlsx.read(arrayBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    let text = '';
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    for (const row of rows as any[]) {
      const rowText = Object.values(row).filter((v: any) => v !== undefined && v !== null).map((v: any) => String(v)).join('\t');

      if (rowText.length > 0) {
        text += rowText + '\n';
      }
    }

    return {
      success: true,
      text: text.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to transcribe Excel: ${error}`,
    };
  }
}
