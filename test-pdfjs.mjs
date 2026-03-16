#!/usr/bin/env node

/**
 * Test PDF.js (pdfjs-dist) for PDF text extraction
 * This is already installed in your package.json
 */

import { existsSync } from 'fs';
import * as pdfjs from 'pdfjs-dist';

const testPdfFile = './resume_new.pdf';

console.log('╔═════════════════════════════════════╗');
console.log('║     Testing PDF.js (pdfjs-dist)           ║');
console.log('╚═════════════════════════════════════╝');
console.log();

if (existsSync(testPdfFile)) {
  console.log(`✅ Found test PDF: ${testPdfFile}`);
  console.log('📄 Starting text extraction...');
  console.log();

  const loadingTask = pdfjs.getDocument(testPdfFile);

  loadingTask.promise.then((pdf) => {
    console.log(`✅ PDF loaded successfully!`);
    console.log(`📊 Pages: ${pdf.numPages}`);
    console.log();

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      pdf.getPage(i).then((page) => {
        return page.getTextContent();
      }).then((textContent) => {
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += `\n\n--- Page ${i} ---\n${pageText}`;
        
        if (i === pdf.numPages) {
          console.log('✅ Text extraction completed!');
          console.log();
          console.log('📝 Extracted text preview (first 500 chars):');
          console.log('─'.repeat(60));
          console.log(fullText.substring(0, 500));
          console.log('─'.repeat(60));
          console.log(`📊 Total characters: ${fullText.length}`);
          console.log(`📊 Total pages: ${pdf.numPages}`);
        }
      });
    }
  }).catch((error) => {
    console.error('❌ Failed to load PDF:', error);
    process.exit(1);
  });
} else {
  console.error(`❌ Test PDF not found: ${testPdfFile}`);
  console.log('📄 Please add a PDF file to the codebase to test');
  process.exit(1);
}
