// Flight crew tax calculator types

// Personal info extracted from PDFs
export interface PersonalInfo {
  name: string;
  personnelNumber: string;
  costCenter: string;
  year: number;
  company?: string;
  dutyStation?: string;
  role?: string;
  aircraftType?: string;
  pkNumber?: string;
  documentDate?: string;
  sheetNumber?: string;
  detectedHomebase?: 'MUC' | 'FRA' | 'Unknown'; // Auto-detected from flights
}

// Raw flight data from Flugstundenübersicht PDF
export interface Flight {
  id: string;
  date: Date;
  month: number; // 1-12
  year: number;
  flightNumber: string;
  originalFlightNumber?: string; // Original flight number with /XX suffix for continuation flights
  departure: string; // IATA code
  arrival: string; // IATA code
  departureTime: string; // HH:MM
  arrivalTime: string; // HH:MM
  blockTime: string; // HH:MM flight duration
  dutyCode?: string; // A, E, ME, FL, EM, RE, DP, DT, SI, TK, SB
  isContinuation: boolean; // Flight with /XX suffix
  continuationOf?: string; // Parent flight number if continuation
  departureCountry?: string; // Departure airport country code
  arrivalCountry?: string; // Arrival airport country code
  country: string; // Destination country (alias for arrivalCountry for backwards compatibility)
}

// Non-flight work day (ground duty, medical, abroad day)
export interface NonFlightDay {
  id: string;
  date: Date;
  month: number;
  year: number;
  type: 'ME' | 'FL' | 'EM' | 'RE' | 'DP' | 'DT' | 'SI' | 'TK' | 'SB';
  description: string;
  country?: string;
}

// Data from Streckeneinsatzabrechnung PDF
export interface ReimbursementData {
  month: number;
  year: number;
  taxFreeReimbursement: number; // Employer's tax-free meal allowance payment
  domesticDays8h: number;
  domesticDays24h: number;
  foreignDays: { country: string; days: number; rate: number }[];
}

// User settings for calculations
export interface Settings {
  distanceToWork: number; // km
  fahrzeitMinutesOverride?: number; // Optional: manual override for travel time in minutes (one way)
  cleaningCostPerDay: number; // EUR
  tipPerNight: number; // EUR
  countOnlyAFlag: boolean; // true = count both A and E flags (2 trips), false = only A flags (1 trip)
  countMedicalAsTrip: boolean; // ME days = round trip
  countGroundDutyAsTrip: boolean; // EM, RE, DP, DT, SI, TK, SB = round trip
  countForeignAsWorkDay: boolean; // FL days as work days
  homebaseOverride?: 'MUC' | 'FRA' | null; // Manual override (null = auto-detect)
}

// Monthly calculation results
export interface MonthlyBreakdown {
  month: number;
  year: number;
  monthName: string;
  flightHours: number; // Total block time in hours
  workDays: number; // Flight days + FL + ME + ground duty
  trips: number; // Commute trips
  distanceDeduction: number; // Entfernungspauschale EUR
  mealAllowance: number; // Verpflegungsmehraufwand EUR
  employerReimbursement: number; // Arbeitgeber-Erstattung (steuerfrei) EUR
  tips: number; // Trinkgeld EUR
  cleaningCosts: number; // Reinigungskosten EUR
  hotelNights: number; // Number of hotel nights
}

// Daily meal allowance calculation
export interface DailyAllowance {
  date: Date;
  hoursAway: number;
  country: string;
  isDomestic: boolean;
  rate: number; // EUR
  type: '>8h' | '24h' | 'arrival' | 'departure';
}

// Daily allowance info (for new calculation logic)
export interface DailyAllowanceInfo {
  country: string;
  flag: string;
  location: string;
  rate: number;
  rateType: '24h' | 'An/Ab' | 'none';
  year: number;
  isFirstDay: boolean;
  isLastDay: boolean;
  hasFlights: boolean;
  isDepartureFromGermanyDay: boolean;
  isReturnToGermanyDay: boolean;
  isFromFLStatus?: boolean;
}

