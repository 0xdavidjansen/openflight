// PDF parsing utilities for Flugstundenübersicht and Streckeneinsatzabrechnung

import type {
  Flight,
  NonFlightDay,
  PersonalInfo,
  ReimbursementData,
  UploadedFile,
  DataWarning,
} from '../types';
import { getCountryFromAirport } from './airports';

/**
 * Safely parse a date and validate it's not Invalid Date
 */
function parseAndValidateDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  // Check if the date rolled over (e.g., Feb 30 -> Mar 2)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function parseMonthYearFromFilename(fileName: string): { year: number; month: number } | null {
  const yearFirstMatch = fileName.match(/(\d{4})[_-](\d{1,2})/);
  if (yearFirstMatch) {
    const year = parseInt(yearFirstMatch[1], 10);
    const month = parseInt(yearFirstMatch[2], 10);
    if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const monthFirstMatch = fileName.match(/(\d{1,2})[_-](\d{4})/);
  if (monthFirstMatch) {
    const month = parseInt(monthFirstMatch[1], 10);
    const year = parseInt(monthFirstMatch[2], 10);
    if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  return null;
}


// Lazy load PDF.js for code splitting
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist');
      // Configure PDF.js worker - use bundled worker via CDN for reliability
      // In production, this could be replaced with a locally bundled worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    } catch (error) {
      throw new Error(`PDF library initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  return pdfjsLib;
}

/**
 * Extract text content from a PDF file
 */
async function extractTextFromPDF(file: File): Promise<string[]> {
  try {
    const pdfjs = await getPdfjs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    const textContent: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Join with empty string to preserve original spacing from PDF (matches backup_old behavior)
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join('');
      textContent.push(pageText);
    }
    
    return textContent;
  } catch (error) {
    throw new Error(`PDF text extraction failed for "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Flugstundenübersicht PDF
 * This document contains flight times and duty information
 */
export async function parseFlugstundenPDF(file: File): Promise<{
  personalInfo: PersonalInfo | null;
  flights: Flight[];
  nonFlightDays: NonFlightDay[];
  fileInfo: UploadedFile;
  warnings: DataWarning[];
}> {
  // Capture filename immediately to ensure it's preserved throughout async operations
  const fileName = file.name;
  const textPages = await extractTextFromPDF(file);
  const fullText = textPages.join('\n');
  
  const flights: Flight[] = [];
  const nonFlightDays: NonFlightDay[] = [];
  const warnings: DataWarning[] = [];
  
  // Extract personal info
  const personalInfo = extractPersonalInfo(fullText);
  
  // Extract year and month from document header
  // PDF format: "Monat 01 / 2025" or "Monat 1 / 2025"
  let year = new Date().getFullYear();
  let month = 1;

  const filenameDate = parseMonthYearFromFilename(fileName);
  if (filenameDate) {
    year = filenameDate.year;
    month = filenameDate.month;
  } else {
    // Try to find month/year in document header/title area (first 500 chars)
    const headerText = fullText.slice(0, 500);

    // First try to find "Monat XX / YYYY" pattern (numeric month/year format)
    const monatPattern = /Monat\s*(\d{1,2})\s*\/\s*(\d{4})/i;
    const monatMatch = headerText.match(monatPattern);
    if (monatMatch) {
      const extractedMonth = parseInt(monatMatch[1], 10);
      const extractedYear = parseInt(monatMatch[2], 10);
      if (extractedMonth >= 1 && extractedMonth <= 12) {
        month = extractedMonth;
      }
      if (extractedYear >= 2020 && extractedYear <= 2030) {
        year = extractedYear;
      }
    } else {
      // Fall back to German month names
      const monthNames = ['januar', 'februar', 'märz', 'april', 'mai', 'juni',
        'juli', 'august', 'september', 'oktober', 'november', 'dezember'];

      for (let i = 0; i < monthNames.length; i++) {
        const pattern = new RegExp(`\\b${monthNames[i]}\\b`, 'i');
        if (pattern.test(headerText)) {
          month = i + 1;
          break;
        }
      }

      // Try to find a reasonable year (2020-2030) in the header
      const yearPattern = /\b(20[2-3]\d)\b/;
      const yearMatch = headerText.match(yearPattern);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }
    }

    // If still not found, try to extract from first flight date (DD.MM. format)
    if (month === 1) {
      // Look for flight dates in format "DD.MM." at the start of lines
      const datePattern = /(?:^|\n)(\d{2})\.(\d{2})\./;
      const dateMatch = fullText.match(datePattern);
      if (dateMatch) {
        const extractedMonth = parseInt(dateMatch[2], 10);
        if (extractedMonth >= 1 && extractedMonth <= 12) {
          month = extractedMonth;
        }
      }
    }
  }

  
  // Parse flight entries
  // Actual PDF format from Lufthansa Flugstundenübersicht:
  // "01.12. LH9141 FRA 09:55-13:55 FRA 00 4,00"
  // "07.12. LH0590 A FRA 10:59-19:21 NBO 00 8,37"
  // Continuation format: "01.04. LH0576/31 FRA 00:00-08:20 CPT 00 8,33" (flight continues from day 31 of previous month)
  // Pattern: DD.MM. LH#### [A|E]? FROM HH:MM-HH:MM TO 00 BLOCKTIME
  // Note: After PDF.js extraction with join(''), text has no spaces between items
  const flightPattern = /(\d{2})\.(\d{2})\.\s*(LH\d+[A-Z]?(?:\/(?:28|29|30|31))?)\s+([AE]\s+)?([A-Z]{3})\s*(\d{2}:\d{2})-(\d{2}:\d{2})\s*([A-Z]{3})\s+\d+\s+([\d,]+)/g;
  
  let match;
  while ((match = flightPattern.exec(fullText)) !== null) {
    const [, day, monthNum, flightNumber, aeFlag, departure, depTime, arrTime, arrival, blockTimeStr] = match;
    
    const parsedDay = parseInt(day, 10);
    const parsedMonth = parseInt(monthNum, 10);
    const flightDate = parseAndValidateDate(year, parsedMonth, parsedDay);
    
    if (!flightDate) {
      warnings.push({
        id: `invalid-date-flight-${day}-${monthNum}-${year}`,
        type: 'data_quality',
        severity: 'warning',
        message: `Ungültiges Datum übersprungen: ${day}.${monthNum}.${year}`,
        details: `Flug ${flightNumber} konnte nicht verarbeitet werden, da das Datum ungültig ist.`,
        dismissible: true,
      });
      continue;
    }
    
    const flightMonth = flightDate.getMonth() + 1;
    
    // Check for continuation flight (e.g., LH123/31)
    const isContinuation = flightNumber.includes('/');
    const continuationOf = isContinuation 
      ? flightNumber.split('/')[0] 
      : undefined;
    
    // Parse block time from document format (e.g., "4,00" -> "4:00")
    const blockTime = blockTimeStr 
      ? blockTimeStr.replace(',', ':').replace('.', ':')
      : '0:00';
    
    // Parse A/E flag (duty code indicating commute)
    const dutyCode = aeFlag ? aeFlag.trim() : undefined;
    
    const flight: Flight = {
      id: `${flightDate.toISOString()}-${flightNumber}-${departure}-${arrival}`,
      date: flightDate,
      month: flightMonth,
      year: flightDate.getFullYear(),
      flightNumber: isContinuation ? flightNumber.split('/')[0] : flightNumber,
      originalFlightNumber: isContinuation ? flightNumber : undefined,
      departure,
      arrival,
      departureTime: depTime,
      arrivalTime: arrTime,
      blockTime,
      dutyCode,
      isContinuation,
      continuationOf,
      departureCountry: getCountryFromAirport(departure),
      arrivalCountry: getCountryFromAirport(arrival),
      country: getCountryFromAirport(arrival), // Backwards compatibility
    };
    
    flights.push(flight);
    
    // Warn about orphaned continuation flights
    if (isContinuation) {
      const hasParent = flights.some(
        (f) => f.flightNumber === continuationOf && 
               f.date.toISOString().split('T')[0] === flightDate.toISOString().split('T')[0]
      );
      if (!hasParent) {
        const continuationDay = flightNumber.split('/')[1];
        const prevMonth = parsedMonth === 1 ? 12 : parsedMonth - 1;
        const prevYear = parsedMonth === 1 ? year - 1 : year;
        
        warnings.push({
          id: `orphan-${flight.id}`,
          type: 'orphaned_continuation',
          severity: 'warning',
          message: `Fortsetzungsflug ${flightNumber} ohne Ausgangsflug gefunden`,
          details: `Der Flug ${flightNumber} am ${day}.${monthNum}. ist eine Fortsetzung vom ${continuationDay}.${prevMonth < 10 ? '0' : ''}${prevMonth}.${prevYear}. Um korrekte Berechnungen zu erhalten, laden Sie bitte auch die Flugstundenübersicht vom ${prevMonth}/${prevYear} hoch. Hinweis: Fortsetzungsflüge sind durch ein "↪ Fortsetzung" Badge in der Flugübersicht gekennzeichnet.`,
          dismissible: true,
        });
      }
    }
  }
  
  // Parse ME (Medical) days
  // PDF format: "27.01.ME MEDICAL" (items joined without separator after PDF.js extraction)
  const meStatusPattern = /(\d{2})\.(\d{2})\.[\s\n]*ME[\s\n]+MEDICAL/g;
  
  while ((match = meStatusPattern.exec(fullText)) !== null) {
    const [, day, monthNum] = match;
    const parsedDay = parseInt(day, 10);
    const parsedMonth = parseInt(monthNum, 10);
    const dayDate = parseAndValidateDate(year, parsedMonth, parsedDay);
    
    if (!dayDate) continue;
    
    const dateStr = dayDate.toISOString().split('T')[0];
    const hasFlights = flights.some((f) => f.date.toISOString().split('T')[0] === dateStr);
    if (hasFlights) continue;
    
    const alreadyExists = nonFlightDays.some((d) => d.id === `${dateStr}-ME`);
    if (!alreadyExists) {
      nonFlightDays.push({
        id: `${dateStr}-ME`,
        date: dayDate,
        month: dayDate.getMonth() + 1,
        year: dayDate.getFullYear(),
        type: 'ME',
        description: getDutyDescription('ME'),
      });
    }
  }
  
  // Parse ground duty days (EM, RE, DP, DT, SI, TK, SB)
  const groundDutyPatterns = [
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*EM[\s\n]+EMERGENCY-TRAINING/g, type: 'EM' as const },
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*RE[\s\n]+BEREITSCHAFT \(RESERVE\)/g, type: 'RE' as const },
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*DP[\s\n]+BUERODIENST/g, type: 'DP' as const },
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*DT[\s\n]+BUERODIENST/g, type: 'DT' as const },
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*SI[\s\n]+SIMULATOR/g, type: 'SI' as const },
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*TK[\s\n]+KURZSCHULUNG/g, type: 'TK' as const },
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*SB[\s\n]+BEREITSCHAFT \(STANDBY\)/g, type: 'SB' as const },
  ];
  
  for (const { pattern, type } of groundDutyPatterns) {
    let groundMatch;
    while ((groundMatch = pattern.exec(fullText)) !== null) {
      const [, day, monthNum] = groundMatch;
      const parsedDay = parseInt(day, 10);
      const parsedMonth = parseInt(monthNum, 10);
      const dayDate = parseAndValidateDate(year, parsedMonth, parsedDay);
      
      if (!dayDate) continue;
      
      const dateStr = dayDate.toISOString().split('T')[0];
      const alreadyExists = nonFlightDays.some((d) => d.id === `${dateStr}-${type}`);
      if (!alreadyExists) {
        nonFlightDays.push({
          id: `${dateStr}-${type}`,
          date: dayDate,
          month: dayDate.getMonth() + 1,
          year: dayDate.getFullYear(),
          type,
          description: getDutyDescription(type),
        });
      }
    }
  }
  
  // Parse FL (abroad/layover) days
  // PDF format: "02.01.FL STRECKENEINSATZTAG"
  const flStatusPattern = /(\d{2})\.(\d{2})\.[\s\n]*FL[\s\n]+STRECKENEINSATZTAG/g;
  
  while ((match = flStatusPattern.exec(fullText)) !== null) {
    const [, day, monthNum] = match;
    const parsedDay = parseInt(day, 10);
    const parsedMonth = parseInt(monthNum, 10);
    const dayDate = parseAndValidateDate(year, parsedMonth, parsedDay);
    
    if (!dayDate) continue;
    
    const dateStr = dayDate.toISOString().split('T')[0];
    const hasFlights = flights.some((f) => f.date.toISOString().split('T')[0] === dateStr);
    if (hasFlights) continue;
    
    const alreadyExists = nonFlightDays.some((d) => d.id === `${dateStr}-FL`);
    if (!alreadyExists) {
      // Try to determine the location from surrounding flights
      const flDate = dayDate.getTime();
      
      // FIRST: Check if next flight DEPARTS FROM abroad (return flight scenario)
      const nextFlight = flights
        .filter((f) => f.date.getTime() > flDate)
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
      
      let country: string | undefined;
      
      if (nextFlight && nextFlight.departureCountry && nextFlight.departureCountry !== 'DE') {
        // Next flight departs from abroad - we're at that location during FL day
        country = nextFlight.departureCountry;
      } else {
        // FALLBACK: Check if previous flight ARRIVED AT abroad (outbound scenario)
        const prevFlight = flights
          .filter((f) => f.date.getTime() < flDate)
          .sort((a, b) => b.date.getTime() - a.date.getTime())[0]; // Most recent first
        
        if (prevFlight && prevFlight.arrivalCountry && prevFlight.arrivalCountry !== 'DE') {
          // Previous flight landed abroad - we're still at that location
          country = prevFlight.arrivalCountry;
        }
      }
      
      nonFlightDays.push({
        id: `${dateStr}-FL`,
        date: dayDate,
        month: dayDate.getMonth() + 1,
        year: dayDate.getFullYear(),
        type: 'FL',
        description: getDutyDescription('FL'),
        country,
      });
    }
  }
  
  const fileInfo: UploadedFile = {
    id: `flugstunden-${year}-${month}-${Date.now()}`,
    name: fileName,
    type: 'flugstunden',
    month,
    year,
    uploadedAt: new Date(),
  };
  
  return { personalInfo, flights, nonFlightDays, fileInfo, warnings };
}

