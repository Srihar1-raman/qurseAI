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
    // TXT, MD, JSON, HTML, XML, CSV — all plain text formats
    if (
      contentType === 'text/plain' ||
      contentType === 'text/markdown' ||
      contentType === 'application/json' ||
      contentType === 'text/html' ||
      contentType === 'application/xml' ||
      contentType === 'text/csv'
    ) {
      const fileContent = await fetchFileContent(attachment.url);
      return { success: true, text: fileContent };
    }

    // PDF
    if (contentType === 'application/pdf') {
      return await transcribePDF(attachment.url);
    }

    // DOCX
    if (contentType.includes('wordprocessingml.document')) {
      return await transcribeDOCX(attachment.url);
    }

    // Excel (.xlsx only — legacy .xls binary format is not supported)
    if (contentType.includes('spreadsheetml.sheet')) {
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

async function transcribePDF(url: string): Promise<TranscriptionResult> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    const result = await parser.getText();
    return { success: true, text: result.text.trim() };
  } catch (error) {
    return {
      success: false,
      error: `Failed to transcribe PDF: ${error}`,
    };
  }
}

async function transcribeDOCX(url: string): Promise<TranscriptionResult> {
  try {
    const mammothModule = await import('mammoth');
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mammoth = mammothModule as any;
    const result = await mammoth.extractRawText({ buffer });

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
    const ExcelJS = (await import('exceljs')).default;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    // exceljs Buffer type conflicts with Node's Buffer<ArrayBufferLike> under the DOM lib — use any
    await workbook.xlsx.load(arrayBuffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { success: true, text: '' };
    }

    let text = '';
    worksheet.eachRow((row) => {
      const values = row.values as (string | number | boolean | null | undefined)[];
      // row.values is 1-based (index 0 is always undefined), so slice from 1
      const rowText = values
        .slice(1)
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v))
        .join('\t');
      if (rowText) text += rowText + '\n';
    });

    return { success: true, text: text.trim() };
  } catch (error) {
    return {
      success: false,
      error: `Failed to transcribe Excel: ${error}`,
    };
  }
}
