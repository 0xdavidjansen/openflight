import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Flight, NonFlightDay, DailyAllowanceInfo, AllowanceYear, PersonalInfo } from '../types';
import { DUTY_CODES } from '../constants';
import { DEFAULT_ALLOWANCE_YEAR } from '../utils/allowances';
import { getCountryName } from '../utils/airports';
import { getCountryAllowance } from '../utils/allowances';
import { formatCurrency, formatDateStr, isSimulatorFlight, getBriefingTimeForRole } from '../utils/calculations';
import { Clock } from 'lucide-react';

interface VirtualFlightTableProps {
  flights: Flight[];
  nonFlightDays: NonFlightDay[];
  dailyAllowances?: Map<string, DailyAllowanceInfo>;
  personalInfo?: PersonalInfo | null;
}

// Combined row type for virtualization
type TableRow =
  | { type: 'flight'; data: Flight; isFirstOfDay: boolean }
  | { type: 'nonFlightDay'; data: NonFlightDay };

export function VirtualFlightTable({ flights, nonFlightDays, dailyAllowances, personalInfo }: VirtualFlightTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Identify first flights per day
  const firstFlightIds = useMemo(() => {
    const firstIds = new Set<string>();
    const datesSeen = new Set<string>();
    
    // Sort flights by date and time to determine true first flight
    const sortedFlights = [...flights].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      // Parse times to ensure proper sorting
      const parseTime = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };
      return parseTime(a.departureTime) - parseTime(b.departureTime);
    });
    
    for (const flight of sortedFlights) {
      const dateStr = formatDateStr(flight.date);
      if (!datesSeen.has(dateStr)) {
        datesSeen.add(dateStr);
        firstIds.add(flight.id);
      }
    }
    
    return firstIds;
  }, [flights]);

  // Combine flights and non-flight days into rows, memoized to prevent recreation
  const rows = useMemo(() => {
    const combined: TableRow[] = [
      ...flights.map((f) => ({ type: 'flight' as const, data: f, isFirstOfDay: firstFlightIds.has(f.id) })),
      ...nonFlightDays.map((d) => ({ type: 'nonFlightDay' as const, data: d })),
    ];
    // Sort by date
    combined.sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
    return combined;
  }, [flights, nonFlightDays, firstFlightIds]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44, // Estimated row height in pixels
    overscan: 10, // Number of items to render outside viewport
  });

  // Don't virtualize if few rows (overhead not worth it)
  if (rows.length < 50) {
    return (
      <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
          <TableHeader />
          <tbody>
            {rows.map((row) =>
              row.type === 'flight' ? (
                <FlightRow key={row.data.id} flight={row.data} dailyAllowances={dailyAllowances} isFirstOfDay={row.isFirstOfDay} personalInfo={personalInfo} />
              ) : (
                <NonFlightDayRow key={row.data.id} day={row.data} dailyAllowances={dailyAllowances} flights={flights} />
              )
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <TableHeader />
      </table>
      <div
        ref={parentRef}
        className="max-h-[600px] overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
        <table className="w-full text-sm border-collapse">
            <tbody>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.type === 'flight' ? (
                      <FlightRowContent flight={row.data} dailyAllowances={dailyAllowances} isFirstOfDay={row.isFirstOfDay} personalInfo={personalInfo} />
                    ) : (
                      <NonFlightDayRowContent day={row.data} dailyAllowances={dailyAllowances} flights={flights} />
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <thead>
      <tr className="border-b border-slate-200 dark:border-slate-700">
        <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-300">
          Datum
        </th>
        <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Briefing</span>
          </div>
        </th>
        <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-300">
          Flug/Status
        </th>
        <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-300">
          Route
        </th>
        <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-300">
          Zeit
        </th>
        <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-300">
          Block
        </th>
        <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-300">
          Land
        </th>
        <th className="text-right py-2 px-2 font-medium text-slate-600 dark:text-slate-300">
          Tagessatz
        </th>
      </tr>
    </thead>
  );
}

function FlightRow({ flight, dailyAllowances, isFirstOfDay, personalInfo }: { flight: Flight; dailyAllowances?: Map<string, DailyAllowanceInfo>; isFirstOfDay: boolean; personalInfo?: PersonalInfo | null }) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
      <FlightRowContent flight={flight} dailyAllowances={dailyAllowances} isFirstOfDay={isFirstOfDay} personalInfo={personalInfo} />
    </tr>
  );
}

function FlightRowContent({ flight, dailyAllowances, isFirstOfDay, personalInfo }: { flight: Flight; dailyAllowances?: Map<string, DailyAllowanceInfo>; isFirstOfDay: boolean; personalInfo?: PersonalInfo | null }) {
  // Use arrival country for display
  const countryCode = flight.arrivalCountry || 'XX';

  // Check if this is a simulator flight
  const isSimulator = isSimulatorFlight(flight);

  // Look up the daily allowance for this flight date
  const dateStr = formatDateStr(flight.date);
  const dailyAllowance = dailyAllowances?.get(dateStr);

  // Calculate briefing time for this flight
  const briefingMinutes = getBriefingTimeForRole(
    personalInfo?.role,
    personalInfo?.aircraftType,
    flight.arrival,
    flight
  );

  // Format briefing time (e.g., "1h 50min" or "60min")
  const formatBriefingTime = (minutes: number): string => {
    if (minutes === 0) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  };

  // Determine briefing badge color based on duration
  const getBriefingColor = (minutes: number) => {
    if (minutes === 0) return '';
    if (minutes >= 110) {
      // Longhaul
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    } else if (minutes >= 80) {
      // Shorthaul
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    } else {
      // Simulator or other
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
    }
  };

  return (
    <>
      <td className="py-2 px-2">
        {flight.date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
        })}
      </td>
      <td className="py-2 px-2">
        {isFirstOfDay && briefingMinutes > 0 ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getBriefingColor(briefingMinutes)}`}>
            <Clock className="w-3 h-3" />
            {formatBriefingTime(briefingMinutes)}
          </span>
        ) : null}
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-2">
          <span className="font-mono">{flight.flightNumber}</span>
          {isSimulator && (
            <span
              className="px-1.5 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
              title="Simulator-Tag (LH9xxx, FRA→FRA oder MUC→MUC, 4:00 Block)"
            >
              Simulator
            </span>
          )}
          {flight.isContinuation && (
            <span
              className="px-1.5 py-0.5 text-xs rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              title={`Fortsetzung von ${flight.continuationOf || 'vorherigem Monat'} - Flug begann am Tag ${flight.originalFlightNumber?.split('/')[1] || '?'} des Vormonats`}
            >
              ↪ Fortsetzung
            </span>
          )}
          {flight.dutyCode && (
            <span
              className={`px-1.5 py-0.5 text-xs rounded ${
                flight.dutyCode === 'A'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : flight.dutyCode === 'E'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
              }`}
              title={
                DUTY_CODES[flight.dutyCode as keyof typeof DUTY_CODES] ||
                flight.dutyCode
              }
            >
              {flight.dutyCode}
            </span>
          )}
        </div>
      </td>
      <td className="py-2 px-2">
        {isSimulator ? (
          <span className="text-slate-500 dark:text-slate-400 italic">Simulator</span>
        ) : (
          <span className="font-mono">{flight.departure} → {flight.arrival}</span>
        )}
      </td>
      <td className="py-2 px-2">
        {flight.departureTime} - {flight.arrivalTime}
      </td>
      <td className="py-2 px-2 font-mono">{flight.blockTime}</td>
      <td className="py-2 px-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
            countryCode === 'DE'
              ? 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}
        >
          {getCountryName(countryCode)}
        </span>
      </td>
      <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
        {isFirstOfDay ? (
          // Show allowance only on first flight of the day
          dailyAllowance ? (
            <span>
              {formatCurrency(dailyAllowance.rate)}
              <span className="text-xs text-slate-400 ml-1">({dailyAllowance.rateType})</span>
            </span>
          ) : (
            <span className="text-slate-400" title="Keine Verpflegungspauschale (Inlandsflug ohne Übernachtung)">-</span>
          )
        ) : (
          // Show blank for subsequent flights on same day with tooltip
          <span
            className="text-slate-400"
            title="Tagessatz wird beim ersten Flug des Tages angezeigt"
          >
            {/* Blank - allowance shown on first flight */}
          </span>
        )}
      </td>
    </>
  );
}

function NonFlightDayRow({ day, dailyAllowances, flights }: { day: NonFlightDay; dailyAllowances?: Map<string, DailyAllowanceInfo>; flights: Flight[] }) {
  return (
    <tr
      className={`border-b border-slate-100 dark:border-slate-700/50 ${
        day.type === 'ME'
          ? 'bg-purple-50/50 dark:bg-purple-900/10'
          : day.type === 'FL'
          ? 'bg-amber-50/50 dark:bg-amber-900/10'
          : 'bg-green-50/50 dark:bg-green-900/10'
      }`}
    >
      <NonFlightDayRowContent day={day} dailyAllowances={dailyAllowances} flights={flights} />
    </tr>
  );
}

function NonFlightDayRowContent({ day, dailyAllowances, flights }: { day: NonFlightDay; dailyAllowances?: Map<string, DailyAllowanceInfo>; flights: Flight[] }) {
  const year = (day.year || DEFAULT_ALLOWANCE_YEAR) as AllowanceYear;

  // Look up the daily allowance for this day
  const dateStr = formatDateStr(day.date);
  const dailyAllowance = dailyAllowances?.get(dateStr);

  // Check if this FL day is after an E-flag (return) flight
  const isAfterEFlagFlight = () => {
    if (day.type !== 'FL') return false;

    // Sort flights by date and time
    const sortedFlights = [...flights].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      const parseTime = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };
      return parseTime(a.departureTime) - parseTime(b.departureTime);
    });

    // Find the most recent flight before this FL day
    const dayTime = day.date.getTime();
    const prevFlights = sortedFlights.filter(f => f.date.getTime() < dayTime);

    if (prevFlights.length === 0) return false;

    const lastFlight = prevFlights[prevFlights.length - 1];
    return lastFlight.dutyCode === 'E';
  };

  return (
    <>
      <td className="py-2 px-2">
        {day.date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
        })}
      </td>
      <td className="py-2 px-2">
        <span
          className={`px-1.5 py-0.5 text-xs rounded font-medium ${
            day.type === 'ME'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
              : day.type === 'FL'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}
        >
          {day.type}
        </span>
      </td>
      <td className="py-2 px-2"></td>
      <td
        className="py-2 px-2 text-slate-600 dark:text-slate-400"
        colSpan={3}
      >
        {day.type === 'FL' && dailyAllowance ? (
          dailyAllowance.isReturnToHomeBase ? (
            'Ankunftstag'
          ) : dailyAllowance.isDepartureFromHomeBase ? (
            'Abreisetag'
          ) : isAfterEFlagFlight() ? (
            'Ankunftstag'
          ) : (
            'Layover'
          )
        ) : (
          day.description
        )}
      </td>
      <td className="py-2 px-2">
        {day.country && (
          <span className="text-xs text-slate-500">{getCountryName(day.country)}</span>
        )}
      </td>
      <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
        {dailyAllowance ? (
          <span>
            {formatCurrency(dailyAllowance.rate)}
            {day.type !== 'ME' && (
              <span className="text-xs text-slate-400 ml-1">({dailyAllowance.rateType})</span>
            )}
          </span>
        ) : day.country ? (
          formatCurrency(getCountryAllowance(day.country, year).rate24h)
        ) : (
          // Only show dash - no fallback allowance
          // Only SB and EM get allowances (calculated in dailyAllowances map)
          // RE, DP, DT, SI, TK, ME without allowance show dash
          '-'
        )}
      </td>
    </>
  );
}
