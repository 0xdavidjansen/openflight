import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../hooks';
import { ChevronDown, ChevronRight, Filter, Plane, Calendar, Clock, Euro } from 'lucide-react';
import { MONTH_NAMES } from '../constants';
import { getCountryName } from '../utils/airports';
import { VirtualFlightTable } from './VirtualFlightTable';
import { formatDateStr } from '../utils/calculations';

interface MonthGroup {
  key: string;
  month: number;
  year: number;
  monthName: string;
  flightCount: number;
  totalHours: number;
  totalAllowance: number;
}

export function FlightsTab() {
  const { state, dailyAllowances } = useApp();
  const { flights, nonFlightDays } = state;
  const [countryFilter, setCountryFilter] = useState<string>('all');

  // Get unique countries from both departure and arrival
  const countries = useMemo(() => {
    const countrySet = new Set<string>();
    flights.forEach((f) => {
      // Add arrival country
      if (f.country && f.country !== 'XX') {
        countrySet.add(f.country);
      }
      // Add departure country
      if (f.departureCountry && f.departureCountry !== 'XX') {
        countrySet.add(f.departureCountry);
      }
    });
    return Array.from(countrySet).sort();
  }, [flights]);

  // Group flights by month
  const monthGroups = useMemo(() => {
    const groups: MonthGroup[] = [];
    const groupMap: Record<string, MonthGroup> = {};

    for (const flight of flights) {
      const key = `${flight.year}-${String(flight.month).padStart(2, '0')}`;
      if (!groupMap[key]) {
        groupMap[key] = {
          key,
          month: flight.month,
          year: flight.year,
          monthName: MONTH_NAMES[flight.month - 1],
          flightCount: 0,
          totalHours: 0,
          totalAllowance: 0,
        };
        groups.push(groupMap[key]);
      }
      groupMap[key].flightCount++;
      const [h, m] = (flight.blockTime || '0:00').split(':').map(Number);
      groupMap[key].totalHours += h + m / 60;
    }

    // Calculate total allowance for each month
    for (const group of groups) {
      const monthFlights = flights.filter((f) => f.month === group.month && f.year === group.year);
      const monthNonFlightDays = nonFlightDays.filter((d) => d.month === group.month && d.year === group.year);
      
      // Get unique dates in this month
      const uniqueDates = new Set<string>();
      monthFlights.forEach((f) => uniqueDates.add(formatDateStr(f.date)));
      monthNonFlightDays.forEach((d) => uniqueDates.add(formatDateStr(d.date)));
      
      // Sum up allowances for all unique dates
      let monthTotal = 0;
      uniqueDates.forEach((dateStr) => {
        const allowance = dailyAllowances.get(dateStr);
        if (allowance) {
          monthTotal += allowance.rate;
        }
      });
      
      group.totalAllowance = monthTotal;
    }

    return groups.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [flights, nonFlightDays, dailyAllowances]);

  // State for expanded months - will be populated by useEffect
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Expand all months by default when monthGroups change
  useEffect(() => {
    setExpandedMonths(new Set(monthGroups.map((g) => g.key)));
  }, [monthGroups]);

  // Filter flights - show flights where the selected country is either departure OR arrival
  const filteredFlights = useMemo(() => {
    if (countryFilter === 'all') return flights;
    return flights.filter((f) => 
      f.country === countryFilter || f.departureCountry === countryFilter
    );
  }, [flights, countryFilter]);

  // Toggle month expansion
  const toggleMonth = useCallback((key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Expand/collapse all
  const expandAll = useCallback(() => {
    setExpandedMonths(new Set(monthGroups.map((g) => g.key)));
  }, [monthGroups]);

  const collapseAll = useCallback(() => {
    setExpandedMonths(new Set());
  }, []);

  const allExpanded = monthGroups.length > 0 && expandedMonths.size === monthGroups.length;

  if (flights.length === 0 && nonFlightDays.length === 0) {
    return (
      <div className="text-center py-12">
        <Plane className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">
          Keine Flugdaten vorhanden
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Laden Sie zuerst eine Flugstundenübersicht hoch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-end">
        {/* Country Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value="all">Alle Länder</option>
            {countries.map((code) => (
              <option key={code} value={code}>
                {getCountryName(code)}
              </option>
            ))}
          </select>
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
        >
          {allExpanded ? 'Alle schließen' : 'Alle öffnen'}
        </button>
      </div>

      {/* Monthly Accordion */}
      <div className="space-y-2">
        {monthGroups.map((group) => {
          const isExpanded = expandedMonths.has(group.key);
          const monthFlights = filteredFlights.filter(
            (f) => f.month === group.month && f.year === group.year
          );
          const monthNonFlightDays = nonFlightDays.filter((d) => {
            // Must be in the correct month/year
            if (d.month !== group.month || d.year !== group.year) return false;
            
            // If no country filter, show all non-flight days
            if (countryFilter === 'all') return true;
            
            // If country filter is active, only show non-flight days in that country
            // FL (layover) days have a country, others (ME, RE, etc.) are typically in Germany
            return d.country === countryFilter;
          });

          if (countryFilter !== 'all' && monthFlights.length === 0) {
            return null;
          }

          return (
            <div
              key={group.key}
              className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
            >
              {/* Month Header */}
              <button
                onClick={() => toggleMonth(group.key)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  )}
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {group.monthName} {group.year}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Plane className="w-4 h-4" />
                    {monthFlights.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {group.totalHours.toFixed(1)}h
                  </span>
                  <span className="flex items-center gap-1">
                    <Euro className="w-4 h-4" />
                    {group.totalAllowance.toFixed(2)}€
                  </span>
                </div>
              </button>

              {/* Month Content */}
              {isExpanded && (
                <div className="p-4">
                  <VirtualFlightTable
                    flights={monthFlights}
                    nonFlightDays={monthNonFlightDays}
                    dailyAllowances={dailyAllowances}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