// Abroad period tracking
export interface AbroadPeriod {
  startDate: Date;
  endDate: Date;
  country: string;
  flag: string;
  location: string;
  year: number;
  departureFlightDate: Date | null;
  returnFlightDate: Date | null;
  returnCountry?: string;
  returnFlag?: string;
  returnLocation?: string;
  flights: Flight[];
  isIncomplete: boolean;
  isOvernightDeparture?: boolean;  // Departing FROM Germany overnight
  isOvernightReturn?: boolean;     // Returning TO Germany overnight
}

// Hotel night for tip calculation
export interface HotelNight {
  date: Date;
  location: string;
  country: string;
}

// Trip segment for multi-day trip tracking
export interface TripSegment {
  startDate: Date;
  endDate: Date;
  flights: Flight[];
  hotelNights: HotelNight[];
  countries: string[];
}

// Final tax calculation (Endabrechnung)
export interface TaxCalculation {
  // Reinigungskosten (Zeile 57)
  cleaningCosts: {
    workDays: number;
    ratePerDay: number;
    total: number;
  };
  // Reisenebenkosten (Zeile 71) - Tips
  travelExpenses: {
    hotelNights: number;
    tipRate: number;
    total: number;
  };
  // Fahrtkosten - Distance deduction
  travelCosts: {
    trips: number;
    distanceKm: number;
    totalKm: number;
    deductionFirst20km: number;
    deductionAbove20km: number;
    total: number;
    rateFirst20km: number;
    rateAbove20km: number;
  };
  // Verpflegungsmehraufwendungen
  mealAllowances: {
    domestic8h: { days: number; rate: number; total: number };
    domestic24h: { days: number; rate: number; total: number };
    foreign: { country: string; days: number; rate: number; total: number }[];
    totalAllowances: number;
    employerReimbursement: number;
    deductibleDifference: number;
  };
  // Grand totals
  grandTotal: number;
}

// Warning for data quality issues
export interface DataWarning {
  id: string;
  type: 'orphaned_continuation' | 'missing_month' | 'duplicate_file' | 'incomplete_trip' | 'data_quality' | 'info';
  severity: 'warning' | 'error' | 'info';
  message: string;
  details?: string;
  dismissible: boolean;
}

// Uploaded file tracking
export interface UploadedFile {
  id: string;
  name: string;
  type: 'flugstunden' | 'streckeneinsatz' | 'unknown';
  month?: number;
  year?: number;
  uploadedAt: Date;
}

// App state
export interface AppState {
  // Parsed data
  personalInfo: PersonalInfo | null;
  flights: Flight[];
  nonFlightDays: NonFlightDay[];
  reimbursementData: ReimbursementData[];
  uploadedFiles: UploadedFile[];
  
  // User settings
  settings: Settings;
  
  // Computed
  warnings: DataWarning[];
  
  // UI state
  activeTab: TabType;
  isLoading: boolean;
  error: string | null;
}

export type TabType = 'upload' | 'flights' | 'summary' | 'settings' | 'about';

// Supported years for allowance calculations
export type AllowanceYear = 2023 | 2024 | 2025;

// Country allowance rates (for foreign travel)
export interface CountryAllowance {
  country: string;
  countryCode: string;
  rate8h: number; // Partial day rate (>8h)
  rate24h: number; // Full day rate (24h)
}

// Domestic German allowance rates by year
export interface DomesticRates {
  RATE_8H: number; // More than 8 hours away from home
  RATE_24H: number; // Full 24-hour day
  ARRIVAL_DEPARTURE: number; // Arrival/departure day of multi-day trip
}

// Year-indexed allowance data structure
export interface YearlyAllowanceData {
  domestic: DomesticRates;
  countries: Record<string, [number, number]>; // [fullDay, partialDay]
}

// Re-export constants for backward compatibility
// Note: Constants are now in src/constants/index.ts for better tree-shaking
export { MONTH_NAMES, DUTY_CODES, GROUND_DUTY_CODES } from '../constants';
export type { GroundDutyCode } from '../constants';
