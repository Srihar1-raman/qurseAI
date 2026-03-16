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
      const fileContent = await fetchFileContent(attachment.url);
      return { success: true, text: fileContent };
    }

    // PDF - Use pdfjs-dist for reliable text extraction
    if (contentType === 'application/pdf') {
      return await transcribePDF(attachment.url);
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

async function transcribePDF(url: string): Promise<TranscriptionResult> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const pdfData = arrayBuffer;

    const pdfjsLib = await import('pdfjs-dist');
    const pdfjs = (pdfjsLib as any).default || pdfjsLib;

    const loadingTask = pdfjs.getDocument({ data: pdfData });

    return new Promise((resolve, reject) => {
      loadingTask.promise.then((pdf: any) => {
        let fullText = '';

        const numPages = pdf.numPages;

        const processPage = (pageNum: number) => {
          return pdf.getPage(pageNum).then((page: any) => {
            return page.getTextContent();
          }).then((textContent: any) => {
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';

            if (pageNum === numPages) {
              resolve({
                success: true,
                text: fullText.trim(),
              });
            }
          });
        };

        for (let i = 1; i <= numPages; i++) {
          processPage(i);
        }
      }).catch((error: any) => {
        reject({
          success: false,
          error: `Failed to transcribe PDF: ${error}`,
        });
      });
    });
  } catch (error: any) {
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
    const xlsxModule = await import('xlsx');
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const xlsx = xlsxModule as any;
    const workbook = xlsx.read(buffer);
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
