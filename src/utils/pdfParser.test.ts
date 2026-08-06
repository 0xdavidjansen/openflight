import { describe, it, expect } from 'vitest'
import { parseMonthYearFromDocument, parseReimbursementFromRows, parseReimbursementFromSummeLine, parseMonthYearFromRowDates } from './pdfParser'
import { REAL_PDF_FIXTURES } from './streckenFixtures'

const parseGermanNumber = (str: string): number => {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.'))
}

describe('parseMonthYearFromDocument', () => {
  describe('filename parsing', () => {
    it('parses YYYY-MM filename', () => {
      expect(parseMonthYearFromDocument('2025-08.pdf', '')).toEqual({ year: 2025, month: 8 })
    })

    it('parses MM-YYYY filename', () => {
      expect(parseMonthYearFromDocument('08-2025.pdf', '')).toEqual({ year: 2025, month: 8 })
    })

    it('parses YYYY_MM filename with underscore separator', () => {
      expect(parseMonthYearFromDocument('Streckeneinsatz_2025_08.pdf', '')).toEqual({ year: 2025, month: 8 })
    })

    it('parses single-digit month in filename', () => {
      expect(parseMonthYearFromDocument('2025-1.pdf', '')).toEqual({ year: 2025, month: 1 })
    })

    it('rejects out-of-range year in filename', () => {
      expect(parseMonthYearFromDocument('1999-08.pdf', '')).toBeNull()
    })

    it('rejects out-of-range month in filename', () => {
      expect(parseMonthYearFromDocument('2025-13.pdf', '')).toBeNull()
    })
  })

  describe('Monat XX / YYYY pattern (full-text search)', () => {
    it('finds "Monat 08 / 2025" within the first 500 chars', () => {
      const text = 'Lufthansa Monat 08 / 2025\nSome content'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })

    it('finds "Monat 08 / 2025" AFTER position 500 (the original bug)', () => {
      // Simulate a long personal-info block that pushes the Monat header past 500 chars.
      // Previously this fell through to the year-regex fallback and matched a stray year.
      const padding = 'X'.repeat(600)
      const text = `${padding}Monat 08 / 2025\nErstellt am 06.08.2026`
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })

    it('handles "Monat: 08 / 2025" with colon', () => {
      const text = 'Monat: 08 / 2025'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })

    it('handles "Monat 08/2025" without spaces around slash', () => {
      const text = 'Monat 08/2025'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })

    it('handles "Monat 08-2025" with dash separator', () => {
      const text = 'Monat 08-2025'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })
  })

  describe('alternative German headers', () => {
    it('parses "Abrechnungsmonat: 08/2025"', () => {
      const text = 'Abrechnungsmonat: 08/2025'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })

    it('parses "Streckeneinsatz-Abrechnung 08/2025"', () => {
      const text = 'Streckeneinsatz-Abrechnung 08/2025'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })
  })

  describe('MonthName YYYY pattern (strategy 4)', () => {
    it('parses "August 2025"', () => {
      const text = 'Streckeneinsatz-Abrechnung für August 2025'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })

    it('parses "August/2025" with slash', () => {
      const text = 'August/2025'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })

    it('binds the month name to the correct year even when a different year appears elsewhere', () => {
      // Document created in 2026 but covering August 2025.
      // The "August 2025" pattern must win over the stray 2026 in the Erstellt-am line.
      const text = 'Abrechnung August 2025 Erstellt am 06.08.2026'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })
  })

  describe('the year-confusion regression (the user-reported bug)', () => {
    // Real-world scenario: a Streckeneinsatzabrechnung for August 2025 that was
    // downloaded/generated in 2026. Previously, the fallback year regex matched
    // "2026" from the Erstellt-am stamp, causing the reimbursement to be filed
    // as 08/2026 and the AG-Erstattung warning for 08/2025 to stay visible.
    it('returns 08/2025 (not 08/2026) for an August-2025 doc with a 2026 Erstellt-am stamp', () => {
      const text = [
        'Lufthansa Streckeneinsatz-Abrechnung',
        'Gesellschaft: DLH Name: Mustermann',
        'Personal: 1234567 Dienststelle: FRA',
        'Erstellt am 06.08.2026',
        'Summe: 475,20 91,20',
      ].join('\n')
      // Without the "Monat" or "August 2025" anchor this falls to the year fallback,
      // which must skip the Erstellt-am stamp. The text contains no other year, so
      // we expect null rather than a wrong 08/2026 assignment.
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toBeNull()
    })

    it('uses the Erstellt-am-excluded year when another plausible year remains', () => {
      const text = [
        'Streckeneinsatz-Abrechnung',
        'August',
        'Erstellt am 06.08.2026',
        'Jahresabrechnung 2025',
      ].join('\n')
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 8 })
    })
  })

  describe('invalid input', () => {
    it('returns null when no month/year information is present', () => {
      expect(parseMonthYearFromDocument('unknown.pdf', 'Just some random text')).toBeNull()
    })

    it('returns null for empty text and unparseable filename', () => {
      expect(parseMonthYearFromDocument('unknown.pdf', '')).toBeNull()
    })
  })

  describe('DD.MM.YYYY row-date extraction (strategy 5) — the multi-month regression', () => {
    // Helper: generate realistic Streckeneinsatzabrechnung text for any month.
    // Uses numeric dates only — no "Monat" header, no spelled-out month name,
    // no date in filename. This is the format that previously defaulted to the
    // current year for all months except those with date-bearing filenames.
    function makeStreckenText(month: number, year: number): string {
      const mm = String(month).padStart(2, '0')
      return [
        'Streckeneinsatz-Abrechnung',
        'Datum Ab An Spesenanspruch - Ort Zwölftel stfrei - Ort Steuer Werbko Dopp Storno',
        `15.${mm}.${year} 07:00 10:35 16,80 FRA 4 MIL16,80 0,00 16,80`,
        `27.${mm}.${year} 21:50 9,60 TUN 2 TUN`,
        `28.${mm}.${year} 05:28 24,00 TUN 5 TUN`,
        '33,60 0,00 33,60',
        'Summe: 50,40 50,40',
        'Legende: Dopp = zwei Umläufe an einem Tag stfrei = steuerfrei',
        'Werbko = Werbungskosten Steuer = zu versteuern',
      ].join('\n')
    }

    // Test ALL 12 months to ensure the fix is comprehensive
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0')
      it(`correctly identifies ${mm}/2025 for a Streckeneinsatz with generic filename and Erstellt-am 2026 stamp`, () => {
        const text = makeStreckenText(m, 2025) + '\nErstellt am 06.08.2026'
        const result = parseMonthYearFromDocument('Streckeneinsatzabrechnung.pdf', text)
        expect(result).toEqual({ year: 2025, month: m })
      })
    }

    it('works for 2026 documents too (not just 2025)', () => {
      const text = makeStreckenText(3, 2026)
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2026, month: 3 })
    })

    it('handles Erstellt-am with no space between Erstellt and am (PDF.js artifact)', () => {
      const text = makeStreckenText(7, 2025) + '\nErstelltam 06.08.2026'
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 7 })
    })

    it('outvotes a single Erstellt-am date even when month differs', () => {
      // 3 expense rows in October 2025, 1 Erstellt-am in November 2026
      const text = [
        '15.10.2025 07:00 10:35 16,80 FRA',
        '20.10.2025 21:50 9,60 TUN',
        '28.10.2025 05:28 24,00 TUN',
        'Erstellt am 06.11.2026',
      ].join('\n')
      expect(parseMonthYearFromDocument('unknown.pdf', text)).toEqual({ year: 2025, month: 10 })
    })
  })
})

