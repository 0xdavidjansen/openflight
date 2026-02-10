import type { Flight, NonFlightDay, MonthlyBreakdown, TaxCalculation } from '../types';
import { formatDateStr, isSimulatorFlight } from './calculations';
import { getCountryName } from './airports';

// Lazy load pdfMake to avoid initialization errors
let pdfMake: any;
let pdfFonts: any;

const initPdfMake = async () => {
  console.log('Initializing pdfMake...');
  try {
    if (!pdfMake) {
      console.log('Loading pdfmake library...');
      const pdfMakeModule = await import('pdfmake/build/pdfmake');
      pdfMake = pdfMakeModule.default || pdfMakeModule;
      console.log('pdfmake loaded:', typeof pdfMake);
      
      const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
      pdfFonts = pdfFontsModule.default || pdfFontsModule;
      console.log('vfs_fonts loaded:', typeof pdfFonts);
      
      if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
        pdfMake.vfs = pdfFonts.pdfMake.vfs;
        console.log('VFS fonts set successfully');
      } else {
        console.error('VFS fonts not found in module');
      }
    }
    console.log('pdfMake ready');
    return pdfMake;
  } catch (error) {
    console.error('Error initializing pdfMake:', error);
    throw error;
  }
};

interface PDFExportData {
  flights: Flight[];
  nonFlightDays: NonFlightDay[];
  monthlyBreakdown: MonthlyBreakdown[];
  taxCalculation: TaxCalculation;
  totalFlightHours: number;
  totalWorkDays: number;
  personalInfo?: {
    name?: string;
    personnelNumber?: string;
    costCenter?: string;
  } | null;
  settings: {
    distanceToWork: number;
  };
}

// Helper: Format currency with German comma
const formatCurrencyGerman = (value: number): string => {
  return value.toFixed(2).replace('.', ',') + ' €';
};

