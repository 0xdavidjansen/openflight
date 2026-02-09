// Core calculation logic for German flight crew tax deductions

import type {
  Flight,
  NonFlightDay,
  Settings,
  MonthlyBreakdown,
  TaxCalculation,
  HotelNight,
  TripSegment,
  ReimbursementData,
  AllowanceYear,
} from '../types';
import { MONTH_NAMES, GROUND_DUTY_CODES } from '../types';
import {
  LONGHAUL_AIRCRAFT_TYPES,
  BRIEFING_TIME_LONGHAUL_MINUTES,
  BRIEFING_TIME_SHORTHAUL_MINUTES,
  BRIEFING_TIME_SIMULATOR_MINUTES,
} from '../constants';
import { 
  DISTANCE_RATES, 
  getDistanceRates,
  getCountryAllowanceByName,
  getDomesticRates,
  isDomestic,
  DEFAULT_ALLOWANCE_YEAR,
} from './allowances';
import { getCountryFromAirport, getCountryName } from './airports';
import { AIRPORT_TO_CITY_ALLOWANCE } from './allowancesData';
 
/**
 * Detect homebase (MUC or FRA) from flight patterns
 * Counts departures and arrivals for both airports and returns the one with higher count
 * Returns 'Unknown' if tie or neither airport is used
 */
export function detectHomebase(flights: Flight[]): 'MUC' | 'FRA' | 'Unknown' {
  if (flights.length === 0) return 'Unknown';

  let mucCount = 0;
  let fraCount = 0;

  flights.forEach(flight => {
    if (flight.departure === 'MUC') mucCount++;
    if (flight.arrival === 'MUC') mucCount++;
    if (flight.departure === 'FRA') fraCount++;
    if (flight.arrival === 'FRA') fraCount++;
  });

  if (mucCount === fraCount) return 'Unknown';
  return mucCount > fraCount ? 'MUC' : 'FRA';
}

/**
 * Check if a flight is a simulator/training flight
 * Simulator flights are identified by:
 * - Flight number starting with LH9 (e.g., LH9001, LH9234)
 * - Route: FRA → FRA or MUC → MUC (round trip from same German hub)
 * - Block time: 4:00 (exactly 4 hours)
 */
export function isSimulatorFlight(flight: Flight): boolean {
  // Check flight number starts with LH9
  const flightNumberMatch = flight.flightNumber.toUpperCase().startsWith('LH9');

  // Check route is FRA→FRA or MUC→MUC
  const isRoundTripFromHub =
    (flight.departure === 'FRA' && flight.arrival === 'FRA') ||
    (flight.departure === 'MUC' && flight.arrival === 'MUC');

  // Check block time is exactly 4:00
  const blockTimeMatch = flight.blockTime === '4:00';

  return flightNumberMatch && isRoundTripFromHub && blockTimeMatch;
}

/**
 * Parse time string "HH:MM" to decimal hours
 */
export function parseTimeToHours(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}

/**
 * Check if a flight is an overnight flight (arrives the next calendar day)
 * Uses block time + departure time to reliably detect crossing midnight
 */
export function checkOvernightFlight(flight: Flight): boolean {
  const [depH, depM] = flight.departureTime.split(':').map(Number);
  const departureHour = depH + (depM / 60);
  const blockTimeHours = parseBlockTimeToHours(flight.blockTime || '0:00');
  const arrivalHour = departureHour + blockTimeHours;
  return arrivalHour >= 24;
}

/**
 * Calculate the arrival date for a flight (accounts for overnight flights)
 */
export function getFlightArrivalDate(flight: Flight): Date {
  const flightDate = new Date(flight.date);
  if (checkOvernightFlight(flight)) {
    flightDate.setDate(flightDate.getDate() + 1);
  }
  return flightDate;
}

/**
 * Format a date as DD.MM.YYYY string
 */
export function formatDateStr(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

/**
 * Calculate absence duration for departure or return day
 * @param flight The flight
 * @param isDepDay True if departure day, false if return day
 * @param fahrzeitMinutes Travel time to airport in minutes (one way)
 * @param briefingMinutes Briefing time before departure in minutes (only applied on departure day for outbound flights)
 * @param postBriefingMinutes Briefing time after arrival in minutes (for simulator flights)
 */
export function calculateAbsenceDuration(
  flight: Flight,
  isDepDay: boolean,
  fahrzeitMinutes: number,
  briefingMinutes: number = 0,
  postBriefingMinutes: number = 0
): number {
  const fahrzeit = fahrzeitMinutes / 60;
  const briefing = briefingMinutes / 60;
  const postBriefing = postBriefingMinutes / 60;

  if (isDepDay) {
    const depHour = parseTimeToHours(flight.departureTime);

    // Absence starts at: departureTime - briefingTime - fahrzeit
    // So total = (24 - depHour) + briefing + fahrzeit

    // For overnight flights departing from Germany:
    // Count from departure through midnight into the next day's arrival
    if (checkOvernightFlight(flight)) {
      const arrHour = parseTimeToHours(flight.arrivalTime);
      // (24 - depHour) = hours on departure day until midnight
      // + arrHour = hours on arrival day from midnight to landing
      // + briefing = briefing time before departure
      return (24 - depHour) + arrHour + briefing + fahrzeit;
    } else {
      // Single-day flight: only count departure day hours
      // For simulator flights: add post-briefing time (spent at airport after flight)
      return (24 - depHour) + briefing + fahrzeit + postBriefing;
    }
  } else {
    const arrHour = parseTimeToHours(flight.arrivalTime);
    return arrHour + fahrzeit;
  }
}

/**
 * Calculate Fahrzeit (travel time to airport) in minutes from distance
 * Formula: 1 hour per 120km, or 0.5 minutes per km
 * @param distanceKm Distance to work/airport in km
 * @returns Travel time in minutes (one way)
 */
export function distanceToFahrzeitMinutes(distanceKm: number): number {
  // 1h per 120km → 0.5 min per km
  return distanceKm / 2;
}

/**
 * Get Fahrzeit (travel time) from settings, using override if present
 * @param settings User settings
 * @returns Travel time in minutes (one way)
 */
export function getFahrzeitMinutes(settings: Settings): number {
  if (settings.fahrzeitMinutesOverride !== undefined && settings.fahrzeitMinutesOverride >= 0) {
    return settings.fahrzeitMinutesOverride;
  }
  return distanceToFahrzeitMinutes(settings.distanceToWork);
}

/**
 * Check if an aircraft type is longhaul based on the Muster field from the PDF.
 * Normalizes the input and checks against the known longhaul aircraft types list.
 * @param aircraftType The Muster string from the PDF (e.g. "A340", "A350", "B747-8")
 */
export function isLonghaul(aircraftType?: string): boolean {
  if (!aircraftType) return false;
  const normalized = aircraftType.trim().toUpperCase();
  return LONGHAUL_AIRCRAFT_TYPES.some(type => normalized.startsWith(type));
}

/**
 * Get briefing time in minutes for a given aircraft type.
 * Longhaul flights require 1h50m briefing before departure.
 * Shorthaul briefing time is a placeholder (currently 0).
 * @param aircraftType The Muster string from the PDF
 */
export function getBriefingTimeMinutes(aircraftType?: string): number {
  if (isLonghaul(aircraftType)) {
    return BRIEFING_TIME_LONGHAUL_MINUTES;
  }
  return BRIEFING_TIME_SHORTHAUL_MINUTES;
}

/**
 * Get simulator briefing time in minutes.
 * Simulator flights have 60min pre-briefing + 60min post-briefing = 120min total.
 * @returns Object with preBriefing and postBriefing times in minutes
 */
export function getSimulatorBriefingTimeMinutes(): { preBriefing: number; postBriefing: number } {
  // Split the total 120 minutes evenly: 60min before + 60min after
  const halfTime = BRIEFING_TIME_SIMULATOR_MINUTES / 2;
  return {
    preBriefing: halfTime,
    postBriefing: halfTime
  };
}

/**
 * Calculate hours spent abroad on a day when departing FROM a foreign country
 * Used for return flights (Abreisetag logic for departure day from abroad)
 * @param flight The return flight
 */
export function calculateHoursAbroadOnDepartureDay(flight: Flight): number {
  // Hours abroad = from midnight (00:00) until departure time
  const depHour = parseTimeToHours(flight.departureTime);
  return depHour;
}

/**
 * Parse time string "HH:MM" to minutes
 */
export function parseTimeToMinutes(time: string): number {
  if (!time || typeof time !== 'string') {
    console.warn(`parseTimeToMinutes: Invalid input "${time}", returning 0`);
    return 0;
  }
  const parts = time.split(':');
  if (parts.length !== 2) {
    console.warn(`parseTimeToMinutes: Unexpected format "${time}", returning 0`);
    return 0;
  }
  const [hours, minutes] = parts.map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    console.warn(`parseTimeToMinutes: NaN detected in "${time}", returning 0`);
    return 0;
  }
  return hours * 60 + minutes;
}

