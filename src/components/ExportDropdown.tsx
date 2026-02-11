import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText } from 'lucide-react';
import { useApp } from '../hooks';
import { formatDateStr } from '../utils/calculations';
import { getCountryName } from '../utils/airports';
import { generateFlightPDF } from '../utils/pdfExport';
import type { Flight, NonFlightDay } from '../types';

export function ExportDropdown() {
  const { state, dailyAllowances, monthlyBreakdown, taxCalculation, totalFlightHours, totalWorkDays } = useApp();
  const { flights, nonFlightDays, settings } = state;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasData = flights.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Helper: Format date as DD.MM.YYYY
  const formatDateGerman = (date: Date): string => {
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Helper: Format currency with German comma
  const formatCurrencyGerman = (value: number): string => {
    return value.toFixed(2).replace('.', ',');
  };

  // Helper: Check if flight arrives next day
  const isOvernightFlight = (flight: Flight): boolean => {
    const parseTime = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const depTime = parseTime(flight.departureTime);
    const arrTime = parseTime(flight.arrivalTime);
    return arrTime < depTime;
  };

  // Helper: Format time with +1 if overnight
  const formatArrivalTime = (flight: Flight): string => {
    return isOvernightFlight(flight) 
      ? `${flight.arrivalTime}+1` 
      : flight.arrivalTime;
  };

  // Generate Arbeitstage CSV
  const generateArbeitstageCSV = () => {
    const rows: string[][] = [];
    
    // Header
    rows.push([
      'Datum',
      'Code',
      'Flugnummer',
      'Route',
      'Abflug Zeit',
      'Ankunft Zeit',
      'Blockzeit',
      'Land',
      'Tagessatz (EUR)'
    ]);
    
    // Combine flights and non-flight days
    type WorkDay = (Flight | NonFlightDay) & { sortDate: Date };
    const allWorkDays: WorkDay[] = [
      ...flights.map(f => ({ ...f, sortDate: f.date })),
      ...nonFlightDays.map(d => ({ ...d, sortDate: d.date }))
    ];
    
    // Sort by date
    allWorkDays.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    
    // Track which dates we've shown allowances for (only first item per day)
    const allowanceShownForDate = new Set<string>();
    
    // Format each work day
    for (const day of allWorkDays) {
      const dateStr = formatDateStr(day.date);
      const dateGerman = formatDateGerman(day.date);
      const allowanceInfo = dailyAllowances?.get(dateStr);
      const isFirstOfDay = !allowanceShownForDate.has(dateStr);
      
      if ('flightNumber' in day) {
        // It's a flight
        const flight = day as Flight;
        const country = getCountryName(flight.country);
        
        // Show allowance only on first flight/item of the day
        let allowanceText = '';
        if (isFirstOfDay && allowanceInfo && allowanceInfo.rate > 0) {
          allowanceText = formatCurrencyGerman(allowanceInfo.rate);
          allowanceShownForDate.add(dateStr);
        }
        
        rows.push([
          dateGerman,
          flight.dutyCode || '-',
          flight.flightNumber + (flight.isContinuation ? ' ↪' : ''),
          `${flight.departure}-${flight.arrival}`,
          flight.departureTime,
          formatArrivalTime(flight),
          flight.blockTime,
          country,
          allowanceText
        ]);
      } else {
        // It's a non-flight day
        const nfd = day as NonFlightDay;
        const country = nfd.country ? getCountryName(nfd.country) : 'Deutschland';
        
        // Show allowance only on first item of the day
        let allowanceText = '-';
        if (isFirstOfDay && allowanceInfo && allowanceInfo.rate > 0) {
          allowanceText = formatCurrencyGerman(allowanceInfo.rate);
          allowanceShownForDate.add(dateStr);
        }
        
        rows.push([
          dateGerman,
          nfd.type,
          '-',
          nfd.description,
          '-',
          '-',
          '-',
          country,
          allowanceText
        ]);
      }
    }
    
    // Add monthly breakdown section
    rows.push([]);
    rows.push(['ÜBERSICHT - DETAILS PRO MONAT']);
    rows.push([
      'Monat',
      'Flugstunden',
      'Arbeitstage',
      'Fahrten',
      'Entfernungspauschale (EUR)',
      'Verpflegung (EUR)',
      'AG-Erstattung (EUR)',
      'Trinkgeld (EUR)',
      'Reinigung (EUR)'
    ]);
    
    for (const month of monthlyBreakdown) {
      rows.push([
        `${month.monthName} ${month.year}`,
        month.flightHours.toFixed(1),
        month.workDays.toString(),
        month.trips.toString(),
        formatCurrencyGerman(month.distanceDeduction),
        formatCurrencyGerman(month.mealAllowance),
        formatCurrencyGerman(month.employerReimbursement),
        formatCurrencyGerman(month.tips),
        formatCurrencyGerman(month.cleaningCosts)
      ]);
    }
    
    // Add totals row
    rows.push([
      'GESAMT',
      totalFlightHours.toFixed(1),
      totalWorkDays.toString(),
      taxCalculation.travelCosts.trips.toString(),
      formatCurrencyGerman(taxCalculation.travelCosts.total),
      formatCurrencyGerman(taxCalculation.mealAllowances.totalAllowances),
      formatCurrencyGerman(taxCalculation.mealAllowances.employerReimbursement),
      formatCurrencyGerman(taxCalculation.travelExpenses.total),
      formatCurrencyGerman(taxCalculation.cleaningCosts.total)
    ]);
    
    // Add Endabrechnung section
    rows.push([]);
    rows.push(['ENDABRECHNUNG - STEUERLICHE AUFSTELLUNG']);
    rows.push(['Kategorie', 'Details', 'Betrag (EUR)']);
    
    rows.push([
      'Reinigungskosten (Zeile 57)',
      `${taxCalculation.cleaningCosts.workDays} Arbeitstage × ${formatCurrencyGerman(taxCalculation.cleaningCosts.ratePerDay)} €`,
      formatCurrencyGerman(taxCalculation.cleaningCosts.total)
    ]);
    
    rows.push([
      'Trinkgeld (Zeile 71)',
      `${taxCalculation.travelExpenses.hotelNights} Hotelnächte × ${formatCurrencyGerman(taxCalculation.travelExpenses.tipRate)} €`,
      formatCurrencyGerman(taxCalculation.travelExpenses.total)
    ]);
    
    rows.push([
      'Fahrtkosten',
      `${taxCalculation.travelCosts.totalKm} km (${taxCalculation.travelCosts.trips} Fahrten × ${settings.distanceToWork} km)`,
      formatCurrencyGerman(taxCalculation.travelCosts.total)
    ]);
    
    // Add meal allowance breakdown
    for (const country of taxCalculation.mealAllowances.byCountry) {
      if (country.days8h > 0) {
        rows.push([
          `Verpflegung ${country.country} > 8h`,
          `${country.days8h} Tage × ${formatCurrencyGerman(country.rate8h)} €`,
          formatCurrencyGerman(country.total8h)
        ]);
      }
      if (country.days24h > 0) {
        rows.push([
          `Verpflegung ${country.country} 24h`,
          `${country.days24h} Tage × ${formatCurrencyGerman(country.rate24h)} €`,
          formatCurrencyGerman(country.total24h)
        ]);
      }
    }
    
    rows.push([
      'Verpflegung gesamt',
      '',
      formatCurrencyGerman(taxCalculation.mealAllowances.totalAllowances)
    ]);
    
    rows.push([
      'Verpflegung abzgl. AG-Erstattung',
      'Differenz',
      formatCurrencyGerman(-taxCalculation.mealAllowances.employerReimbursement)
    ]);
    
    rows.push([
      'Verpflegung abzugsfähig',
      '',
      formatCurrencyGerman(taxCalculation.mealAllowances.deductibleDifference)
    ]);
    
    rows.push([
      'GESAMTSUMME WERBUNGSKOSTEN',
      '',
      formatCurrencyGerman(taxCalculation.grandTotal)
    ]);
    
    // Convert to CSV string (semicolon-separated for German Excel)
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(';')).join('\n');
    
    // Add BOM for Excel UTF-8 compatibility
    return '\ufeff' + csv;
  };

  // Generate Arbeitstage TXT
  const generateArbeitstageeTXT = () => {
    const lines: string[] = [];
    const sep = '='.repeat(100);
    const sep2 = '-'.repeat(100);
    
    // Determine year(s) from data
    const years = new Set(flights.map(f => f.year));
    const yearStr = years.size === 1 ? Array.from(years)[0].toString() : 'Multi-Year';
    
    lines.push(sep);
    lines.push(`ARBEITSTAGE DETAILS - ${yearStr}`);
    lines.push(sep);
    lines.push('');
    
    // Column headers (fixed width)
    lines.push(
      'Datum'.padEnd(12) +
      'Code'.padEnd(6) +
      'Flug'.padEnd(10) +
      'Route'.padEnd(20) +
      'Zeit'.padEnd(17) +
      'Block'.padEnd(8) +
      'Land'.padEnd(22) +
      'Tagessatz'
    );
    lines.push(sep2);
    
    // Combine flights and non-flight days
    type WorkDay = (Flight | NonFlightDay) & { sortDate: Date };
    const allWorkDays: WorkDay[] = [
      ...flights.map(f => ({ ...f, sortDate: f.date })),
      ...nonFlightDays.map(d => ({ ...d, sortDate: d.date }))
    ];
    
    // Sort by date
    allWorkDays.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    
    // Track which dates we've shown allowances for
    const allowanceShownForDate = new Set<string>();
    
    // Track month changes for grouping
    let currentMonth = '';
    
    // Format each work day
    for (const day of allWorkDays) {
      const dateStr = formatDateStr(day.date);
      const dateGerman = formatDateGerman(day.date);
      const allowanceInfo = dailyAllowances?.get(dateStr);
      const isFirstOfDay = !allowanceShownForDate.has(dateStr);
      
      // Add month header if month changes
      const monthYear = `${day.month}/${day.year}`;
      if (monthYear !== currentMonth) {
        if (currentMonth !== '') {
          lines.push(''); // Empty line between months
        }
        currentMonth = monthYear;
      }
      
      if ('flightNumber' in day) {
        // It's a flight
        const flight = day as Flight;
        let country = getCountryName(flight.country);
        if (country.length > 20) country = country.substring(0, 17) + '...';
        
        // Show allowance only on first flight/item of the day
        let allowanceText = '-';
        let rateTypeText = '';
        if (isFirstOfDay && allowanceInfo && allowanceInfo.rate > 0) {
          allowanceText = formatCurrencyGerman(allowanceInfo.rate) + ' €';
          rateTypeText = allowanceInfo.rateType === '24h' ? ' (24h)' : ' (>8h)';
          allowanceShownForDate.add(dateStr);
        }
        
        const flightNum = flight.flightNumber + (flight.isContinuation ? ' ↪' : '');
        const route = `${flight.departure}-${flight.arrival}`;
        const timeRange = `${flight.departureTime}-${formatArrivalTime(flight)}`;
        
        lines.push(
          dateGerman.padEnd(12) +
          (flight.dutyCode || '').padEnd(6) +
          flightNum.padEnd(10) +
          route.padEnd(20) +
          timeRange.padEnd(17) +
          flight.blockTime.padEnd(8) +
          country.padEnd(22) +
          (allowanceText + rateTypeText).padStart(10)
        );
      } else {
        // It's a non-flight day
        const nfd = day as NonFlightDay;
        let country = nfd.country ? getCountryName(nfd.country) : 'Deutschland';
        if (country.length > 20) country = country.substring(0, 17) + '...';
        
        // Show allowance only on first item of the day
        let allowanceText = '-';
        let rateTypeText = '';
        if (isFirstOfDay && allowanceInfo && allowanceInfo.rate > 0) {
          allowanceText = formatCurrencyGerman(allowanceInfo.rate) + ' €';
          rateTypeText = allowanceInfo.rateType === '24h' ? ' (24h)' : ' (>8h)';
          allowanceShownForDate.add(dateStr);
        }
        
        let description = nfd.description;
        if (description.length > 18) description = description.substring(0, 15) + '...';
        
        lines.push(
          dateGerman.padEnd(12) +
          nfd.type.padEnd(6) +
          '-'.padEnd(10) +
          description.padEnd(20) +
          '-'.padEnd(17) +
          '-'.padEnd(8) +
          country.padEnd(22) +
          (allowanceText + rateTypeText).padStart(10)
        );
      }
    }
    
    lines.push(sep2);
    lines.push(`GESAMT: ${allWorkDays.length} Arbeitstage`);
    lines.push(`Exportiert am: ${formatDateGerman(new Date())}`);
    lines.push('');
    
    // Add Übersicht section
    lines.push(sep);
    lines.push('ÜBERSICHT / ZUSAMMENFASSUNG');
    lines.push(sep);
    lines.push('');
    
    // Monthly breakdown
    lines.push('Details pro Monat');
    lines.push(sep2);
    lines.push(
      'Monat'.padEnd(18) +
      'Flugst.'.padEnd(10) +
      'Arbeitst.'.padEnd(11) +
      'Fahrten'.padEnd(9) +
      'Entfernungsp.'.padEnd(16) +
      'Verpflegung'.padEnd(14) +
      'AG-Erstatt.'.padEnd(14) +
      'Trinkgeld'.padEnd(12) +
      'Reinigung'
    );
    lines.push(sep2);
    
    for (const month of monthlyBreakdown) {
      lines.push(
        `${month.monthName} ${month.year}`.padEnd(18) +
        month.flightHours.toFixed(1).padEnd(10) +
        month.workDays.toString().padEnd(11) +
        month.trips.toString().padEnd(9) +
        formatCurrencyGerman(month.distanceDeduction).padEnd(16) +
        formatCurrencyGerman(month.mealAllowance).padEnd(14) +
        formatCurrencyGerman(month.employerReimbursement).padEnd(14) +
        formatCurrencyGerman(month.tips).padEnd(12) +
        formatCurrencyGerman(month.cleaningCosts)
      );
    }
    
    lines.push(sep2);
    lines.push(
      'GESAMT'.padEnd(18) +
      totalFlightHours.toFixed(1).padEnd(10) +
      totalWorkDays.toString().padEnd(11) +
      taxCalculation.travelCosts.trips.toString().padEnd(9) +
      formatCurrencyGerman(taxCalculation.travelCosts.total).padEnd(16) +
      formatCurrencyGerman(taxCalculation.mealAllowances.totalAllowances).padEnd(14) +
      formatCurrencyGerman(taxCalculation.mealAllowances.employerReimbursement).padEnd(14) +
      formatCurrencyGerman(taxCalculation.travelExpenses.total).padEnd(12) +
      formatCurrencyGerman(taxCalculation.cleaningCosts.total)
    );
    lines.push('');
    
    // Endabrechnung section
    lines.push(sep);
    lines.push('Endabrechnung (Anlage N)');
    lines.push(sep);
    lines.push('');
    
    // Reinigungskosten
    lines.push('Reinigungskosten (Zeile 57)');
    lines.push(`  Arbeitstage: ${taxCalculation.cleaningCosts.workDays}`);
    lines.push(`  × Tagessatz: ${formatCurrencyGerman(taxCalculation.cleaningCosts.ratePerDay)} €`);
    lines.push(`  = Summe: ${formatCurrencyGerman(taxCalculation.cleaningCosts.total)} €`);
    lines.push('');
    
    // Trinkgeld
    lines.push('Reisenebenkosten / Trinkgeld (Zeile 71)');
    lines.push(`  Hotelnächte: ${taxCalculation.travelExpenses.hotelNights}`);
    lines.push(`  × Trinkgeld: ${formatCurrencyGerman(taxCalculation.travelExpenses.tipRate)} €`);
    lines.push(`  = Summe: ${formatCurrencyGerman(taxCalculation.travelExpenses.total)} €`);
    lines.push('');
    
    // Fahrtkosten
    lines.push('Fahrtkosten / Entfernungspauschale');
    lines.push(`  Fahrten × Entfernung: ${taxCalculation.travelCosts.trips} × ${settings.distanceToWork} km = ${taxCalculation.travelCosts.totalKm} km`);
    lines.push(`  Erste 20 km × ${formatCurrencyGerman(taxCalculation.travelCosts.rateFirst20km)} €: ${formatCurrencyGerman(taxCalculation.travelCosts.deductionFirst20km)} €`);
    if (taxCalculation.travelCosts.deductionAbove20km > 0) {
      lines.push(`  Ab km 21 × ${formatCurrencyGerman(taxCalculation.travelCosts.rateAbove20km)} €: ${formatCurrencyGerman(taxCalculation.travelCosts.deductionAbove20km)} €`);
    }
    lines.push(`  Summe Fahrtkosten: ${formatCurrencyGerman(taxCalculation.travelCosts.total)} €`);
    lines.push('');
    
    // Verpflegung
    lines.push('Verpflegungsmehraufwendungen');
    for (const country of taxCalculation.mealAllowances.byCountry) {
      if (country.days8h > 0) {
        lines.push(`  ${country.country} > 8h: ${country.days8h} Tage × ${formatCurrencyGerman(country.rate8h)} € = ${formatCurrencyGerman(country.total8h)} €`);
      }
      if (country.days24h > 0) {
        lines.push(`  ${country.country} 24h: ${country.days24h} Tage × ${formatCurrencyGerman(country.rate24h)} € = ${formatCurrencyGerman(country.total24h)} €`);
      }
    }
    lines.push(`  Summe Verpflegung: ${formatCurrencyGerman(taxCalculation.mealAllowances.totalAllowances)} €`);
    lines.push(`  - Arbeitgeber-Erstattung (steuerfrei): -${formatCurrencyGerman(taxCalculation.mealAllowances.employerReimbursement)} €`);
    lines.push(`  = Abzugsfähige Differenz: ${formatCurrencyGerman(taxCalculation.mealAllowances.deductibleDifference)} €`);
    lines.push('');
    
    // Grand Total
    lines.push(sep);
    lines.push('GESAMTSUMME WERBUNGSKOSTEN');
    lines.push(sep);
    lines.push(`  Reinigungskosten: ${formatCurrencyGerman(taxCalculation.cleaningCosts.total)} €`);
    lines.push(`  Trinkgeld: ${formatCurrencyGerman(taxCalculation.travelExpenses.total)} €`);
    lines.push(`  Fahrtkosten: ${formatCurrencyGerman(taxCalculation.travelCosts.total)} €`);
    lines.push(`  Verpflegung (Differenz): ${formatCurrencyGerman(taxCalculation.mealAllowances.deductibleDifference)} €`);
    lines.push(sep2);
    lines.push(`  GESAMT: ${formatCurrencyGerman(taxCalculation.grandTotal)} €`);
    lines.push('');
    
    return lines.join('\n');
  };

  // Download file
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle exports
  const handleCSVExport = () => {
    const csv = generateArbeitstageCSV();
    const year = flights[0]?.year || new Date().getFullYear();
    downloadFile(csv, `arbeitstage-${year}.csv`, 'text/csv;charset=utf-8');
    setIsOpen(false);
  };

  const handleTXTExport = () => {
    const txt = generateArbeitstageeTXT();
    const year = flights[0]?.year || new Date().getFullYear();
    downloadFile(txt, `arbeitstage-${year}.txt`, 'text/plain;charset=utf-8');
    setIsOpen(false);
  };

  const handlePDFExport = async () => {
    console.log('handlePDFExport clicked');
    try {
      await generateFlightPDF({
        flights,
        nonFlightDays,
        monthlyBreakdown,
        taxCalculation,
        totalFlightHours,
        totalWorkDays,
        personalInfo: state.personalInfo,
        settings
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF Export fehlgeschlagen: ' + error);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => hasData && setIsOpen(!isOpen)}
        disabled={!hasData}
        className={`flex w-full items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all justify-between ${
          hasData
            ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
            : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
        }`}
        title={!hasData ? 'Keine Daten zum Exportieren' : 'Arbeitstage exportieren'}
      >
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Export</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && hasData && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden z-50">
          <button
            onClick={handleCSVExport}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV herunterladen
          </button>
          <button
            onClick={handleTXTExport}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            TXT herunterladen
          </button>
          <button
            onClick={handlePDFExport}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            PDF herunterladen
          </button>
        </div>
      )}
    </div>
  );
}
