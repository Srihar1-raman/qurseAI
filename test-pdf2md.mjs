#!/usr/bin/env node

/**
 * Test script for pdf2md
 * Converts a PDF file to Markdown
 */

import { exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const testPdfFile = './resume_2026.pdf';

console.log('╔═════════════════════════════════════╗');
console.log('║     Testing pdf2md for PDF conversion          ║');
console.log('╚═════════════════════════════════════╝');
console.log();

if (existsSync(testPdfFile)) {
  console.log(`✅ Found test PDF: ${testPdfFile}`);
  console.log('📄 Starting conversion to Markdown...');
  console.log();

  exec(`npx pdf2md "${testPdfFile}" "test-output"`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Conversion failed:', error);
      console.error('stderr:', stderr);
      process.exit(1);
    }

    console.log('✅ Conversion completed!');
    console.log();
    console.log('📄 Output file: test-output.md');
    console.log();

    if (existsSync('test-output.md')) {
      const content = readFileSync('test-output.md', 'utf-8');
      console.log('📝 Output content preview (first 500 chars):');
      console.log('─'.repeat(60));
      console.log(content.substring(0, 500));
      console.log('─'.repeat(60));
      console.log(`📊 Total characters: ${content.length}`);
    } else {
      console.warn('⚠️  Output file was not created');
    }
  });
} else {
  console.error(`❌ Test PDF not found: ${testPdfFile}`);
  console.log('📄 Please add a PDF file to the codebase to test');
  process.exit(1);
}