/**
 * Parse block time "HH:MM" to decimal hours
 */
export function parseBlockTimeToHours(blockTime: string): number {
  if (!blockTime || typeof blockTime !== 'string') {
    console.warn(`parseBlockTimeToHours: Invalid input "${blockTime}", returning 0`);
    return 0;
  }
  const parts = blockTime.split(':');
  if (parts.length !== 2) {
    console.warn(`parseBlockTimeToHours: Unexpected format "${blockTime}", returning 0`);
    return 0;
  }
  const [hours, minutes] = parts.map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    console.warn(`parseBlockTimeToHours: NaN detected in "${blockTime}", returning 0`);
    return 0;
  }
  return hours + minutes / 60;
}

/**
 * Calculate distance deduction (Entfernungspauschale)
 * Rates depend on the year:
 * - 2004-2020: €0.30/km for all km
 * - 2021: €0.30/km first 20 km, €0.35/km from km 21
 * - 2022-2025: €0.30/km first 20 km, €0.38/km from km 21
 * - 2026+: €0.38/km for all km
 */
export function calculateDistanceDeduction(
  trips: number,
  distanceKm: number,
  year: number = DEFAULT_ALLOWANCE_YEAR
): {
  totalKm: number;
  deductionFirst20km: number;
  deductionAbove20km: number;
  total: number;
  rateFirst20km: number;
  rateAbove20km: number;
} {
  const totalKm = trips * distanceKm;
  const rates = getDistanceRates(year);
  
  // For each trip, calculate the deduction
  const perTripDeduction = calculateSingleTripDeduction(distanceKm, rates);
  const total = trips * perTripDeduction;
  
  // Break down for display
  const first20Km = Math.min(distanceKm, 20);
  const above20Km = Math.max(0, distanceKm - 20);
  
  return {
    totalKm,
    deductionFirst20km: trips * first20Km * rates.FIRST_20_KM,
    deductionAbove20km: trips * above20Km * rates.ABOVE_20_KM,
    total,
    rateFirst20km: rates.FIRST_20_KM,
    rateAbove20km: rates.ABOVE_20_KM,
  };
}

function calculateSingleTripDeduction(distanceKm: number, rates = DISTANCE_RATES): number {
  const first20Km = Math.min(distanceKm, 20);
  const above20Km = Math.max(0, distanceKm - 20);
  
  return (
    first20Km * rates.FIRST_20_KM +
    above20Km * rates.ABOVE_20_KM
  );
}

/**
 * Count work days (all days that count as working)
 */
export function countWorkDays(
  flights: Flight[],
  nonFlightDays: NonFlightDay[],
  settings: Settings
): number {
  // Get unique flight dates
  const flightDates = new Set(
    flights.map((f) => f.date.toISOString().split('T')[0])
  );
  
  // Add non-flight work days based on settings
  const nonFlightWorkDates = new Set<string>();
  
  for (const day of nonFlightDays) {
    const dateStr = day.date.toISOString().split('T')[0];
    
    if (day.type === 'ME') {
      nonFlightWorkDates.add(dateStr);
    } else if (day.type === 'FL') {
      nonFlightWorkDates.add(dateStr);
    } else if (GROUND_DUTY_CODES.includes(day.type as typeof GROUND_DUTY_CODES[number]) && settings.countGroundDutyAsTrip) {
      nonFlightWorkDates.add(dateStr);
    }
  }
  
  // Combine (don't double count)
  const allWorkDates = new Set([...flightDates, ...nonFlightWorkDates]);
  return allWorkDates.size;
}

/**
 * Detect same-day round trips from homebase
 * Returns array of dates that have same-day round trips (excluding days with A/E flags)
 */
export function detectSameDayRoundTrips(
  flights: Flight[],
  homebase: 'MUC' | 'FRA' | 'Unknown',
  daysWithAE: Set<string>
): Set<string> {
  const sameDayRoundTripDates = new Set<string>();
  
  if (homebase === 'Unknown') {
    return sameDayRoundTripDates;
  }
  
  // Group flights by date
  const flightsByDate = new Map<string, Flight[]>();
  
  for (const flight of flights) {
    const dateKey = flight.date.toISOString().split('T')[0];
    if (!flightsByDate.has(dateKey)) {
      flightsByDate.set(dateKey, []);
    }
    flightsByDate.get(dateKey)!.push(flight);
  }
  
  // Check each day for same-day round trips
  for (const [dateKey, dayFlights] of flightsByDate) {
    // Skip days that have A/E flags (those are already counted as tours)
    if (daysWithAE.has(dateKey)) {
      continue;
    }
    // Handle single flight from homebase to homebase (e.g., FRA→FRA training flight)
    if (dayFlights.length === 1) {
      const flight = dayFlights[0];
      if (flight.departure === homebase && flight.arrival === homebase) {
        sameDayRoundTripDates.add(dateKey);
      }
      continue;
    }
    
    // Handle multiple flights forming a round trip
    // Sort by departure time
    const sortedFlights = [...dayFlights].sort((a, b) => 
      a.departureTime.localeCompare(b.departureTime)
    );
    
    const firstFlight = sortedFlights[0];
    const lastFlight = sortedFlights[sortedFlights.length - 1];
    
    // Check if round trip from homebase
    if (firstFlight.departure === homebase &&
        lastFlight.arrival === homebase) {
      sameDayRoundTripDates.add(dateKey);
    }
  }
  
  return sameDayRoundTripDates;
}

/**
 * Count commute trips based on settings
 */
