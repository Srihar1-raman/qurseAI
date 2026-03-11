/**
 * Manual transcription test script
 * Run with: node test-transcription.js
 */

import fs from 'fs';
import path from 'path';

async function testPDF() {
  console.log('\n=== Testing PDF Transcription ===\n');

  try {
    const pdfParseModule = await import('pdf-parse');
    const PDFParseClass = pdfParseModule.PDFParse;

    if (typeof PDFParseClass !== 'function') {
      console.error('❌ PDFParseClass is not a constructor!');
      console.error('Module structure:', Object.keys(pdfParseModule));
      return;
    }

    console.log('✓ pdf-parse loaded successfully');

    // Find test PDF in codebase
    const pdfFiles = [];
    const searchDir = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          searchDir(fullPath);
        } else if (file.endsWith('.pdf')) {
          pdfFiles.push(fullPath);
        }
      }
    };

    searchDir(process.cwd());

    if (pdfFiles.length === 0) {
      console.log('⚠ No PDF files found in codebase');
      return;
    }

    const pdfPath = pdfFiles[0];
    console.log(`📄 Reading: ${pdfPath}`);

    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParseClass({ data: dataBuffer });
    const result = await parser.getText();
    await parser.destroy();

    console.log('✓ PDF parsed successfully');

    let content = '';

    if (result.text) {
      content = result.text;
      console.log('\n✅ Method 1: result.text');
    }

    if (result.pages && result.pages.length > 0) {
      const pageText = result.pages.map((p) => p.text).join('\n\n');
      if (pageText.trim()) {
        content = pageText;
        console.log('\n✅ Method 2: result.pages[].text');
      }
    }

    if (content.trim()) {
      console.log('\n✅ SUCCESS: PDF transcription working!\n');
      console.log(`📝 Text preview (first 300 chars): ${content.substring(0, 300)}`);
      console.log(`📊 Total characters: ${content.length}`);
      return content;
    } else {
      console.log('\n❌ FAIL: No text extracted from PDF (image-based PDF?)\n');
      return null;
    }

  } catch (error) {
    console.error('\n❌ PDF ERROR:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

async function testDOCX() {
  console.log('\n=== Testing DOCX Transcription ===\n');

  try {
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule;
    console.log('✓ mammoth loaded successfully');

    // Find test DOCX in codebase
    const docxFiles = [];
    const searchDir = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          searchDir(fullPath);
        } else if (file.endsWith('.docx')) {
          docxFiles.push(fullPath);
        }
      }
    };

    searchDir(process.cwd());

    if (docxFiles.length === 0) {
      console.log('⚠ No DOCX files found in codebase');
      return;
    }

    const docxPath = docxFiles[0];
    console.log(`📄 Reading: ${docxPath}`);

    const dataBuffer = fs.readFileSync(docxPath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });

    console.log('✓ DOCX parsed successfully');
    console.log(`📝 Text preview (first 300 chars): ${result.value ? result.value.substring(0, 300) : result.value}`);

    if (result.value && result.value.trim()) {
      console.log('\n✅ SUCCESS: DOCX transcription working!\n');
      console.log(`📊 Total characters: ${result.value.length}`);
      console.log(`📊 Word count: ${result.value.split(/\s+/).filter(w => w.trim()).length}`);
      return result.value;
    } else {
      console.log('\n❌ FAIL: No text extracted from DOCX\n');
      return null;
    }

  } catch (error) {
    console.error('\n❌ DOCX ERROR:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║     Manual Transcription Test for PDF and DOCX                  ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  const pdfResult = await testPDF();
  const docxResult = await testDOCX();

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n📄 PDF Transcription:`);
  console.log(`   Status: ${pdfResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Characters: ${pdfResult ? pdfResult.length : 'N/A'}`);

  console.log(`\n📄 DOCX Transcription:`);
  console.log(`   Status: ${docxResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Characters: ${docxResult ? docxResult.length : 'N/A'}`);

  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 OVERALL STATUS:');
  console.log((pdfResult && docxResult) ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
}

main().catch(console.error);