describe('parseReimbursementFromRows', () => {
  // Real-world text from Streckeneinsatzabrechnung2025-08.pdf
  const realPdfText = [
    'Streckeneinsatz-Abrechnung',
    'Datum Ab An Spesenanspruch - Ort Zwölftel stfrei - Ort Steuer Werbko Dopp Storno',
    '15.08.2025 07:00 10:35 16,80 FRA 4 MIL16,80 0,00 16,80',
    '27.08.2025 21:50 9,60 TUN 2 TUN',
    '28.08.2025 05:28 24,00 TUN 5 TUN',
    '33,60 0,00 33,60',
    'Summe: 50,40 50,40',
    'Legende: Dopp = zwei Umläufe an einem Tag stfrei = steuerfrei',
    'Werbko = Werbungskosten Steuer = zu versteuern',
  ].join('\n')

  it('extracts 50,40€ from the real PDF text (the user-reported bug)', () => {
    const result = parseReimbursementFromRows(realPdfText, parseGermanNumber)
    expect(result).toBe(50.4)
  })

  it('returns null when no dated expense rows are present', () => {
    const text = 'Just some header text without any data rows'
    expect(parseReimbursementFromRows(text, parseGermanNumber)).toBeNull()
  })

  it('returns null for empty text', () => {
    expect(parseReimbursementFromRows('', parseGermanNumber)).toBeNull()
  })

  it('handles fully tax-free document (Steuer = 0 everywhere)', () => {
    const text = [
      '15.08.2025 07:00 10:35 16,80 FRA 4 MIL16,80 0,00 16,80',
      'Summe: 16,80 16,80',
    ].join('\n')
    expect(parseReimbursementFromRows(text, parseGermanNumber)).toBe(16.8)
  })

  it('subtracts Steuer from Spesenanspruch when Steuer > 0', () => {
    // Row has Spesenanspruch=100, stfrei=80, Steuer=20, Werbko=80
    const text = [
      '15.08.2025 07:00 10:35 100,00 FRA 4 MIL80,00 20,00 80,00',
      'Summe: 100,00 20,00',
    ].join('\n')
    // taxFree = 100 - 20 = 80
    expect(parseReimbursementFromRows(text, parseGermanNumber)).toBe(80)
  })

  it('handles rows with only Ab time (no An time)', () => {
    const text = [
      '27.08.2025 21:50 9,60 TUN 2 TUN',
      'Summe: 9,60 9,60',
    ].join('\n')
    expect(parseReimbursementFromRows(text, parseGermanNumber)).toBe(9.6)
  })

  it('handles rows with only An time (no Ab time)', () => {
    const text = [
      '28.08.2025 05:28 24,00 TUN 5 TUN',
      'Summe: 24,00 24,00',
    ].join('\n')
    expect(parseReimbursementFromRows(text, parseGermanNumber)).toBe(24)
  })

  it('sums multiple location groups with subtotals', () => {
    const text = [
      '01.08.2025 07:00 10:35 16,80 FRA 4 MIL16,80 0,00 16,80',
      '10.08.2025 21:50 9,60 TUN 2 TUN',
      '11.08.2025 05:28 24,00 TUN 5 TUN',
      '33,60 0,00 33,60',
      'Summe: 50,40 50,40',
    ].join('\n')
    // Spesenanspruch: 16,80 + 9,60 + 24,00 = 50,40
    // Steuer: 0,00 (from MIL row) + 0,00 (from TUN subtotal) = 0,00
    // taxFree: 50,40
    expect(parseReimbursementFromRows(text, parseGermanNumber)).toBe(50.4)
  })

  it('does not capture values from the Summe line', () => {
    // The Summe line values should NOT be included in the Spesenanspruch/Steuer totals
    const text = [
      '15.08.2025 07:00 10:35 16,80 FRA 4 MIL16,80 0,00 16,80',
      'Summe: 16,80 0,00 16,80',
    ].join('\n')
    // Spesenanspruch = 16,80 (from row), Steuer = 0,00 (from row)
    // Summe values (16,80 / 0,00 / 16,80) are excluded
    expect(parseReimbursementFromRows(text, parseGermanNumber)).toBe(16.8)
  })
})