export function countTrips(
  flights: Flight[],
  nonFlightDays: NonFlightDay[],
  settings: Settings,
  detectedHomebase?: 'MUC' | 'FRA' | 'Unknown'
): number {
  let trips = 0;
  
  // Resolve effective homebase: manual override takes precedence over auto-detection
  const effectiveHomebase = settings.homebaseOverride ?? detectedHomebase;
  
  // Create set of days that have A/E flags (for efficient lookup)
  const daysWithAE = new Set<string>();
  for (const flight of flights) {
    if (flight.dutyCode === 'A' || flight.dutyCode === 'E') {
      daysWithAE.add(flight.date.toISOString().split('T')[0]);
    }
  }
  
  // Detect same-day round trips from homebase (excluding days with A/E flags)
  const sameDayRoundTripDates = effectiveHomebase 
    ? detectSameDayRoundTrips(flights, effectiveHomebase, daysWithAE)
    : new Set<string>();
  
  // Count A and E flags as trips
  if (settings.countOnlyAFlag) {
    // Count EACH A and E flag as a separate trip
    // A flag = 1 trip (outbound to work)
    // E flag = 1 trip (return from work)
    // Round trip (A + E on same day) = 2 trips
    const aFlags = flights.filter((f) => f.dutyCode === 'A').length;
    const eFlags = flights.filter((f) => f.dutyCode === 'E').length;
    trips += aFlags + eFlags;
  } else {
    // Count only A flags (outbound trips to work)
    trips += flights.filter((f) => f.dutyCode === 'A').length;
  }
  
  // Add same-day round trips (days with A/E flags are already filtered out)
  // Each same-day round trip = 2 trips (outbound + return)
  trips += sameDayRoundTripDates.size * 2;
  
  // ME days = round trip (to and from)
  const meDays = nonFlightDays.filter((d) => d.type === 'ME');
  trips += meDays.length * 2; // Each ME day = 2 trips (there and back)
  
  // Ground duty days = round trip (EXCEPT RE - training/simulator never counts)
  if (settings.countGroundDutyAsTrip) {
    const groundDays = nonFlightDays.filter((d) =>
      GROUND_DUTY_CODES.includes(d.type as typeof GROUND_DUTY_CODES[number]) &&
      d.type !== 'RE'  // RE (training/simulator) never counts as trips
    );
    trips += groundDays.length * 2; // Each ground duty day = 2 trips (there and back)
  }
  
  return trips;
}

/**
 * Detect hotel nights (layovers) from flight data
 */
export function detectHotelNights(flights: Flight[]): HotelNight[] {
  const hotelNights: HotelNight[] = [];
  
  // Sort flights by date and time
  const sortedFlights = [...flights].sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return parseTimeToMinutes(a.departureTime) - parseTimeToMinutes(b.departureTime);
  });
  
  // Track trips
  const trips = detectTrips(sortedFlights);
  
  for (const trip of trips) {
    // Each night in a multi-day trip abroad is a hotel night
    const startDate = trip.startDate;
    const endDate = trip.endDate;
    
    // Calculate nights
    const nights = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    if (nights > 0 && trip.countries.some((c) => !isDomestic(c))) {
      // Track the last known foreign location
      let lastForeignLocation = '';
      let lastForeignCountry = '';
      
      // Find the initial foreign destination from day 1 flights
      const day1Flights = trip.flights.filter(
        (f) => f.date.toISOString().split('T')[0] === startDate.toISOString().split('T')[0]
      );
      const lastDay1Flight = day1Flights[day1Flights.length - 1];
      if (lastDay1Flight) {
        const arrivalCountry = getCountryFromAirport(lastDay1Flight.arrival);
        if (!isDomestic(arrivalCountry)) {
          lastForeignLocation = lastDay1Flight.arrival;
          lastForeignCountry = arrivalCountry;
        }
      }
      
      // Add hotel nights for each night of the trip
      for (let i = 0; i < nights; i++) {
        const nightDate = new Date(startDate);
        nightDate.setDate(nightDate.getDate() + i);
        
        // Find flights landing on this date to update location
        const flightsThisDay = trip.flights.filter(
          (f) => f.date.toISOString().split('T')[0] === nightDate.toISOString().split('T')[0]
        );
        
        if (flightsThisDay.length > 0) {
          const lastFlight = flightsThisDay[flightsThisDay.length - 1];
          const arrivalCountry = getCountryFromAirport(lastFlight.arrival);
          if (!isDomestic(arrivalCountry)) {
            lastForeignLocation = lastFlight.arrival;
            lastForeignCountry = arrivalCountry;
          }
        }
        
        // Add hotel night if we have a foreign location
        if (lastForeignLocation && lastForeignCountry) {
          hotelNights.push({
            date: nightDate,
            location: lastForeignLocation,
            country: getCountryName(lastForeignCountry),
          });
        }
      }
    }
  }
  
  return hotelNights;
}

/**
 * Detect trip segments from flights
 */
export function detectTrips(flights: Flight[]): TripSegment[] {
  const trips: TripSegment[] = [];
  
  if (flights.length === 0) return trips;
  
  // Sort by date
  const sortedFlights = [...flights].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  
  let currentTrip: TripSegment | null = null;
  
  for (const flight of sortedFlights) {
    const departureCountry = getCountryFromAirport(flight.departure);
    const arrivalCountry = getCountryFromAirport(flight.arrival);
    
    // Starting from Germany = new trip start
    if (isDomestic(departureCountry) && !currentTrip) {
      currentTrip = {
        startDate: flight.date,
        endDate: flight.date,
        flights: [flight],
        hotelNights: [],
        countries: [arrivalCountry],
      };
    } else if (currentTrip) {
      // Continue the current trip
      currentTrip.flights.push(flight);
      currentTrip.endDate = flight.date;
      
      if (!currentTrip.countries.includes(arrivalCountry)) {
        currentTrip.countries.push(arrivalCountry);
      }
      
      // Returning to Germany = trip ends
      if (isDomestic(arrivalCountry)) {
        trips.push(currentTrip);
        currentTrip = null;
      }
    }
  }
  
  // Handle unclosed trip
  if (currentTrip) {
    trips.push(currentTrip);
  }
  
  return trips;
}

/**
 * Get daily allowance rates for a country [fullRate, partialRate]
 */
function getDailyAllowanceRates(country: string, year: AllowanceYear): [number, number] {
  const allowance = getCountryAllowanceByName(country, year);
  return [allowance.rate24h, allowance.rate8h];
}

/**
 * Get the allowance-specific country name for an airport
 * This checks for city-specific rates (e.g., BOM -> "Indien - Mumbai")
 * before falling back to the generic country name
 */
function getCountryNameForAllowance(airportCode: string, countryCode: string): string {
  const code = airportCode?.toUpperCase() || '';
  
  // Check if there's a city-specific mapping for this airport
  const citySpecificKey = AIRPORT_TO_CITY_ALLOWANCE[code];
  if (citySpecificKey) {
    return citySpecificKey;
  }
  
  // Fall back to generic country name
  return getCountryName(countryCode);
}

/**
 * Sum two block times in HH:MM format
 */
function sumBlockTimes(time1: string, time2: string): string {
  const mins1 = parseTimeToMinutes(time1);
  const mins2 = parseTimeToMinutes(time2);
  const totalMins = mins1 + mins2;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
}

/**
 * Merge continuation flights with their parent flights
 * Continuation flights have format "LH123/31" where /31 indicates
 * the flight continues from day 31 of the previous month
 */