/**
 * Parse Streckeneinsatzabrechnung PDF
 * This document contains reimbursement/allowance data
 */
export async function parseStreckeneinsatzPDF(file: File): Promise<{
  reimbursementData: ReimbursementData;
  fileInfo: UploadedFile;
}> {
  // Capture filename immediately to ensure it's preserved throughout async operations
  const fileName = file.name;
  const textPages = await extractTextFromPDF(file);
  
  // Join pages with newlines to preserve page boundaries
  // Also try joining with spaces for better word separation
  const fullText = textPages.join('\n');
  const fullTextWithSpaces = textPages.join(' ');
  
  // Extract year and month
  // For Streckeneinsatzabrechnung, the month/year is typically in the filename (e.g., "2025-01.pdf")
  let year = new Date().getFullYear();
  let month = 1;

  const filenameDate = parseMonthYearFromFilename(fileName);
  if (filenameDate) {
    year = filenameDate.year;
    month = filenameDate.month;
  } else {
    // Fall back to searching in document text
    const headerText = fullText.slice(0, 500);

    // Try to find "Monat XX / YYYY" pattern
    const monatPattern = /Monat\s*(\d{1,2})\s*\/\s*(\d{4})/i;
    const monatMatch = headerText.match(monatPattern);
    if (monatMatch) {
      const extractedMonth = parseInt(monatMatch[1], 10);
      const extractedYear = parseInt(monatMatch[2], 10);
      if (extractedMonth >= 1 && extractedMonth <= 12) {
        month = extractedMonth;
      }
      if (extractedYear >= 2020 && extractedYear <= 2030) {
        year = extractedYear;
      }
    } else {
      // Fall back to German month names
      const monthNames = ['januar', 'februar', 'märz', 'april', 'mai', 'juni',
        'juli', 'august', 'september', 'oktober', 'november', 'dezember'];

      for (let i = 0; i < monthNames.length; i++) {
        if (fullText.toLowerCase().includes(monthNames[i])) {
          month = i + 1;
          break;
        }
      }

      // Try to find a reasonable year (2020-2030) in the header
      const yearPattern = /\b(20[2-3]\d)\b/;
      const yearMatch = headerText.match(yearPattern);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }
    }
  }

  
  // Extract tax-free reimbursement amount from the \"Summe\" line
  // The Streckeneinsatzabrechnung has a \"Summe\" line at the bottom with columns:
  // Format with 3 columns: Summe: [Total] [Werbko] [Steuer]
  // Format with 2 columns: Summe: [Total] [Steuer]
  // Tax-free amount = Total - Werbko - Steuer
  
  let taxFreeReimbursement = 0;
  
  // Parse numbers, handling German format (comma as decimal separator, dot as thousands separator)
  const parseGermanNumber = (str: string): number => {
    if (!str) return 0;
    // Remove thousands separators (dots) and replace decimal comma with dot
    const normalized = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized);
  };
  
  // Try multiple regex patterns to handle different PDF text extraction formats
  // Each pattern tries to match: Summe/Gesamt + 2 or 3 numbers
  const patterns = [
    // Pattern 1: Standard format with colon and spaces: "Summe: 475,20 91,20"
    /Summe:\s*([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?/i,
    
    // Pattern 2: Without colon: "Summe 475,20 91,20"
    /Summe\s+([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?/i,
    
    // Pattern 3: Using "Gesamt" instead: "Gesamt: 475,20 91,20"
    /Gesamt:?\s*([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?/i,
    
    // Pattern 4: More flexible spacing (handles extra whitespace or tabs)
    /(?:Summe|Gesamt):?\s*([\d.,]+)[^\d]+([\d.,]+)(?:[^\d]+([\d.,]+))?/i,
    
    // Pattern 5: Numbers might be on separate lines
    /(?:Summe|Gesamt):?\s*([\d.,]+)\s*[\n\r]+\s*([\d.,]+)(?:\s*[\n\r]+\s*([\d.,]+))?/i,
    
    // Pattern 6: Very flexible - just look for the word and numbers after it
    /(?:Summe|Gesamt|Total)[:\s]+([\d.,]+)[\s\S]{0,50}?([\d.,]+)(?:[\s\S]{0,50}?([\d.,]+))?/i,
  ];
  
  let summeMatch: RegExpMatchArray | null = null;
  let matchedPattern = -1;
  
  // Try each pattern on both text versions (with newlines and with spaces)
  for (let i = 0; i < patterns.length; i++) {
    // First try on normal text
    summeMatch = fullText.match(patterns[i]);
    if (summeMatch) {
      matchedPattern = i + 1;
      console.log(`[PDF Parser] Summe line matched with pattern ${matchedPattern} (newline-separated)`);
      break;
    }
    
    // If no match, try on text with spaces
    summeMatch = fullTextWithSpaces.match(patterns[i]);
    if (summeMatch) {
      matchedPattern = i + 1;
      console.log(`[PDF Parser] Summe line matched with pattern ${matchedPattern} (space-separated)`);
      break;
    }
  }
  
  if (summeMatch) {
    const value1 = parseGermanNumber(summeMatch[1]);
    const value2 = parseGermanNumber(summeMatch[2]);
    const value3 = summeMatch[3] ? parseGermanNumber(summeMatch[3]) : null;
    
    let docTotal: number;
    let docWerbko: number;
    let docSteuer: number;
    
    if (value3 !== null) {
      // 3 columns: Total, Werbko, Steuer
      docTotal = value1;
      docWerbko = value2;
      docSteuer = value3;
    } else {
      // 2 columns: Total, Steuer
      docTotal = value1;
      docWerbko = 0;
      docSteuer = value2;
    }
    
    // Tax-free = Total - Werbko - Steuer
    taxFreeReimbursement = docTotal - docWerbko - docSteuer;
    
    // CRITICAL FIX: Some PDFs (e.g., June & November 2023) have Werbko as a separate value
    // at the END of the document, formatted as "Werbko10,60" with no space after the legend.
    // If the Summe line didn't capture Werbko (docWerbko === 0), search for it separately.
    if (docWerbko === 0) {
      // Pattern to match "Werbko" followed immediately by a number (German format)
      // E.g., "Werbko10,60" or "Werbko13,80"
      const endWerbkoPattern = /Werbko\s*(\d+[.,]?\d*)/i;
      const endWerbkoMatch = fullText.match(endWerbkoPattern) || fullTextWithSpaces.match(endWerbkoPattern);
      
      if (endWerbkoMatch) {
        const endWerbko = parseGermanNumber(endWerbkoMatch[1]);
        if (endWerbko > 0) {
          console.log(`[PDF Parser] Found standalone Werbko at end of document: ${endWerbko}€`);
          docWerbko = endWerbko;
          // Recalculate tax-free with the found Werbko
          taxFreeReimbursement = docTotal - docWerbko - docSteuer;
        }
      }
    }
    
    console.log(`[PDF Parser] Streckeneinsatzabrechnung parsed successfully: Total=${docTotal}€, Werbko=${docWerbko}€, Steuer=${docSteuer}€, TaxFree=${taxFreeReimbursement}€`);
  } else {
    // Enhanced debugging when parsing fails
    console.warn('[PDF Parser] ❌ Could not find Summe line in Streckeneinsatzabrechnung');
    console.warn('[PDF Parser] Filename:', fileName);
    console.warn('[PDF Parser] Document length:', fullText.length, 'chars');
    
    // Log last 800 chars to see the end of document where Summe should be
    console.warn('[PDF Parser] === Last 800 chars of document (newline-separated) ===');
    console.warn(fullText.slice(-800));
    
    console.warn('[PDF Parser] === Last 800 chars of document (space-separated) ===');
    console.warn(fullTextWithSpaces.slice(-800));
    
    // Find all lines with numbers that might be the Summe line
    const linesWithNumbers = fullText
      .split(/[\n\r]+/)
      .map((line, idx) => ({ line, idx }))
      .filter(({ line }) => /[\d.,]+/.test(line))
      .slice(-15); // Last 15 lines with numbers
    
    console.warn('[PDF Parser] === Last 15 lines containing numbers ===');
    linesWithNumbers.forEach(({ line, idx }) => {
      console.warn(`  Line ${idx}: ${line.substring(0, 150)}`);
    });
    
    // Try to find any occurrence of Summe/Gesamt/Total
    const summeOccurrences = [...fullText.matchAll(/(?:Summe|Gesamt|Total)/gi)];
    if (summeOccurrences.length > 0) {
      console.warn(`[PDF Parser] === Found ${summeOccurrences.length} occurrence(s) of Summe/Gesamt/Total ===`);
      summeOccurrences.forEach((match, idx) => {
        const start = Math.max(0, match.index! - 50);
        const end = Math.min(fullText.length, match.index! + 200);
        console.warn(`  Occurrence ${idx + 1} at index ${match.index}:`);
        console.warn(`    ${fullText.substring(start, end)}`);
      });
    } else {
      console.warn('[PDF Parser] ⚠️  No occurrences of "Summe", "Gesamt", or "Total" found in document!');
    }
    
    // Also check space-separated version
    const summeOccurrencesWithSpaces = [...fullTextWithSpaces.matchAll(/(?:Summe|Gesamt|Total)/gi)];
    if (summeOccurrencesWithSpaces.length > 0) {
      console.warn(`[PDF Parser] === Found ${summeOccurrencesWithSpaces.length} occurrence(s) in space-separated text ===`);
      summeOccurrencesWithSpaces.slice(0, 3).forEach((match, idx) => {
        const start = Math.max(0, match.index! - 50);
        const end = Math.min(fullTextWithSpaces.length, match.index! + 200);
        console.warn(`  Occurrence ${idx + 1} at index ${match.index}:`);
        console.warn(`    ${fullTextWithSpaces.substring(start, end)}`);
      });
    }
  }
  
  // Extract day counts if available
  let domesticDays8h = 0;
  let domesticDays24h = 0;
  const foreignDays: { country: string; days: number; rate: number }[] = [];
  
  // Try to parse specific day counts
  const days8hMatch = fullText.match(/>?\s*8\s*(?:Std|h)[:\s]*(\d+)/i);
  if (days8hMatch) {
    domesticDays8h = parseInt(days8hMatch[1], 10);
  }
  
  const days24hMatch = fullText.match(/24\s*(?:Std|h)[:\s]*(\d+)/i);
  if (days24hMatch) {
    domesticDays24h = parseInt(days24hMatch[1], 10);
  }
  
  const reimbursementData: ReimbursementData = {
    month,
    year,
    taxFreeReimbursement,
    domesticDays8h,
    domesticDays24h,
    foreignDays,
  };
  
  const fileInfo: UploadedFile = {
    id: `streckeneinsatz-${year}-${month}-${Date.now()}`,
    name: fileName,
    type: 'streckeneinsatz',
    month,
    year,
    uploadedAt: new Date(),
  };
  
  return { reimbursementData, fileInfo };
}

/**
 * Extract personal info from document text
 */
function extractPersonalInfo(text: string): PersonalInfo | null {
  // Try to extract name
  const namePatterns = [
    /Name[:\s]+([A-ZÄÖÜa-zäöüß\s]+?)(?:\s+\d|$)/,
    /([A-Z][a-zäöüß]+,\s+[A-Z][a-zäöüß]+)/,
  ];
  
  let name = '';
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      name = match[1].trim();
      break;
    }
  }
  
  // Extract personnel number
  const personnelMatch = text.match(/(?:Personal|PNr|Mitarbeiter)[:\s#]*(\d{5,8})/i);
  const personnelNumber = personnelMatch ? personnelMatch[1] : '';
  
  // Extract cost center
  const costCenterMatch = text.match(/(?:Kostenstelle|KST)[:\s]*([A-Z0-9]+)/i);
  const costCenter = costCenterMatch ? costCenterMatch[1] : '';

  // Extract company
  const companyPatterns = [
    /Gesellschaft[:\s]*([A-ZÄÖÜa-zäöüß0-9.\s&/-]+?)(?=Name|Personal|Dienststelle|Funktion|Muster|Hinweise|$)/i,
    /Firma[:\s]*([A-ZÄÖÜa-zäöüß0-9.\s&/-]+?)(?=Name|Personal|Dienststelle|Funktion|Muster|Hinweise|$)/i,
  ];
  let company = '';
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match) {
      company = match[1].trim();
      break;
    }
  }

  // Extract duty station
  const dutyStationMatch = text.match(
    /Dienststelle[:\s]*([A-Z0-9]+?)(?=Funktion|Muster|Hinweise|Name|Personal|$)/i
  );
  const dutyStation = dutyStationMatch ? dutyStationMatch[1].trim() : '';

  // Extract role/function
  const roleMatch = text.match(
    /Funktion[:\s]*([A-ZÄÖÜa-zäöüß0-9\s/.-]+?)(?=Muster|Hinweise|Dienststelle|Name|Personal|$)/i
  );
  const role = roleMatch ? roleMatch[1].trim() : '';

  // Extract aircraft type
  const aircraftMatch = text.match(/Muster[:\s]*([A-Z0-9-]+)(?=Hinweise|Dienststelle|Name|Personal|Funktion|$)/i);
  const aircraftType = aircraftMatch ? aircraftMatch[1].trim() : '';

  // Extract PK number
  const pkPatterns = [
    /PK\s*(?:Nr|Nummer|No\.?|#)?[:\s-]*([A-Z0-9]+)/i,
    /PK-Nummer[:\s-]*([A-Z0-9]+)/i,
  ];
  let pkNumber = '';
  for (const pattern of pkPatterns) {
    const match = text.match(pattern);
    if (match) {
      pkNumber = match[1].trim();
      break;
    }
  }

  // Extract document date (Erstellt am)
  const documentDateMatch = text.match(/Erstellt\s+am[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
  const documentDate = documentDateMatch ? documentDateMatch[1] : '';

  // Extract sheet/page number (Blatt)
  const sheetMatch = text.match(/Blatt[:\s]*(\d+)/i);
  const sheetNumber = sheetMatch ? sheetMatch[1] : '';
  
  // Extract year
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
  
  if (!name && !personnelNumber && !costCenter && !company && !dutyStation && !role && !aircraftType && !pkNumber && !documentDate && !sheetNumber) {
    return null;
  }
  
  return {
    name,
    personnelNumber,
    costCenter,
    year,
    company: company || undefined,
    dutyStation: dutyStation || undefined,
    role: role || undefined,
    aircraftType: aircraftType || undefined,
    pkNumber: pkNumber || undefined,
    documentDate: documentDate || undefined,
    sheetNumber: sheetNumber || undefined,
  };
}

/**
 * Get human-readable description for duty codes
 */
function getDutyDescription(code: string): string {
  const descriptions: Record<string, string> = {
    ME: 'Medizinische Untersuchung',
    FL: 'Streckeneinsatztag',
    EM: 'Emergency Schulung',
    RE: 'Reserve',
    DP: 'Dispatch',
    DT: 'Duty Time',
    SI: 'Simulator Training',
    TK: 'Training Kurzschulung',
    SB: 'Standby',
    A: 'Fahrt zur Arbeit',
    E: 'Fahrt von Arbeit',
  };
  return descriptions[code] || code;
}

/**
 * Detect document type from document content
 * Only checks for exact header matches in the first page header area
 */
export async function detectDocumentType(file: File): Promise<'flugstunden' | 'streckeneinsatz' | 'unknown'> {
  // Only check document content, not filename
  try {
    const textPages = await extractTextFromPDF(file);
    // Only check the first 1000 characters of the first page for the header
    const headerText = textPages[0]?.substring(0, 1000) || '';
    
    // Look for exact document headers in the header area only
    if (headerText.includes('Flugstunden - Übersicht') || headerText.includes('Flugstunden-Übersicht')) {
      console.log('[DEBUG] File type detected: {filename:', file.name, ', docType: \'flugstunden\'}');
      return 'flugstunden';
    }
    if (headerText.includes('Streckeneinsatz-Abrechnung') || headerText.includes('Streckeneinsatzabrechnung')) {
      console.log('[DEBUG] File type detected: {filename:', file.name, ', docType: \'streckeneinsatz\'}');
      return 'streckeneinsatz';
    }
    
    console.log('[DEBUG] File type detected: {filename:', file.name, ', docType: \'unknown\'}');
  } catch (error) {
    console.warn(`Document type detection failed for "${file.name}":`, error);
    // If PDF parsing fails, return unknown
  }
  
  return 'unknown';
}

/**
 * Check for duplicate file upload
 */
export function checkDuplicateFile(
  newFile: UploadedFile,
  existingFiles: UploadedFile[]
): DataWarning | null {
  const duplicate = existingFiles.find(
    (f) =>
      f.type === newFile.type &&
      f.month === newFile.month &&
      f.year === newFile.year
  );
  
  if (duplicate) {
    return {
      id: `duplicate-${newFile.id}`,
      type: 'duplicate_file',
      severity: 'warning',
      message: `Dokument für ${newFile.type === 'flugstunden' ? 'Flugstunden' : 'Streckeneinsatz'} ${newFile.month}/${newFile.year} bereits vorhanden`,
      details: `Die Datei "${newFile.name}" wurde bereits hochgeladen.`,
      dismissible: true,
    };
  }
  
  return null;
}

/**
 * Check for missing months in uploaded data
 */
export function checkMissingMonths(
  uploadedFiles: UploadedFile[]
): DataWarning[] {
  const warnings: DataWarning[] = [];
  
  const flugstundenFiles = uploadedFiles.filter((f) => f.type === 'flugstunden');
  const streckeneinsatzFiles = uploadedFiles.filter((f) => f.type === 'streckeneinsatz');
  
  if (flugstundenFiles.length === 0 || streckeneinsatzFiles.length === 0) {
    return warnings;
  }
  
  // Get all months covered
  const flugMonths = new Set(flugstundenFiles.map((f) => `${f.year}-${f.month}`));
  const streckMonths = new Set(streckeneinsatzFiles.map((f) => `${f.year}-${f.month}`));
  
  // Find min/max months
  const allMonths = [...flugMonths, ...streckMonths].sort();
  if (allMonths.length < 2) return warnings;
  
  const [minYear, minMonth] = allMonths[0].split('-').map(Number);
  const [maxYear, maxMonth] = allMonths[allMonths.length - 1].split('-').map(Number);
  
  // Check for gaps
  for (let y = minYear; y <= maxYear; y++) {
    const startM = y === minYear ? minMonth : 1;
    const endM = y === maxYear ? maxMonth : 12;
    
    for (let m = startM; m <= endM; m++) {
      const key = `${y}-${m}`;
      
      if (!flugMonths.has(key)) {
        warnings.push({
          id: `missing-flugstunden-${key}`,
          type: 'missing_month',
          severity: 'warning',
          message: `Flugstundenübersicht für ${m}/${y} fehlt`,
          dismissible: true,
        });
      }
      
      if (!streckMonths.has(key)) {
        warnings.push({
          id: `missing-streckeneinsatz-${key}`,
          type: 'missing_month',
          severity: 'warning',
          message: `Streckeneinsatzabrechnung für ${m}/${y} fehlt`,
          dismissible: true,
        });
      }
    }
  }
  
  return warnings;
}
