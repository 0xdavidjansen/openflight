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

// German month names (lowercase) used for text-based fallback parsing
const GERMAN_MONTH_NAMES = [
  'januar', 'februar', 'märz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
];

function isValidYearRange(year: number): boolean {
  return year >= 2020 && year <= 2030;
}

function isValidMonth(month: number): boolean {
  return month >= 1 && month <= 12;
}

/**
 * Strip "Erstellt am DD.MM.YYYY" creation-date stamps from document text.
 * Handles PDF.js extraction artifacts where "Erstellt" and "am" may be fused
 * with no space (e.g., "Erstelltam 06.08.2026") or have irregular spacing.
 */
function stripErstelltAm(text: string): string {
  return text.replace(/Erstellt\s*am\s*:?\s*\d{1,2}\.\d{1,2}\.\d{4}/gi, '');
}

/**
 * Extract month and year from DD.MM.YYYY date strings in the document text.
 *
 * Every Streckeneinsatzabrechnung and Flugstundenübersicht contains multiple
 * dated rows (expense rows or flight entries) that all belong to the same
 * month. By collecting all (month, year) tuples and taking the statistical
 * mode, we get a highly reliable signal that is immune to:
 *  - "Erstellt am" creation-date stamps (only 1 vote, outvoted by data rows)
 *  - Cross-month boundary flights (minority, outvoted)
 *  - Missing or unparseable filenames
 *
 * @returns the most common {month, year} pair, or null if no DD.MM.YYYY dates found
 */
