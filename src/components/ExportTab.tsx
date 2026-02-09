import { useApp } from '../hooks';
import { Download, Calendar } from 'lucide-react';
import { formatDateStr } from '../utils/calculations';
import { getCountryName } from '../utils/airports';
import type { Flight, NonFlightDay } from '../types';

export function ExportTab() {
  const { state, dailyAllowances } = useApp();
  const { flights, nonFlightDays } = state;

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
  const handleArbeitstageCSVExport = () => {
    const csv = generateArbeitstageCSV();
    const year = flights[0]?.year || new Date().getFullYear();
    downloadFile(csv, `arbeitstage-${year}.csv`, 'text/csv;charset=utf-8');
  };

  const handleArbeitstageeTXTExport = () => {
    const txt = generateArbeitstageeTXT();
    const year = flights[0]?.year || new Date().getFullYear();
    downloadFile(txt, `arbeitstage-${year}.txt`, 'text/plain;charset=utf-8');
  };

  const hasData = flights.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          Export
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          Exportieren Sie Ihre Daten für die Steuererklärung oder zur Archivierung.
        </p>
      </div>

      {!hasData ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <Download className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">
            Keine Daten zum Exportieren
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Laden Sie zuerst Ihre Flugdokumente hoch.
          </p>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          {/* Arbeitstage Export */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white text-lg">
                  Arbeitstage Details
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Detaillierte Tagesliste
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Exportiert alle Arbeitstage mit Flügen, Layovers und Bodendiensten 
              in gut formatierter CSV oder TXT Datei.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleArbeitstageCSVExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                CSV herunterladen
              </button>
              <button
                onClick={handleArbeitstageeTXTExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                TXT herunterladen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
