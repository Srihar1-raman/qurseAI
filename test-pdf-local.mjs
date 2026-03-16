#!/usr/bin/env node

/**
 * Test PDF transcription locally
 */

import { existsSync, readFileSync } from 'fs';
import * as pdfParse from 'pdf-parse';

const testPdfFile = './resume_new.pdf';

console.log('╔═════════════════════════════════════╗');
console.log('║     Testing PDF Transcription Locally          ║');
console.log('╚═════════════════════════════════════╝');
console.log();

if (existsSync(testPdfFile)) {
  console.log(`✅ Found test PDF: ${testPdfFile}`);
  console.log('📄 Starting text extraction...');
  console.log();

  const pdfBuffer = readFileSync(testPdfFile);
  
  pdfParse.default(pdfBuffer).then((result) => {
    console.log('✅ PDF parsed successfully!');
    console.log();
    console.log('📄 Extracted text preview (first 500 chars):');
    console.log('─'.repeat(60));
    console.log(result.text.substring(0, 500));
    console.log('─'.repeat(60));
    console.log(`📊 Total characters: ${result.text.length}`);
    console.log(`📊 Total pages: ${result.numpages}`);
    console.log();
    console.log('✅ PDF transcription working correctly!');
  }).catch((error) => {
    console.error('❌ Failed to parse PDF:', error);
    process.exit(1);
  });
} else {
  console.error(`❌ Test PDF not found: ${testPdfFile}`);
  process.exit(1);
}