export function parseMonthYearFromRowDates(
  fullText: string
): { year: number; month: number } | null {
  // Strip Erstellt-am stamps so the creation date doesn't get a vote
  const cleanedText = stripErstelltAm(fullText);

  const datePattern = /\b(\d{1,2})\.(\d{2})\.(\d{4})\b/g;
  const counts = new Map<string, { month: number; year: number; count: number }>();

  let match: RegExpExecArray | null;
  while ((match = datePattern.exec(cleanedText)) !== null) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (!isValidMonth(month) || !isValidYearRange(year) || day < 1 || day > 31) {
      continue;
    }

    const key = `${year}-${month}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { month, year, count: 1 });
    }
  }

  if (counts.size === 0) {
    return null;
  }

  // Return the (month, year) pair with the highest vote count
  let best: { month: number; year: number; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }

  return best ? { year: best.year, month: best.month } : null;
}

function parseMonthYearFromFilename(fileName: string): { year: number; month: number } | null {
  const yearFirstMatch = fileName.match(/(\d{4})[_-](\d{1,2})/);
  if (yearFirstMatch) {
    const year = parseInt(yearFirstMatch[1], 10);
    const month = parseInt(yearFirstMatch[2], 10);
    if (isValidYearRange(year) && isValidMonth(month)) {
      return { year, month };
    }
  }

  const monthFirstMatch = fileName.match(/(\d{1,2})[_-](\d{4})/);
  if (monthFirstMatch) {
    const month = parseInt(monthFirstMatch[1], 10);
    const year = parseInt(monthFirstMatch[2], 10);
    if (isValidYearRange(year) && isValidMonth(month)) {
      return { year, month };
    }
  }

  return null;
}

/**
 * Parse month and year from a document using multiple strategies in order of reliability.
 *
 * This is shared between Flugstundenübersicht and Streckeneinsatzabrechnung parsing
 * because both documents share the same Lufthansa layout conventions but differ in
 * how the "Monat" header is positioned. Critically, this function avoids picking up
 * the "Erstellt am DD.MM.YYYY" creation date as the document year, which previously
 * caused reimbursements for older months to be misassigned to the current year.
 *
 * Strategies (in order):
 *  1. Filename pattern: YYYY-MM or MM-YYYY with `_-/` separator
 *  2. "Monat XX / YYYY" anywhere in the document text
 *  3. Other German headers: "Abrechnungsmonat", "für Monat", "Streckeneinsatz-Abrechnung MM/YYYY"
 *  4. "MonthName YYYY" pattern (e.g., "August 2025", "August/2025") — this binds the
 *     month name to a specific year and is highly reliable
 *  5. DD.MM.YYYY row-date mode — collects all full dates in the document and returns
 *     the most common (month, year) pair. Works for documents with no headers or month
 *     names but many dated data rows (standard Streckeneinsatzabrechnung layout).
 *  6. Last-resort fallback: Month name + first plausible year that is NOT part of an
 *     "Erstellt am" creation-date stamp
 */
export function parseMonthYearFromDocument(
  fileName: string,
  fullText: string
): { year: number; month: number } | null {
  // Strategy 1: Filename
  const filenameDate = parseMonthYearFromFilename(fileName);
  if (filenameDate) {
    return filenameDate;
  }

  // Strategy 2: "Monat XX / YYYY" anywhere in the document.
  // Search the full text, not just the first 500 chars: in the Streckeneinsatz-
  // Abrechnung the Monat header can appear after a long personal-info block.
  const monatPattern = /Monat\s*:?\s*(\d{1,2})\s*[/\-._]\s*(\d{4})/i;
  const monatMatch = fullText.match(monatPattern);
  if (monatMatch) {
    const month = parseInt(monatMatch[1], 10);
    const year = parseInt(monatMatch[2], 10);
    if (isValidYearRange(year) && isValidMonth(month)) {
      return { year, month };
    }
  }

  // Strategy 3: Other document-specific German headers
  const altPatterns = [
    /Abrechnungsmonat\s*:?\s*(\d{1,2})\s*[/\-._]\s*(\d{4})/i,
    /für\s+Monat\s*:?\s*(\d{1,2})\s*[/\-._]\s*(\d{4})/i,
    /Streckeneinsatz-?Abrechnung\s*:?\s*(\d{1,2})\s*[/\-._]\s*(\d{4})/i,
    /Flugstunden-?Übersicht\s*:?\s*(\d{1,2})\s*[/\-._]\s*(\d{4})/i,
  ];
  for (const pattern of altPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const month = parseInt(match[1], 10);
      const year = parseInt(match[2], 10);
      if (isValidYearRange(year) && isValidMonth(month)) {
        return { year, month };
      }
    }
  }

  // Strategy 4: "MonthName YYYY" — binds the month name to a specific year, e.g.
  // "August 2025" or "August/2025". This avoids the year-confusion bug where
  // the creation date's year would be picked up.
  for (let i = 0; i < GERMAN_MONTH_NAMES.length; i++) {
    const pattern = new RegExp(
      `\\b${GERMAN_MONTH_NAMES[i]}\\s*[/\\-._]?\\s*(\\d{4})\\b`,
      'i'
    );
    const match = fullText.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (isValidYearRange(year)) {
        return { year, month: i + 1 };
      }
    }
  }

  // Strategy 5: DD.MM.YYYY row-date extraction — the most reliable signal for
  // Streckeneinsatzabrechnung and Flugstundenübersicht documents that contain
  // many dated rows but no "Monat" header or spelled-out month name. Collects
  // all dates and takes the mode, which naturally ignores the single Erstellt-am
  // creation-date stamp.
  const rowDateResult = parseMonthYearFromRowDates(fullText);
  if (rowDateResult) {
    return rowDateResult;
  }

  // Strategy 6: Last-resort fallback — month name only, then look for a year that
  // is NOT part of the "Erstellt am" creation-date stamp.
  let fallbackMonth: number | null = null;
  const lowerText = fullText.toLowerCase();
  for (let i = 0; i < GERMAN_MONTH_NAMES.length; i++) {
    if (new RegExp(`\\b${GERMAN_MONTH_NAMES[i]}\\b`, 'i').test(lowerText)) {
      fallbackMonth = i + 1;
      break;
    }
  }

  if (fallbackMonth !== null) {
    const textWithoutCreatedDate = stripErstelltAm(fullText);
    const yearPattern = /\b(20[2-3]\d)\b/;
    const yearMatch = textWithoutCreatedDate.match(yearPattern);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (isValidYearRange(year)) {
        return { year, month: fallbackMonth };
      }
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

  const parsedDate = parseMonthYearFromDocument(fileName, fullText);
  if (parsedDate) {
    year = parsedDate.year;
    month = parsedDate.month;
  } else {
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
  
  // Parse ground duty days (EM, RE, RB, DP, DT, SI, TK, SB)
  const groundDutyPatterns = [
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*EM[\s\n]+EMERGENCY-TRAINING/g, type: 'EM' as const },
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*RE[\s\n]+BEREITSCHAFT \(RESERVE\)/g, type: 'RE' as const },
    { pattern: /(\d{2})\.(\d{2})\.[\s\n]*RB[\s\n]+RUFBEREITSCHAFT/g, type: 'RB' as const },
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
 * Parse reimbursement from individual expense rows in a Streckeneinsatzabrechnung.
 *
 * This is the primary (most reliable) strategy for extracting the tax-free amount.
 * Instead of guessing the Summe line column layout (which varies between documents),
 * it sums up Spesenanspruch (total expense) from dated rows and subtracts the
 * total Steuer (taxable portion) found in 3-number sequences (stfrei, Steuer, Werbko).
 *
 * @returns tax-free reimbursement amount, or null if no expense rows were found
 */
export function parseReimbursementFromRows(
  fullText: string,
  parseNumber: (str: string) => number
): number | null {
  // Only search the data region (before the Summe line) to avoid capturing totals
  const summeIdx = fullText.search(/Summe/i);
  const dataRegion = summeIdx > 0 ? fullText.substring(0, summeIdx) : fullText;

  // Extract Spesenanspruch amounts from dated rows
  // Pattern: DD.MM.YYYY HH:MM [HH:MM] amount Ort ...
  const spesenanspruchPattern = /\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+(?:\d{2}:\d{2}\s+)?(\d+(?:[.,]\d+)?)/g;
  const spesenanspruchValues = [...dataRegion.matchAll(spesenanspruchPattern)]
    .map((m) => parseNumber(m[1]));
  const totalSpesenanspruch = spesenanspruchValues.reduce((sum, v) => sum + v, 0);

  // Extract Steuer (taxable portion) from 3-number sequences (stfrei, Steuer, Werbko)
  // These appear inline in data rows and as per-location subtotals
  const threeNumPattern = /(\d+[.,]\d{2})\s+(\d+[.,]\d{2})\s+(\d+[.,]\d{2})/g;
  const steuerValues = [...dataRegion.matchAll(threeNumPattern)]
    .map((m) => parseNumber(m[2])); // Middle value is Steuer
  const totalSteuer = steuerValues.reduce((sum, v) => sum + v, 0);

  if (totalSpesenanspruch > 0) {
    const taxFree = Math.max(0, totalSpesenanspruch - totalSteuer);
    console.log(`[PDF Parser] Row-level parsing: ${spesenanspruchValues.length} rows, Spesenanspruch=${totalSpesenanspruch}€, Steuer=${totalSteuer}€, TaxFree=${taxFree}€`);
    return taxFree;
  }

  return null;
}

/**
 * Parse the tax-free reimbursement from the "Summe:" line at the bottom of a
 * Streckeneinsatzabrechnung. This is the authoritative, primary strategy: it
 * reads Lufthansa's own printed total rather than reconstructing it from rows.
 *
 * The Summe line has 2 or 3 numeric columns:
 *  - 3 columns: Summe: [Total] [Werbko] [Steuer]   →  taxFree = Total - Werbko - Steuer
 *  - 2 columns: Summe: [Total] [stfrei|Steuer]
 *      When the two values are equal, Steuer must be 0 (Total = stfrei + Steuer),
 *      so the second column is stfrei (tax-free) and taxFree = Total.
 *      Otherwise the second column is Steuer and taxFree = Total - Steuer.
 *
 * Also handles the legacy "WerbkoNN,NN" suffix some 2023 PDFs append after the
 * legend with no separating space.
 *
 * @returns tax-free reimbursement amount, or null if no Summe line was found
 */
export function parseReimbursementFromSummeLine(
  fullText: string,
  fullTextWithSpaces: string,
  parseNumber: (str: string) => number
): number | null {
  const patterns = [
    /Summe:\s*([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?/i,
    /Summe\s+([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?/i,
    /Gesamt:?\s*([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?/i,
    /(?:Summe|Gesamt):?\s*([\d.,]+)[^\d]+([\d.,]+)(?:[^\d]+([\d.,]+))?/i,
    /(?:Summe|Gesamt):?\s*([\d.,]+)\s*[\n\r]+\s*([\d.,]+)(?:\s*[\n\r]+\s*([\d.,]+))?/i,
    /(?:Summe|Gesamt|Total)[:\s]+([\d.,]+)[\s\S]{0,50}?([\d.,]+)(?:[\s\S]{0,50}?([\d.,]+))?/i,
  ];

  let summeMatch: RegExpMatchArray | null = null;
  for (let i = 0; i < patterns.length; i++) {
    summeMatch = fullText.match(patterns[i]) || fullTextWithSpaces.match(patterns[i]);
    if (summeMatch) break;
  }

  if (!summeMatch) {
    return null;
  }

  const value1 = parseNumber(summeMatch[1]);
  const value2 = parseNumber(summeMatch[2]);
  const value3 = summeMatch[3] ? parseNumber(summeMatch[3]) : null;

  let docTotal: number;
  let docWerbko: number;
  let docSteuer: number;

  if (value3 !== null) {
    docTotal = value1;
    docWerbko = value2;
    docSteuer = value3;
  } else {
    docTotal = value1;
    docWerbko = 0;
    if (value1 === value2) {
      docSteuer = 0;
    } else {
      docSteuer = value2;
    }
  }

  let taxFreeReimbursement = docTotal - docWerbko - docSteuer;

  // Legacy: some 2023 PDFs append "WerbkoNN,NN" after the legend with no space.
  if (docWerbko === 0) {
    const endWerbkoMatch = fullText.match(/Werbko\s*(\d+[.,]?\d*)/i)
      || fullTextWithSpaces.match(/Werbko\s*(\d+[.,]?\d*)/i);
    if (endWerbkoMatch) {
      const endWerbko = parseNumber(endWerbkoMatch[1]);
      if (endWerbko > 0) {
        taxFreeReimbursement = docTotal - endWerbko - docSteuer;
      }
    }
  }

  return taxFreeReimbursement;
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

  const parsedDate = parseMonthYearFromDocument(fileName, fullText);
  if (parsedDate) {
    year = parsedDate.year;
    month = parsedDate.month;
  } else {
    // Defensive fallback: extract from DD.MM.YYYY row dates before using current year
    const rowDate = parseMonthYearFromRowDates(fullText);
    if (rowDate) {
      year = rowDate.year;
      month = rowDate.month;
    }
  }

  // Extract tax-free reimbursement amount.
  // Primary strategy: parse the "Summe:" line at the bottom of the document.
  // The Summe line is Lufthansa's authoritative printed total and is always present.
  // It correctly accounts for continuation rows (no departure time) and per-location
  // subtotals that row-level regex parsing cannot reliably reconstruct — which is why
  // the previous row-level "Strategy 1" approach undercounted Spesenanspruch on most
  // months and reported 0,00€. parseReimbursementFromRows is kept exported for
  // backwards compatibility but is no longer called here.

  let taxFreeReimbursement = 0;

  // Parse numbers, handling German format (comma as decimal separator, dot as thousands separator)
  const parseGermanNumber = (str: string): number => {
    if (!str) return 0;
    // Remove thousands separators (dots) and replace decimal comma with dot
    const normalized = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized);
  };

  const summeResult = parseReimbursementFromSummeLine(fullText, fullTextWithSpaces, parseGermanNumber);
  if (summeResult !== null) {
    taxFreeReimbursement = summeResult;
    console.log(`[PDF Parser] Streckeneinsatzabrechnung parsed successfully: TaxFree=${taxFreeReimbursement}€`);
  } else {
    // Enhanced debugging when parsing fails
    console.warn('[PDF Parser] ❌ Could not find Summe line in Streckeneinsatzabrechnung');
    console.warn('[PDF Parser] Filename:', fileName);
    console.warn('[PDF Parser] Document length:', fullText.length, 'chars');
    console.warn('[PDF Parser] === Last 800 chars of document (newline-separated) ===');
    console.warn(fullText.slice(-800));
    console.warn('[PDF Parser] === Last 800 chars of document (space-separated) ===');
    console.warn(fullTextWithSpaces.slice(-800));
  }

  // Note: Day counts are now calculated automatically from flight data
  // Legacy PDF parsing for day counts is no longer supported
  const countryDays: { country: string; days8h: number; days24h: number; rate8h: number; rate24h: number }[] = [];
  
  const reimbursementData: ReimbursementData = {
    month,
    year,
    taxFreeReimbursement,
    countryDays,
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

  // Parse homebase from Dienstelle field
  // The Dienstelle field typically starts with FRA or MUC (e.g., "FRA", "MUC", "FRA-CC", etc.)
  let parsedHomebase: 'MUC' | 'FRA' | null = null;
  if (dutyStation) {
    const homebasePrefix = dutyStation.substring(0, 3).toUpperCase();
    if (homebasePrefix === 'FRA') {
      parsedHomebase = 'FRA';
    } else if (homebasePrefix === 'MUC') {
      parsedHomebase = 'MUC';
    }
  }

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
    parsedHomebase: parsedHomebase ?? undefined,
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
    SEC: 'SEC+EM.Schulung',
    RE: 'Reserve',
    RB: 'Rufbereitschaft',
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