export function mergeContinuationFlights(flights: Flight[]): Flight[] {
  const mergedFlights: Flight[] = [];
  const processedIndices = new Set<number>();
  
  for (let i = 0; i < flights.length; i++) {
    if (processedIndices.has(i)) continue;
    
    const flight = flights[i];
    
    // Check if this is a continuation flight
    if (flight.isContinuation && flight.continuationOf) {
      // Find the parent flight (previous month, last day)
      const prevMonthDate = new Date(flight.date);
      prevMonthDate.setDate(0); // Go to last day of previous month
      
      const parentIndex = flights.findIndex((f, idx) => 
        !processedIndices.has(idx) &&
        f.flightNumber === flight.continuationOf &&
        f.date.getDate() === prevMonthDate.getDate() &&
        f.date.getMonth() === prevMonthDate.getMonth() &&
        f.date.getFullYear() === prevMonthDate.getFullYear()
      );
      
      if (parentIndex !== -1) {
        const parent = flights[parentIndex];
        
        // Create merged overnight flight
        const mergedFlight: Flight = {
          ...parent,
          // Keep parent's departure info
          id: parent.id,
          date: parent.date,
          month: parent.month,
          year: parent.year,
          departureTime: parent.departureTime,
          // Use continuation's arrival info
          arrivalTime: flight.arrivalTime,
          arrival: flight.arrival,
          arrivalCountry: flight.arrivalCountry,
          country: flight.arrivalCountry || flight.country,
          // Merge block times
          blockTime: sumBlockTimes(parent.blockTime, flight.blockTime),
          // Mark as merged (no longer a continuation)
          isContinuation: false,
        };
        
        mergedFlights.push(mergedFlight);
        processedIndices.add(parentIndex);
        processedIndices.add(i);
        
        console.log(`Merged continuation: ${parent.flightNumber} (${formatDateStr(parent.date)}) with ${flight.flightNumber} (${formatDateStr(flight.date)})`);
      } else {
        // Orphaned continuation - keep as is but log warning
        console.warn(`Orphaned continuation flight: ${flight.flightNumber} on ${formatDateStr(flight.date)}`);
        mergedFlights.push(flight);
        processedIndices.add(i);
      }
    } else {
      // Regular flight
      mergedFlights.push(flight);
      processedIndices.add(i);
    }
  }
  
  return mergedFlights;
}

/**
 * Calculate daily allowances from flights
 * Returns a Map of dateString -> allowance info
 * Key principle: ONE allowance per calendar day
 * German tax law (Verpflegungspauschale):
 * - Anreisetag (departure day from Germany): partial rate
 * - Abreisetag (return day to Germany): partial rate  
 * - Full day abroad (24h, no departure/arrival from/to Germany): full rate
 * - Layover days count as full days abroad
 */