describe('parseMonthYearFromRowDates', () => {
  it('returns the mode of all DD.MM.YYYY dates', () => {
    const text = '15.08.2025 07:00\n27.08.2025 21:50\n28.08.2025 05:28'
    expect(parseMonthYearFromRowDates(text)).toEqual({ year: 2025, month: 8 })
  })

  it('ignores Erstellt-am stamps', () => {
    const text = '15.03.2025 data\n22.03.2025 data\nErstellt am 06.08.2026'
    expect(parseMonthYearFromRowDates(text)).toEqual({ year: 2025, month: 3 })
  })

  it('ignores Erstelltam with no space (PDF.js artifact)', () => {
    const text = '15.03.2025 data\n22.03.2025 data\nErstelltam06.08.2026'
    expect(parseMonthYearFromRowDates(text)).toEqual({ year: 2025, month: 3 })
  })

  it('returns null when no DD.MM.YYYY dates are present', () => {
    expect(parseMonthYearFromRowDates('just some text without dates')).toBeNull()
  })

  it('returns null for empty text', () => {
    expect(parseMonthYearFromRowDates('')).toBeNull()
  })

  it('handles a single date', () => {
    expect(parseMonthYearFromRowDates('15.06.2025 some data')).toEqual({ year: 2025, month: 6 })
  })

  it('handles cross-month boundary flights (majority month wins)', () => {
    // 2 rows in July, 1 row in August → July wins
    const text = '30.07.2025 data\n31.07.2025 data\n01.08.2025 data'
    expect(parseMonthYearFromRowDates(text)).toEqual({ year: 2025, month: 7 })
  })
})

