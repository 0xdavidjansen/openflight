// Script to analyze Streckeneinsatzabrechnung PDF for non-flight days
import fs from 'fs';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';

const pdfPath = 'misc/2023/Streckeneinsatzabrechnung_05_2023.pdf';

async function extractTextFromPDF(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await getDocument({ data }).promise;
  
  const textContent = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join('');
    textContent.push(pageText);
  }
  
  return textContent;
}

async function analyzeNonFlightDays() {
  console.log('Analyzing:', pdfPath);
  console.log('');
  
  const textPages = await extractTextFromPDF(pdfPath);
  const fullText = textPages.join('\n');
  
  // Log full text for debugging
  console.log('=== FULL PDF TEXT ===');
  console.log(fullText);
  console.log('\n=== END FULL TEXT ===\n');
  
  // Look for various non-flight day patterns in May 2023
  const nonFlightDays = [];
  
  // Define patterns for different duty codes
  const dutyPatterns = [
    { code: 'ME', pattern: /(\d{2})\.(\d{2})\.[\s\n]*ME[\s\n]+/g, description: 'Medical/Doctor' },
    { code: 'EM', pattern: /(\d{2})\.(\d{2})\.[\s\n]*EM[\s\n]+/g, description: 'Emergency Training' },
    { code: 'RE', pattern: /(\d{2})\.(\d{2})\.[\s\n]*RE[\s\n]+/g, description: 'Reserve' },
    { code: 'DP', pattern: /(\d{2})\.(\d{2})\.[\s\n]*DP[\s\n]+/g, description: 'Dispatch' },
    { code: 'DT', pattern: /(\d{2})\.(\d{2})\.[\s\n]*DT[\s\n]+/g, description: 'Duty Time' },
    { code: 'SI', pattern: /(\d{2})\.(\d{2})\.[\s\n]*SI[\s\n]+/g, description: 'Simulator' },
    { code: 'TK', pattern: /(\d{2})\.(\d{2})\.[\s\n]*TK[\s\n]+/g, description: 'Training Course' },
    { code: 'SB', pattern: /(\d{2})\.(\d{2})\.[\s\n]*SB[\s\n]+/g, description: 'Standby' },
    { code: 'FL', pattern: /(\d{2})\.(\d{2})\.[\s\n]*FL[\s\n]+/g, description: 'Foreign Leave/Layover' },
    { code: 'K', pattern: /(\d{2})\.(\d{2})\.[\s\n]*K[\s\n]+/g, description: 'Sick' },
    { code: 'U', pattern: /(\d{2})\.(\d{2})\.[\s\n]*U[\s\n]+/g, description: 'Vacation' },
  ];
  
  // Search for each pattern
  for (const { code, pattern, description } of dutyPatterns) {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      
      // Only include May 2023 (month 05)
      if (month === 5) {
        nonFlightDays.push({
          date: `2023-05-${day.toString().padStart(2, '0')}`,
          code,
          description
        });
      }
    }
  }
  
  // Sort by date
  nonFlightDays.sort((a, b) => a.date.localeCompare(b.date));
  
  // Output results
  console.log('\n=== NON-FLIGHT DAYS FOR MAY 2023 ===\n');
  
  if (nonFlightDays.length === 0) {
    console.log('None found');
  } else {
    console.log('Date       | Code | Description');
    console.log('-----------|------|------------------');
    for (const day of nonFlightDays) {
      console.log(`${day.date} | ${day.code.padEnd(4)} | ${day.description}`);
    }
  }
}

analyzeNonFlightDays().catch(console.error);
