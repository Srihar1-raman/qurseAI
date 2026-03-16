#!/usr/bin/env node

/**
 * Simple PDF test with inline PDF data
 */

import * as pdfParse from 'pdf-parse';

console.log('╔═════════════════════════════════════╗');
console.log('║     Testing PDF Transcription                ║');
console.log('╚═══════════════════════════════════╝');
console.log();

// Create a simple test PDF (minimal valid PDF)
const minimalPdf = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj\n' +
  '<<\n' +
  '/Type /Catalog\n' +
  '/Pages 2 0 R\n' +
  '>>\n' +
  'stream\n' +
  'BT\n' +
  '/F1 12 Tf\n' +
  '100 700 Td\n' +
  '(Hello World) Tj\n' +
  'ET\n' +
  'endstream\n' +
  'endobj\n' +
  'trailer\n' +
  '<<\n' +
  '/Size 17\n' +
  '>>\n' +
  'startxref\n' +
  '0\n' +
  '%%EOF\n'
);

console.log('✅ Created test PDF');
console.log('📄 Parsing...');
console.log();

pdfParse.default(minimalPdf).then((result) => {
  console.log('✅ PDF parsed successfully!');
  console.log();
  console.log('📝 Extracted text:', result.text);
  console.log('📊 Total characters:', result.text.length);
  console.log('📊 Pages:', result.numpages);
  console.log();
  console.log('✅ PDF transcription is WORKING!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Failed:', error);
  process.exit(1);
});