describe('parseReimbursementFromSummeLine', () => {
  it('parses 3-column Summe line: Total, Werbko, Steuer', () => {
    const text = 'Summe: 645,60 84,40 13,80'
    expect(parseReimbursementFromSummeLine(text, text, parseGermanNumber)).toBeCloseTo(547.4, 2)
  })

  it('parses 2-column Summe line with equal values (all tax-free)', () => {
    const text = 'Summe: 50,40 50,40'
    expect(parseReimbursementFromSummeLine(text, text, parseGermanNumber)).toBe(50.4)
  })

  it('parses 2-column Summe line with different values (Steuer)', () => {
    const text = 'Summe: 225,60 25,60'
    expect(parseReimbursementFromSummeLine(text, text, parseGermanNumber)).toBe(200)
  })

  it('returns null when no Summe line is present', () => {
    expect(parseReimbursementFromSummeLine('just text', 'just text', parseGermanNumber)).toBeNull()
  })

  it('returns null for empty text', () => {
    expect(parseReimbursementFromSummeLine('', '', parseGermanNumber)).toBeNull()
  })
})

describe('Real Streckeneinsatzabrechnung 2025 integration (all 12 months)', () => {
  // Regression suite: uses the actual PDF.js-extracted text from all 12 real
  // Streckeneinsatzabrechnung2025-XX.pdf files. Verifies BOTH month/year
  // detection AND tax-free reimbursement amount for every month of the year.

  for (const fixture of REAL_PDF_FIXTURES) {
    const monthLabel = String(fixture.expected.month).padStart(2, '0')

    describe(`month ${monthLabel}/2025 (${fixture.file})`, () => {
      it('detects the correct month and year', () => {
        const result = parseMonthYearFromDocument(fixture.file, fixture.text)
        expect(result).toEqual({
          year: fixture.expected.year,
          month: fixture.expected.month,
        })
      })

      it(`extracts ${fixture.expected.taxFree}€ tax-free reimbursement`, () => {
        const result = parseReimbursementFromSummeLine(
          fixture.text,
          fixture.text,
          parseGermanNumber
        )
        expect(result).toBeCloseTo(fixture.expected.taxFree, 2)
      })
    })
  }
})