// Helper: Format date as DD.MM.YYYY
const formatDateGerman = (date: Date): string => {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
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

// Helper: Get route display (Simulator or normal)
const getRouteDisplay = (flight: Flight): string => {
  if (isSimulatorFlight(flight)) {
    return 'Simulator';
  }
  return `${flight.departure} - ${flight.arrival}`;
};

export async function generateFlightPDF(data: PDFExportData): Promise<void> {
  console.log('generateFlightPDF called');
  try {
    const { flights, nonFlightDays, monthlyBreakdown, taxCalculation, totalFlightHours, totalWorkDays, personalInfo, settings } = data;
    console.log('Data extracted:', { flights: flights?.length, monthlyBreakdown: monthlyBreakdown?.length });
    
    // Initialize pdfMake lazily
    const pdfMakeLib = await initPdfMake();
    console.log('pdfMakeLib type:', typeof pdfMakeLib);
    console.log('pdfMakeLib.createPdf:', typeof pdfMakeLib?.createPdf);

  // Get year from flights
  const year = flights[0]?.year || new Date().getFullYear();
  const userName = personalInfo?.name || 'Unbekannt';
  const safeUserName = userName.replace(/[^a-zA-Z0-9\-\_]/g, '-');

  // Combine and sort work days
  type WorkDay = (Flight | NonFlightDay) & { sortDate: Date };
  const allWorkDays: WorkDay[] = [
    ...flights.map(f => ({ ...f, sortDate: f.date })),
    ...nonFlightDays.map(d => ({ ...d, sortDate: d.date }))
  ];
  allWorkDays.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

  // Calculate unique dates for allowances
  const allowanceShownForDate = new Set<string>();

  // Build Arbeitstage table body
  const arbeitstageBody: any[] = [
    [
      { text: 'Datum', style: 'tableHeader' },
      { text: 'Code', style: 'tableHeader' },
      { text: 'Flug', style: 'tableHeader' },
      { text: 'Route', style: 'tableHeader' },
      { text: 'Abflug', style: 'tableHeader' },
      { text: 'Ankunft', style: 'tableHeader' },
      { text: 'Block', style: 'tableHeader' },
      { text: 'Land', style: 'tableHeader' }
    ]
  ];

  let currentMonth = '';

  for (const day of allWorkDays) {
    const dateStr = formatDateStr(day.date);
    const dateGerman = formatDateGerman(day.date);
    const isFirstOfDay = !allowanceShownForDate.has(dateStr);

    // Add month header row
    const monthYear = `${day.month}/${day.year}`;
    if (monthYear !== currentMonth) {
      if (currentMonth !== '') {
        // Add spacing row
        arbeitstageBody.push([{ text: '', colSpan: 8, border: [false, false, false, false] }, {}, {}, {}, {}, {}, {}, {}]);
      }
      currentMonth = monthYear;
    }

    // Alternate row colors
    const fillColor = arbeitstageBody.length % 2 === 0 ? '#F9FAFB' : null;

    if ('flightNumber' in day) {
      const flight = day as Flight;
      const country = getCountryName(flight.country);

      arbeitstageBody.push([
        { text: dateGerman, fillColor },
        { text: flight.dutyCode || '-', fillColor },
        { text: flight.flightNumber + (flight.isContinuation ? ' ↪' : ''), fillColor },
        { text: getRouteDisplay(flight), fillColor },
        { text: flight.departureTime, fillColor },
        { text: formatArrivalTime(flight), fillColor },
        { text: flight.blockTime, fillColor },
        { text: country, fillColor }
      ]);

      if (isFirstOfDay) {
        allowanceShownForDate.add(dateStr);
      }
    } else {
      const nfd = day as NonFlightDay;
      const country = nfd.country ? getCountryName(nfd.country) : 'Deutschland';

      arbeitstageBody.push([
        { text: dateGerman, fillColor },
        { text: nfd.type, fillColor },
        { text: '-', fillColor },
        { text: nfd.description, fillColor },
        { text: '-', fillColor },
        { text: '-', fillColor },
        { text: '-', fillColor },
        { text: country, fillColor }
      ]);

      if (isFirstOfDay) {
        allowanceShownForDate.add(dateStr);
      }
    }
  }

  // Build Monthly Summary table
  const monthlyBody: any[] = [
    [
      { text: 'Monat', style: 'tableHeader' },
      { text: 'Flugstunden', style: 'tableHeader', alignment: 'right' },
      { text: 'Arbeitstage', style: 'tableHeader', alignment: 'right' },
      { text: 'Fahrten', style: 'tableHeader', alignment: 'right' },
      { text: 'Entfernungsp.', style: 'tableHeader', alignment: 'right' },
      { text: 'Verpflegung', style: 'tableHeader', alignment: 'right' },
      { text: 'Trinkgeld', style: 'tableHeader', alignment: 'right' },
      { text: 'Reinigung', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  for (let i = 0; i < monthlyBreakdown.length; i++) {
    const month = monthlyBreakdown[i];
    const fillColor = i % 2 === 0 ? '#F9FAFB' : null;

    monthlyBody.push([
      { text: `${month.monthName} ${month.year}`, fillColor },
      { text: month.flightHours.toFixed(1) + 'h', fillColor, alignment: 'right' },
      { text: month.workDays.toString(), fillColor, alignment: 'right' },
      { text: month.trips.toString(), fillColor, alignment: 'right' },
      { text: formatCurrencyGerman(month.distanceDeduction), fillColor, alignment: 'right' },
      { text: formatCurrencyGerman(month.mealAllowance), fillColor, alignment: 'right' },
      { text: formatCurrencyGerman(month.tips), fillColor, alignment: 'right' },
      { text: formatCurrencyGerman(month.cleaningCosts), fillColor, alignment: 'right' }
    ]);
  }

  // Totals row
  monthlyBody.push([
    { text: 'GESAMT', style: 'tableHeader' },
    { text: totalFlightHours.toFixed(1) + 'h', style: 'tableHeader', alignment: 'right' },
    { text: totalWorkDays.toString(), style: 'tableHeader', alignment: 'right' },
    { text: taxCalculation.travelCosts.trips.toString(), style: 'tableHeader', alignment: 'right' },
    { text: formatCurrencyGerman(taxCalculation.travelCosts.total), style: 'tableHeader', alignment: 'right' },
    { text: formatCurrencyGerman(taxCalculation.mealAllowances.totalAllowances), style: 'tableHeader', alignment: 'right' },
    { text: formatCurrencyGerman(taxCalculation.travelExpenses.total), style: 'tableHeader', alignment: 'right' },
    { text: formatCurrencyGerman(taxCalculation.cleaningCosts.total), style: 'tableHeader', alignment: 'right' }
  ]);

  // Build Tax Calculation sections
  const taxSections: any[] = [];

  // Cleaning Costs
  taxSections.push(
    {
      columns: [
        { width: '60%', text: 'Reinigungskosten (Zeile 57)', style: 'taxLabel' },
        { width: '40%', text: formatCurrencyGerman(taxCalculation.cleaningCosts.total), style: 'taxValue' }
      ],
      margin: [0, 5, 0, 2]
    },
    {
      text: `${taxCalculation.cleaningCosts.workDays} Arbeitstage × ${formatCurrencyGerman(taxCalculation.cleaningCosts.ratePerDay)}`,
      style: 'taxDetail',
      margin: [15, 0, 0, 10]
    }
  );

  // Tips
  taxSections.push(
    {
      columns: [
        { width: '60%', text: 'Reisenebenkosten / Trinkgeld (Zeile 71)', style: 'taxLabel' },
        { width: '40%', text: formatCurrencyGerman(taxCalculation.travelExpenses.total), style: 'taxValue' }
      ],
      margin: [0, 5, 0, 2]
    },
    {
      text: `${taxCalculation.travelExpenses.hotelNights} Hotelnächte × ${formatCurrencyGerman(taxCalculation.travelExpenses.tipRate)}`,
      style: 'taxDetail',
      margin: [15, 0, 0, 10]
    }
  );

  // Travel Costs
  taxSections.push(
    {
      columns: [
        { width: '60%', text: 'Fahrtkosten / Entfernungspauschale', style: 'taxLabel' },
        { width: '40%', text: formatCurrencyGerman(taxCalculation.travelCosts.total), style: 'taxValue' }
      ],
      margin: [0, 5, 0, 2]
    },
    {
      text: `${taxCalculation.travelCosts.totalKm} km (${taxCalculation.travelCosts.trips} Fahrten × ${settings.distanceToWork} km)`,
      style: 'taxDetail',
      margin: [15, 0, 0, 2]
    },
    {
      text: `Erste 20 km × ${taxCalculation.travelCosts.rateFirst20km.toFixed(2).replace('.', ',')} € = ${formatCurrencyGerman(taxCalculation.travelCosts.deductionFirst20km)}`,
      style: 'taxDetail',
      margin: [15, 0, 0, 0]
    }
  );

  if (taxCalculation.travelCosts.deductionAbove20km > 0) {
    taxSections.push({
      text: `Ab km 21 × ${taxCalculation.travelCosts.rateAbove20km.toFixed(2).replace('.', ',')} € = ${formatCurrencyGerman(taxCalculation.travelCosts.deductionAbove20km)}`,
      style: 'taxDetail',
      margin: [15, 0, 0, 10]
    });
  } else {
    taxSections.push({ text: '', margin: [0, 0, 0, 8] });
  }

  // Meal Allowances
  taxSections.push(
    {
      columns: [
        { width: '60%', text: 'Verpflegungsmehraufwendungen', style: 'taxLabel' },
        { width: '40%', text: formatCurrencyGerman(taxCalculation.mealAllowances.totalAllowances), style: 'taxValue' }
      ],
      margin: [0, 5, 0, 2]
    }
  );

  if (taxCalculation.mealAllowances.domestic8h.days > 0) {
    taxSections.push({
      text: `Inland > 8h: ${taxCalculation.mealAllowances.domestic8h.days} Tage × ${formatCurrencyGerman(taxCalculation.mealAllowances.domestic8h.rate)}`,
      style: 'taxDetail',
      margin: [15, 0, 0, 0]
    });
  }

  if (taxCalculation.mealAllowances.domestic24h.days > 0) {
    taxSections.push({
      text: `Inland 24h: ${taxCalculation.mealAllowances.domestic24h.days} Tage × ${formatCurrencyGerman(taxCalculation.mealAllowances.domestic24h.rate)}`,
      style: 'taxDetail',
      margin: [15, 0, 0, 0]
    });
  }

  for (const foreign of taxCalculation.mealAllowances.foreign) {
    taxSections.push({
      text: `${foreign.country}: ${foreign.days} Tage`,
      style: 'taxDetail',
      margin: [15, 0, 0, 0]
    });
  }

  taxSections.push(
    {
      text: `- AG-Erstattung: ${formatCurrencyGerman(taxCalculation.mealAllowances.employerReimbursement)}`,
      style: 'taxDetailNegative',
      margin: [15, 5, 0, 0]
    },
    {
      columns: [
        { width: '60%', text: 'Abzugsfähige Differenz:', style: 'taxSubTotal', margin: [15, 5, 0, 10] },
        { width: '40%', text: formatCurrencyGerman(taxCalculation.mealAllowances.deductibleDifference), style: 'taxSubTotal', alignment: 'right' }
      ]
    }
  );

  // Define the document
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: {
      fontSize: 10
    },
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        color: '#1E40AF',
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
        color: '#6B7280',
        margin: [0, 0, 0, 20]
      },
      sectionHeader: {
        fontSize: 16,
        bold: true,
        color: '#1E40AF',
        margin: [0, 20, 0, 10]
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: '#FFFFFF',
        fillColor: '#2563EB',
        alignment: 'left'
      },
      taxLabel: {
        fontSize: 11,
        bold: true
      },
      taxValue: {
        fontSize: 11,
        bold: true,
        alignment: 'right'
      },
      taxDetail: {
        fontSize: 9,
        color: '#6B7280'
      },
      taxDetailNegative: {
        fontSize: 9,
        color: '#DC2626'
      },
      taxSubTotal: {
        fontSize: 10,
        bold: true
      },
      grandTotal: {
        fontSize: 14,
        bold: true,
        color: '#1E40AF'
      },
      footer: {
        fontSize: 8,
        color: '#9CA3AF',
        alignment: 'center'
      }
    },
    header: {
      text: `Exportiert am: ${formatDateGerman(new Date())}`,
      alignment: 'right',
      margin: [40, 20, 40, 0],
      fontSize: 8,
      color: '#9CA3AF'
    },
    footer: (currentPage: number, pageCount: number) => ({
      text: `Seite ${currentPage} von ${pageCount}`,
      alignment: 'center',
      margin: [0, 20, 0, 0],
      fontSize: 8,
      color: '#9CA3AF'
    }),
    content: [
      // Title Page
      {
        text: 'Flugdienst Übersicht',
        style: 'header'
      },
      {
        text: `Jahr ${year}`,
        style: 'subheader'
      },
      {
        text: [
          { text: 'Name: ', bold: true },
          personalInfo?.name || 'Unbekannt',
          '\n',
          { text: 'Personal-Nr.: ', bold: true },
          personalInfo?.personnelNumber || '-',
          '\n',
          { text: 'Kostenstelle: ', bold: true },
          personalInfo?.costCenter || '-'
        ],
        margin: [0, 0, 0, 30]
      },

      // Arbeitstage Section
      {
        text: 'Arbeitstage Details',
        style: 'sectionHeader',
        pageBreak: 'before'
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', '*'],
          body: arbeitstageBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number, _node: any) => (i === 0 || i === 1) ? '#2563EB' : '#E5E7EB',
          vLineColor: () => '#E5E7EB',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3
        }
      },

      // Monthly Summary Section
      {
        text: 'Details pro Monat',
        style: 'sectionHeader',
        pageBreak: 'before'
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: monthlyBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#2563EB' : '#E5E7EB',
          vLineColor: () => '#E5E7EB',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4
        }
      },

      // Tax Calculation Section
      {
        text: 'Endabrechnung (Anlage N)',
        style: 'sectionHeader',
        pageBreak: 'before'
      },
      ...taxSections,

      // Grand Total
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 5,
            x2: 515,
            y2: 5,
            lineWidth: 2,
            lineColor: '#1E40AF'
          }
        ],
        margin: [0, 20, 0, 10]
      },
      {
        columns: [
          { width: '60%', text: 'GESAMTSUMME WERBUNGSKOSTEN', style: 'grandTotal' },
          { width: '40%', text: formatCurrencyGerman(taxCalculation.grandTotal), style: 'grandTotal', alignment: 'right' }
        ],
        margin: [0, 0, 0, 30]
      },
      {
        text: 'Hinweis: Diese Berechnung dient als Orientierung für Ihre Steuererklärung. Bitte prüfen Sie alle Werte und passen Sie sie gegebenenfalls an. Die angegebenen Zeilennummern beziehen sich auf die Anlage N.',
        style: 'footer',
        italics: true
      }
    ]
  };

  // Generate PDF with error handling
  try {
    console.log('Starting PDF generation...');
    console.log('User:', userName, 'Year:', year);
    console.log('Flights count:', flights.length);
    console.log('Monthly breakdown:', monthlyBreakdown.length, 'months');

    const pdfDocGenerator = pdfMakeLib.createPdf(docDefinition);
    pdfDocGenerator.download(`steuer-${safeUserName}-${year}.pdf`);
    console.log('PDF download triggered successfully');
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Fehler beim Erstellen der PDF. Bitte versuchen Sie es erneut.');
  }
  } catch (error) {
    console.error('Error in generateFlightPDF:', error);
    alert('PDF Export fehlgeschlagen: ' + error);
  }
}