export function calculateDailyAllowances(
  sortedFlights: Flight[],
  nonFlightDays: NonFlightDay[],
  // @ts-expect-error - year parameter kept for backwards compatibility but actual years are determined from flight/day dates
  year: AllowanceYear,
  fahrzeitMinutes: number = 0,
  aircraftType?: string
): Map<string, import('../types').DailyAllowanceInfo> {
  const briefingMinutes = getBriefingTimeMinutes(aircraftType);
  const dailyAllowances = new Map<string, import('../types').DailyAllowanceInfo>();
  
  // First pass: identify all abroad periods with their flights
  const abroadPeriods: import('../types').AbroadPeriod[] = [];
  let currentPeriod: import('../types').AbroadPeriod | null = null;
  
  for (const flight of sortedFlights) {
    const flightDate = new Date(flight.date);
    const arrivalDate = getFlightArrivalDate(flight);
    
    const departureCountry = getCountryFromAirport(flight.departure);
    const arrivalCountry = getCountryFromAirport(flight.arrival);
    const departureCountryName = getCountryNameForAllowance(flight.departure, departureCountry);
    const arrivalCountryName = getCountryNameForAllowance(flight.arrival, arrivalCountry);
    
    // Leaving Germany
    if (isDomestic(departureCountry) && !isDomestic(arrivalCountry)) {
      const isOvernightDeparture = checkOvernightFlight(flight);
      
      // CRITICAL FIX: Orphaned continuation flights show departure from Germany
      // because they record the FULL route (e.g., FRA→CPT), but the actual departure
      // happened in the previous month. These should NOT start a new "leaving Germany" period.
      // Instead, treat them as arrivals abroad (the person is already in a period that
      // started in previous data).
      if (flight.isContinuation) {
        console.warn(`[WARNING] Orphaned continuation ${flight.flightNumber} on ${formatDateStr(flightDate)} - treating as arrival abroad only`);
        
        // Create an incomplete period that represents landing abroad from a previous month's departure
        if (!currentPeriod) {
          // Start the period the day before arrival (we don't know when they really left)
          const estimatedStart = new Date(flightDate);
          estimatedStart.setDate(estimatedStart.getDate() - 1);
          
          currentPeriod = {
            startDate: estimatedStart,
            endDate: arrivalDate,
            country: arrivalCountryName,
            flag: '🌍',
            location: flight.arrival,
            year: flight.year,
            departureFlightDate: null, // Unknown - departed in previous month
            returnFlightDate: null,
            flights: [flight],
            isIncomplete: true,
            isOvernightDeparture: true, // Was overnight from previous month
          };
          console.log(`Created incomplete period for orphaned continuation - estimated start: ${formatDateStr(estimatedStart)}`);
        }
        // Skip normal "leaving Germany" period creation
      } else {
        // Normal departure from Germany
        currentPeriod = {
          startDate: flightDate,
          endDate: arrivalDate,
          country: arrivalCountryName,
          flag: '🌍',
          location: flight.arrival,
          year: flight.year,
          departureFlightDate: flightDate,
          returnFlightDate: null,
          flights: [flight],
          isIncomplete: false,
          isOvernightDeparture: isOvernightDeparture,
        };
      }
    }
    // Continuing abroad (update location and extend period)
    else if (!isDomestic(departureCountry) && !isDomestic(arrivalCountry) && currentPeriod) {
      currentPeriod.endDate = arrivalDate;
      currentPeriod.country = arrivalCountryName;
      currentPeriod.location = flight.arrival;
      currentPeriod.flights.push(flight);
    }
    // Returning to Germany - but NO current period (trip started in previous data set)
    else if (!isDomestic(departureCountry) && isDomestic(arrivalCountry) && !currentPeriod) {
      // Create an incomplete period - we don't know when it started
      const returnFlightDate = flightDate;
      const returnArrivalDate = arrivalDate;
      
      // Find FL abroad days that could belong to this trip
      const relatedAbroadDays = nonFlightDays.filter(d => {
        if (d.type !== 'FL' || !d.country) return false;
        const abroadDate = new Date(d.date);
        return abroadDate < returnFlightDate && d.country === departureCountryName;
      }).sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Determine the start date: earliest FL day, or the day before return flight
      let startDate: Date;
      if (relatedAbroadDays.length > 0) {
        startDate = new Date(relatedAbroadDays[0].date);
      } else {
        // No FL days found - assume at least the day before return was abroad
        startDate = new Date(returnFlightDate);
        startDate.setDate(startDate.getDate() - 1);
      }
      
      currentPeriod = {
        startDate: startDate,
        endDate: returnArrivalDate,
        country: departureCountryName,
        flag: '🌍',
        location: flight.departure,
        year: flight.year,
        departureFlightDate: null, // Unknown - trip started in previous period
        returnFlightDate: returnFlightDate,
        returnCountry: departureCountryName,
        returnFlag: '🌍',
        returnLocation: flight.departure,
        flights: [flight],
        isIncomplete: true
      };
      
      abroadPeriods.push(currentPeriod);
      currentPeriod = null;
      console.log('Created incomplete abroad period for return flight without departure:', flight);
    }
    // Returning to Germany - with current period
    else if (!isDomestic(departureCountry) && isDomestic(arrivalCountry)) {
      if (currentPeriod) {
        const isOvernightReturn = checkOvernightFlight(flight);
        
        if (isOvernightReturn) {
          // For overnight returns:
          // - Period ends on ARRIVAL day in Germany (person is abroad until landing)
          // - Departure day from abroad gets full rate if abroad entire day
          // - Arrival day in Germany gets partial rate
          currentPeriod.endDate = arrivalDate; // End on arrival day (person abroad until landing)
          currentPeriod.returnFlightDate = flightDate;
          currentPeriod.returnCountry = departureCountryName;
          currentPeriod.returnFlag = '🌍';
          currentPeriod.returnLocation = flight.departure;
          currentPeriod.flights.push(flight);
          currentPeriod.isOvernightReturn = true;
        } else {
          // Same-day return: arrival day gets the rate
          currentPeriod.endDate = arrivalDate;
          currentPeriod.returnFlightDate = flightDate;
          currentPeriod.returnCountry = departureCountryName;
          currentPeriod.returnFlag = '🌍';
          currentPeriod.returnLocation = flight.departure;
          currentPeriod.flights.push(flight);
        }
        
        abroadPeriods.push(currentPeriod);
        currentPeriod = null;
      }
    }
  }
  
  // If still abroad (no return flight), close the period
  if (currentPeriod) {
    abroadPeriods.push(currentPeriod);
  }
  
  // Second pass: Add any FL abroad days that weren't captured by flight-based periods
  for (const abroadDay of nonFlightDays) {
    if (abroadDay.type !== 'FL' || !abroadDay.country) continue;
    
    const dateStr = formatDateStr(abroadDay.date);
    
    // Check if this day is already covered by a flight-based period
    let isCovered = false;
    for (const period of abroadPeriods) {
      if (abroadDay.date >= period.startDate && abroadDay.date <= period.endDate) {
        isCovered = true;
        break;
      }
    }
    
    // If not covered, create a standalone abroad day entry
    if (!isCovered) {
      // Convert country code to full country name
      const countryName = getCountryName(abroadDay.country);
      const rates = getDailyAllowanceRates(countryName, abroadDay.year as AllowanceYear);
      dailyAllowances.set(dateStr, {
        country: countryName,
        flag: '🌍',
        location: abroadDay.country,
        rate: rates[0], // Full day rate
        rateType: '24h',
        year: abroadDay.year,
        isFirstDay: false,
        isLastDay: false,
        hasFlights: false,
        isDepartureFromGermanyDay: false,
        isReturnToGermanyDay: false,
        isFromFLStatus: true
      });
      console.log('Added allowance for FL abroad day not covered by periods:', dateStr, abroadDay);
    }
  }
  
  // Merge or detect overlapping periods before processing
  console.log(`[DEBUG] Checking for overlapping periods among ${abroadPeriods.length} periods`);
  for (let i = 0; i < abroadPeriods.length; i++) {
    for (let j = i + 1; j < abroadPeriods.length; j++) {
      const p1 = abroadPeriods[i];
      const p2 = abroadPeriods[j];
      
      // Check if periods overlap
      if ((p1.startDate <= p2.endDate && p1.endDate >= p2.startDate)) {
        console.warn(`[WARNING] Overlapping periods detected:`, {
          period1: { start: formatDateStr(p1.startDate), end: formatDateStr(p1.endDate), country: p1.country },
          period2: { start: formatDateStr(p2.startDate), end: formatDateStr(p2.endDate), country: p2.country }
        });
      }
    }
  }
  
  // Third pass: for each abroad period, calculate daily allowances
  console.log(`[DEBUG] Processing ${abroadPeriods.length} abroad periods`);
  for (let periodIndex = 0; periodIndex < abroadPeriods.length; periodIndex++) {
    const period = abroadPeriods[periodIndex];
    console.log(`[DEBUG] Period ${periodIndex + 1}/${abroadPeriods.length}:`, {
      startDate: formatDateStr(period.startDate),
      endDate: formatDateStr(period.endDate),
      country: period.country,
      isIncomplete: period.isIncomplete,
      isOvernightReturn: period.isOvernightReturn,
      flightCount: period.flights.length
    });
    let currentDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    // Determine which days in this period have flights that START or END on that day
    const periodFlightDepartDays = new Set<string>();
    const periodFlightArriveDays = new Set<string>();
    
    for (const flight of period.flights) {
      periodFlightDepartDays.add(formatDateStr(flight.date));
      if (checkOvernightFlight(flight)) {
        periodFlightArriveDays.add(formatDateStr(getFlightArrivalDate(flight)));
      } else {
        periodFlightArriveDays.add(formatDateStr(flight.date));
      }
    }
    
    // Track country for each day based on where you end up sleeping
    const dayCountryMap = new Map<string, { country: string; flag: string; location: string }>();
    let lastCountry = period.country;
    let lastFlag = period.flag;
    let lastLocation = period.location;
    
    for (const flight of period.flights) {
      const arrivalDate = getFlightArrivalDate(flight);
      const arrivalDateStr = formatDateStr(arrivalDate);
      
      // After this flight arrives, you're in the destination country
      const arrivalCountry = getCountryFromAirport(flight.arrival);
      if (!isDomestic(arrivalCountry)) {
        lastCountry = getCountryNameForAllowance(flight.arrival, arrivalCountry);
        lastLocation = flight.arrival;
      }
      dayCountryMap.set(arrivalDateStr, { country: lastCountry, flag: lastFlag, location: lastLocation });
    }
    
    // Process each day in the abroad period
    let rollingCountry: string | null = null;
    let rollingFlag: string | null = null;
    let rollingLocation: string | null = null;
    
    while (currentDate <= endDate) {
      const dateStr = formatDateStr(currentDate);
      const yearForDay = currentDate.getFullYear();
      
      // Skip if already processed - IMPORTANT: prevents duplicate allowances
      if (dailyAllowances.has(dateStr)) {
        console.log(`[DEBUG] Skipping ${dateStr} - already has allowance:`, dailyAllowances.get(dateStr));
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      // Update rolling country from map if available
      if (dayCountryMap.has(dateStr)) {
        const info = dayCountryMap.get(dateStr)!;
        rollingCountry = info.country;
        rollingFlag = info.flag;
        rollingLocation = info.location;
      }
      
      // Determine what kind of day this is
      const isFirstDay = currentDate.getTime() === period.startDate.getTime();
      const isLastDay = currentDate.getTime() === endDate.getTime();
      
      // Check if this is the day we DEPART from Germany (Anreisetag)
      const isDepartureFromGermanyDay = period.departureFlightDate && 
        currentDate.getTime() === period.departureFlightDate.getTime();
      
      // Check if this is the day we DEPART from abroad (for overnight returns)
      const isDepartingFromAbroadDay = period.isOvernightReturn && period.returnFlightDate &&
        currentDate.getTime() === period.returnFlightDate.getTime();
      
      // Check if this is the day we ARRIVE back in Germany
      const returnFlight = period.flights.find(f => isDomestic(getCountryFromAirport(f.arrival)));
      
      // For overnight returns: Check if this is the ARRIVAL day in Germany (day after departure)
      const isArrivalDayAfterOvernightReturn = period.isOvernightReturn && returnFlight &&
        currentDate.getTime() === getFlightArrivalDate(returnFlight).getTime();
      
      // For same-day returns: Check if this is the return day (Abreisetag)
      const isReturnToGermanyDay = !period.isOvernightReturn && returnFlight && 
        currentDate.getTime() === getFlightArrivalDate(returnFlight).getTime();
      
      // Check if this is the day we ARRIVE abroad after an overnight departure FROM Germany
      // This day should get FULL 24h rate because the person is abroad the entire calendar day
      const isArrivalDayAfterOvernightDeparture = period.isOvernightDeparture && 
        period.flights.length > 0 &&
        currentDate.getTime() === getFlightArrivalDate(period.flights[0]).getTime();
      
      // Determine country for this day
      // Special case: On return day to Germany, use the departure country (where you were before returning)
      // This is the country you get the allowance for on Abreisetag
      let country: string, flag: string, location: string;
      if (isReturnToGermanyDay && period.returnCountry) {
        country = period.returnCountry;
        flag = period.returnFlag || '🌍';
        location = period.returnLocation || '';
        console.log(`[DEBUG] Day ${dateStr} - Return to Germany:`, {
          isReturnToGermanyDay,
          returnCountry: period.returnCountry,
          assignedCountry: country,
          isIncomplete: period.isIncomplete
        });
      } else {
        // Use rolling country, or fall back to period defaults
        country = rollingCountry || period.country;
        flag = rollingFlag || period.flag;
        location = rollingLocation || period.location;
      }
      
      // Check if there are any flights on this day WITHIN the abroad period
      const hasDeparture = periodFlightDepartDays.has(dateStr);
      const hasArrival = periodFlightArriveDays.has(dateStr);
      const hasAnyFlightActivity = hasDeparture || hasArrival;
      
      // Get rates for this country and year
      const rates = getDailyAllowanceRates(country, yearForDay as AllowanceYear);
      
      // Determine rate type according to German tax law
      let rate: number, rateType: '24h' | 'An/Ab' | 'none';
      
      if (isDepartureFromGermanyDay) {
        const absenceHours = calculateAbsenceDuration(period.flights[0], true, fahrzeitMinutes, briefingMinutes);
        console.log(`Departure day absence: ${absenceHours} hours (briefing: ${briefingMinutes}min)`);
        if (absenceHours >= 8) {
          rate = rates[1];
          rateType = 'An/Ab';
        } else {
          rate = 0;
          rateType = 'none';
        }
      } else if (isArrivalDayAfterOvernightDeparture) {
        // Arrival day abroad after overnight departure FROM Germany
        // Person is abroad the entire calendar day → FULL 24h rate
        rate = rates[0];
        rateType = '24h';
        console.log(`Arrival day after overnight departure - full 24h rate: ${rate}`);
      } else if (isDepartingFromAbroadDay) {
        // Departing from abroad back to Germany (overnight return)
        // The person is abroad from 00:00 until they land back in Germany
        // For overnight returns, they're abroad the ENTIRE calendar day of departure (00:00-24:00)
        
        // Since this is an overnight return (period.isOvernightReturn = true),
        // the person is in transit overnight and doesn't land until the next day
        // Therefore, they are abroad for the FULL 24 hours on the departure day
        rate = rates[0]; // Full 24h rate
        rateType = '24h';
        console.log(`Departing from abroad on overnight return - abroad full 24h: ${rate} (full rate)`);
      } else if (isArrivalDayAfterOvernightReturn) {
        // Arrival day in Germany after overnight return from abroad
        // Gets partial rate for the hours spent abroad (midnight to landing)
        rate = rates[1];
        rateType = 'An/Ab';
        console.log(`Arrival day after overnight return - applying partial rate: ${rate}`);
      } else if (isReturnToGermanyDay) {
        // Return day (Ankunftstag) for same-day returns
        // Always gets partial rate, regardless of arrival time
        rate = rates[1];
        rateType = 'An/Ab';
        console.log(`Return day - applying partial rate: ${rate}`);
      } else {
        rate = rates[0];
        rateType = '24h';
      }
      
      dailyAllowances.set(dateStr, {
        country,
        flag,
        location,
        rate,
        rateType,
        year: yearForDay,
        isFirstDay,
        isLastDay,
        hasFlights: hasAnyFlightActivity,
        isDepartureFromGermanyDay: isDepartureFromGermanyDay || false,
        isReturnToGermanyDay: isReturnToGermanyDay || false
      });
      
      console.log(`[DEBUG] Allowance set for ${dateStr}:`, {
        country,
        rate,
        rateType,
        rates: rates
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Special handling for overnight returns: Add arrival day in Germany with partial FOREIGN rate
    // The arrival day gets the partial rate from the country you departed from
    if (period.isOvernightReturn && period.returnFlightDate && period.returnCountry) {
      const returnFlight = period.flights.find(f => 
        isDomestic(getCountryFromAirport(f.arrival)) && 
        new Date(f.date).getTime() === period.returnFlightDate!.getTime()
      );
      
      if (returnFlight) {
        const arrivalDate = getFlightArrivalDate(returnFlight);
        const arrivalDateStr = formatDateStr(arrivalDate);
        
        // Only add if not already in the map (shouldn't be, but check anyway)
        if (!dailyAllowances.has(arrivalDateStr)) {
          const rates = getDailyAllowanceRates(period.returnCountry, period.year as AllowanceYear);
          
          dailyAllowances.set(arrivalDateStr, {
            country: period.returnCountry,
            flag: period.returnFlag || '🌍',
            location: period.returnLocation || '',
            rate: rates[1], // Partial rate for arrival day (8h rate)
            rateType: 'An/Ab', // Partial rate for arrival day
            year: returnFlight.year,
            isFirstDay: false,
            isLastDay: false,
            hasFlights: true,
            isDepartureFromGermanyDay: false,
            isReturnToGermanyDay: true
          });
          
          console.log(`Added arrival day allowance for overnight return: ${arrivalDateStr} - ${rates[1]}€ (${period.returnCountry})`);
        }
      }
    }
  }
  
  // Fourth pass: Add domestic ground duty days that qualify for allowances
  // Only ME (Medical), SB (Standby), and EM (Emergency Training) get partial rate (8h)
  // RE, DP, DT, SI, TK do NOT get meal allowances
  for (const day of nonFlightDays) {
    // Skip FL days (already handled) and days that are already in the map
    if (day.type === 'FL') continue;
    
    const dateStr = formatDateStr(day.date);
    if (dailyAllowances.has(dateStr)) continue; // Already has an allowance (e.g., from flight)
    
    // Only ME, SB, and EM get allowances
    if (day.type !== 'ME' && day.type !== 'SB' && day.type !== 'EM') continue;
    
    const yearForDay = day.year;
    const domesticRates = getDomesticRates(yearForDay as AllowanceYear);
    
    // ME, SB, and EM get partial (8h) domestic rate
    dailyAllowances.set(dateStr, {
      country: 'Deutschland',
      flag: '🇩🇪',
      location: 'DE',
      rate: domesticRates.RATE_8H,
      rateType: 'An/Ab', // Partial rate
      year: yearForDay,
      isFirstDay: false,
      isLastDay: false,
      hasFlights: false,
      isDepartureFromGermanyDay: false,
      isReturnToGermanyDay: false
    });
    
    console.log(`Added partial rate allowance for ${day.type} day:`, dateStr, domesticRates.RATE_8H);
  }
  
  // Fifth pass: Process domestic-only flight days
  // For days with only domestic flights, check if total absence exceeds 8h
  // If so, assign domestic partial rate (14€)
  
  // Group flights by date
  const flightsByDate = new Map<string, Flight[]>();
  for (const flight of sortedFlights) {
    const dateStr = formatDateStr(flight.date);
    if (!flightsByDate.has(dateStr)) {
      flightsByDate.set(dateStr, []);
    }
    flightsByDate.get(dateStr)!.push(flight);
  }
  
  for (const [dateStr, dayFlights] of flightsByDate) {
    // Skip if already has an allowance (e.g., from abroad period or non-flight day)
    if (dailyAllowances.has(dateStr)) continue;

    // Check that ALL flights on this day are domestic (both departure and arrival are DE)
    const allDomestic = dayFlights.every(f =>
      isDomestic(getCountryFromAirport(f.departure)) &&
      isDomestic(getCountryFromAirport(f.arrival))
    );

    if (!allDomestic) continue; // Skip if any flight is foreign (already handled by abroad periods)

    // Check if any flight on this day is a simulator flight
    const hasSimulatorFlight = dayFlights.some(f => isSimulatorFlight(f));

    // Calculate total absence duration
    // Find earliest departure and latest arrival
    let earliestDepMinutes = Infinity;
    let latestArrMinutes = -Infinity;

    for (const flight of dayFlights) {
      const depMinutes = parseTimeToMinutes(flight.departureTime);
      const arrMinutes = parseTimeToMinutes(flight.arrivalTime);

      earliestDepMinutes = Math.min(earliestDepMinutes, depMinutes);
      latestArrMinutes = Math.max(latestArrMinutes, arrMinutes);
    }

    // Add Fahrzeit and briefing time to departure end, Fahrzeit to arrival end
    const fahrzeitHours = fahrzeitMinutes / 60;
    const earliestDepHours = earliestDepMinutes / 60;
    const latestArrHours = latestArrMinutes / 60;

    let absenceHours: number;

    if (hasSimulatorFlight) {
      // Simulator flights: 60min pre-briefing + 60min post-briefing
      const { preBriefing, postBriefing } = getSimulatorBriefingTimeMinutes();
      const preBriefingHours = preBriefing / 60;
      const postBriefingHours = postBriefing / 60;

      // Total absence = (latest arrival + postBriefing + Fahrzeit) - (earliest departure - preBriefing - Fahrzeit)
      // Pilot leaves home, travels to airport (Fahrzeit), does pre-briefing, flies, does post-briefing, travels home
      absenceHours = (latestArrHours + postBriefingHours + fahrzeitHours) - (earliestDepHours - preBriefingHours - fahrzeitHours);
    } else {
      // Regular flights: use standard briefing time
      const briefingHours = briefingMinutes / 60;

      // Total absence = (latest arrival + Fahrzeit) - (earliest departure - briefing - Fahrzeit)
      // Pilot leaves home, travels to airport (Fahrzeit), does briefing, then departs
      absenceHours = (latestArrHours + fahrzeitHours) - (earliestDepHours - briefingHours - fahrzeitHours);
    }
    
    // Only assign allowance if absence >= 8 hours (German tax law: >8h means 8h or more)
    if (absenceHours >= 8) {
      const yearForDay = dayFlights[0].year;
      const domesticRates = getDomesticRates(yearForDay as AllowanceYear);
      
      // Determine rate type: partial (>8h) or full (>=24h, rare but possible)
      const rate = absenceHours >= 24 ? domesticRates.RATE_24H : domesticRates.RATE_8H;
      const rateType = absenceHours >= 24 ? '24h' : 'An/Ab';
      
      dailyAllowances.set(dateStr, {
        country: 'Deutschland',
        flag: '🇩🇪',
        location: 'DE',
        rate,
        rateType,
        year: yearForDay,
        isFirstDay: false,
        isLastDay: false,
        hasFlights: true,
        isDepartureFromGermanyDay: false,
        isReturnToGermanyDay: false
      });
      
      console.log(`Added domestic flight day allowance for ${dateStr}: absence=${absenceHours.toFixed(2)}h, rate=${rate}€`);
    } else {
      console.log(`Domestic flight day ${dateStr}: absence=${absenceHours.toFixed(2)}h (<8h) - no allowance`);
    }
  }
  
  return dailyAllowances;
}
 
/**
 * Calculate meal allowances (Verpflegungsmehraufwand)
 */
export function calculateMealAllowances(
  flights: Flight[],
  nonFlightDays: NonFlightDay[],
  year: AllowanceYear = DEFAULT_ALLOWANCE_YEAR,
  fahrzeitMinutes: number = 0,
  aircraftType?: string
): {
  domestic8h: { days: number; rate: number; total: number };
  domestic24h: { days: number; rate: number; total: number };
  foreign: { country: string; days: number; rate: number; total: number }[];
  total: number;
} {
  // Merge continuation flights with their parent flights from previous month
  const mergedFlights = mergeContinuationFlights(flights);
  
  // Sort flights chronologically
  const sortedFlights = [...mergedFlights].sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return parseTimeToMinutes(a.departureTime) - parseTimeToMinutes(b.departureTime);
  });
  
  // Use the new daily allowance calculation
  const dailyAllowances = calculateDailyAllowances(sortedFlights, nonFlightDays, year, fahrzeitMinutes, aircraftType);
  
  const domesticRates = getDomesticRates(year);
  let domestic8hDays = 0;
  let domestic24hDays = 0;
  const foreignDays: Record<string, { days8h: number; days24h: number; rate8h: number; rate24h: number }> = {};
  
  // Aggregate the daily allowances
  for (const [, allowance] of dailyAllowances) {
    if (allowance.rate === 0) continue; // Skip days with no allowance
    
    // Check if this is a domestic (Germany) day or foreign day
    if (allowance.country === 'Deutschland') {
      // Domestic day
      if (allowance.rateType === '24h') {
        domestic24hDays++;
      } else {
        domestic8hDays++;
      }
    } else {
      // Foreign country day
      if (!foreignDays[allowance.country]) {
        const rates = getDailyAllowanceRates(allowance.country, year);
        foreignDays[allowance.country] = {
          days8h: 0,
          days24h: 0,
          rate8h: rates[1],
          rate24h: rates[0],
        };
      }
      
      if (allowance.rateType === '24h') {
        foreignDays[allowance.country].days24h++;
      } else {
        foreignDays[allowance.country].days8h++;
      }
    }
  }
  
  console.log('[DEBUG] Aggregation complete:', {
    domestic8hDays,
    domestic24hDays,
    foreignDays: Object.entries(foreignDays).map(([c, d]) => ({
      country: c,
      days8h: d.days8h,
      days24h: d.days24h,
      total8h: d.days8h * d.rate8h,
      total24h: d.days24h * d.rate24h
    }))
  });
  
  // Calculate totals
  const domestic8hTotal = domestic8hDays * domesticRates.RATE_8H;
  const domestic24hTotal = domestic24hDays * domesticRates.RATE_24H;
  
  const foreignResult = Object.entries(foreignDays).map(([country, data]) => ({
    country,
    days: data.days8h + data.days24h,
    rate: data.rate24h, // Show the 24h rate as reference
    total: data.days8h * data.rate8h + data.days24h * data.rate24h,
  }));
  
  const foreignTotal = foreignResult.reduce((sum, f) => sum + f.total, 0);
  
  return {
    domestic8h: { days: domestic8hDays, rate: domesticRates.RATE_8H, total: domestic8hTotal },
    domestic24h: { days: domestic24hDays, rate: domesticRates.RATE_24H, total: domestic24hTotal },
    foreign: foreignResult,
    total: domestic8hTotal + domestic24hTotal + foreignTotal,
  };
}

/**
 * Calculate monthly breakdown
 */
export function calculateMonthlyBreakdown(
  flights: Flight[],
  nonFlightDays: NonFlightDay[],
  settings: Settings,
  reimbursementData: ReimbursementData[] = [],
  aircraftType?: string,
  detectedHomebase?: 'MUC' | 'FRA' | 'Unknown'
): MonthlyBreakdown[] {
  // Merge continuation flights with their parent flights from previous month
  const mergedFlights = mergeContinuationFlights(flights);
  
  // Group by month/year
  const monthlyData: Record<string, {
    flights: Flight[];
    nonFlightDays: NonFlightDay[];
  }> = {};
  
  for (const flight of mergedFlights) {
    const key = `${flight.year}-${String(flight.month).padStart(2, '0')}`;
    if (!monthlyData[key]) {
      monthlyData[key] = { flights: [], nonFlightDays: [] };
    }
    monthlyData[key].flights.push(flight);
  }
  
  for (const day of nonFlightDays) {
    const key = `${day.year}-${String(day.month).padStart(2, '0')}`;
    if (!monthlyData[key]) {
      monthlyData[key] = { flights: [], nonFlightDays: [] };
    }
    monthlyData[key].nonFlightDays.push(day);
  }
  
  // Calculate for each month
  const breakdown: MonthlyBreakdown[] = [];
  
  for (const [key, data] of Object.entries(monthlyData)) {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    // Flight hours
    const flightHours = data.flights.reduce(
      (sum, f) => sum + parseBlockTimeToHours(f.blockTime || '0:00'),
      0
    );
    
    // Work days
    const workDays = countWorkDays(data.flights, data.nonFlightDays, settings);
    
    // Trips
    const trips = countTrips(data.flights, data.nonFlightDays, settings, detectedHomebase);
    
    // Distance deduction
    const distanceResult = calculateDistanceDeduction(trips, settings.distanceToWork, year);
    
    // Hotel nights
    const hotelNights = detectHotelNights(data.flights);
    
    // Meal allowance (simplified - full calculation needs trip detection)
    const allowanceYear = year as AllowanceYear;
    const fahrzeitMinutes = getFahrzeitMinutes(settings);
    const mealResult = calculateMealAllowances(data.flights, data.nonFlightDays, allowanceYear, fahrzeitMinutes, aircraftType);
    
    // Employer reimbursement for this month
    const monthlyReimbursement = reimbursementData
      .filter(r => r.month === month && r.year === year)
      .reduce((sum, r) => sum + r.taxFreeReimbursement, 0);
    
    breakdown.push({
      month,
      year,
      monthName: MONTH_NAMES[month - 1],
      flightHours: Math.round(flightHours * 100) / 100,
      workDays,
      trips,
      distanceDeduction: Math.round(distanceResult.total * 100) / 100,
      mealAllowance: Math.round(mealResult.total * 100) / 100,
      employerReimbursement: Math.round(monthlyReimbursement * 100) / 100,
      tips: Math.round(hotelNights.length * settings.tipPerNight * 100) / 100,
      cleaningCosts: Math.round(workDays * settings.cleaningCostPerDay * 100) / 100,
      hotelNights: hotelNights.length,
    });
  }
  
  // Sort by date
  breakdown.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
  
  return breakdown;
}

/**
 * Calculate final tax deduction (Endabrechnung)
 */
export function calculateTaxDeduction(
  flights: Flight[],
  nonFlightDays: NonFlightDay[],
  settings: Settings,
  reimbursementData: ReimbursementData[],
  aircraftType?: string,
  detectedHomebase?: 'MUC' | 'FRA' | 'Unknown'
): TaxCalculation {
  // Work days for cleaning costs
  const workDays = countWorkDays(flights, nonFlightDays, settings);
  const cleaningTotal = workDays * settings.cleaningCostPerDay;
  
  // Hotel nights for tips
  const hotelNights = detectHotelNights(flights);
  const tipsTotal = hotelNights.length * settings.tipPerNight;
  
  // Trips for distance deduction
  const trips = countTrips(flights, nonFlightDays, settings, detectedHomebase);
  
  // Meal allowances - use year from first flight or default
  const year = (flights.length > 0 ? flights[0].year : DEFAULT_ALLOWANCE_YEAR) as AllowanceYear;
  const distanceResult = calculateDistanceDeduction(trips, settings.distanceToWork, year);
  const fahrzeitMinutes = getFahrzeitMinutes(settings);
  const mealResult = calculateMealAllowances(flights, nonFlightDays, year, fahrzeitMinutes, aircraftType);
  
  // Employer reimbursement from Streckeneinsatzabrechnung
  const employerReimbursement = reimbursementData.reduce(
    (sum, r) => sum + r.taxFreeReimbursement,
    0
  );
  
  const deductibleDifference = Math.max(0, mealResult.total - employerReimbursement);
  
  const grandTotal = cleaningTotal + tipsTotal + distanceResult.total + deductibleDifference;
  
  return {
    cleaningCosts: {
      workDays,
      ratePerDay: settings.cleaningCostPerDay,
      total: Math.round(cleaningTotal * 100) / 100,
    },
    travelExpenses: {
      hotelNights: hotelNights.length,
      tipRate: settings.tipPerNight,
      total: Math.round(tipsTotal * 100) / 100,
    },
    travelCosts: {
      trips,
      distanceKm: settings.distanceToWork,
      totalKm: distanceResult.totalKm,
      deductionFirst20km: Math.round(distanceResult.deductionFirst20km * 100) / 100,
      deductionAbove20km: Math.round(distanceResult.deductionAbove20km * 100) / 100,
      total: Math.round(distanceResult.total * 100) / 100,
      rateFirst20km: distanceResult.rateFirst20km,
      rateAbove20km: distanceResult.rateAbove20km,
    },
    mealAllowances: {
      domestic8h: mealResult.domestic8h,
      domestic24h: mealResult.domestic24h,
      foreign: mealResult.foreign,
      totalAllowances: Math.round(mealResult.total * 100) / 100,
      employerReimbursement: Math.round(employerReimbursement * 100) / 100,
      deductibleDifference: Math.round(deductibleDifference * 100) / 100,
    },
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
