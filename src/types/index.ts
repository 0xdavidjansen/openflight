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
  parsedHomebase?: 'MUC' | 'FRA' | null; // Parsed from PDF Dienstelle field (authoritative)
  detectedHomebase?: 'MUC' | 'FRA' | 'Unknown'; // Auto-detected from flights (fallback)
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
  dutyCode?: string; // A, E, ME, FL, EM, RE, RB, DP, DT, SI, TK, SB
  isContinuation: boolean; // Flight with /XX suffix
  continuationOf?: string; // Parent flight number if continuation
  departureCountry?: string; // Departure airport country code
  arrivalCountry?: string; // Arrival airport country code
  country: string; // Destination country (alias for arrivalCountry for backwards compatibility)
  isSimulator?: boolean; // True if this is a simulator/training flight (LH9xxx, FRA/FRA or MUC/MUC, 4:00 block)
}

// Non-flight work day (ground duty, medical, abroad day)
export interface NonFlightDay {
  id: string;
  date: Date;
  month: number;
  year: number;
  type: 'ME' | 'FL' | 'EM' | 'RE' | 'RB' | 'DP' | 'DT' | 'SI' | 'TK' | 'SB';
  description: string;
  country?: string;
}

// Data from Streckeneinsatzabrechnung PDF
export interface ReimbursementData {
  month: number;
  year: number;
  taxFreeReimbursement: number; // Employer's tax-free meal allowance payment
  countryDays: { country: string; days8h: number; days24h: number; rate8h: number; rate24h: number }[];
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
  isDepartureFromHomeBase?: boolean; // True if departing from detected homebase (FRA or MUC)
  isReturnToHomeBase?: boolean; // True if returning to detected homebase (FRA or MUC)
  isFromFLStatus?: boolean;
  briefingMinutes?: number; // Briefing time applied to this day (0 if none)
  isLonghaul?: boolean; // Flag indicating if this is a longhaul flight day
  hasAllowanceQualified?: boolean; // true if meets 8h+ threshold for allowance, false if informational only
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
  isOvernightDeparture?: boolean;  // Departing on overnight flight
  isOvernightReturn?: boolean;     // Returning on overnight flight
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

// Country breakdown for meal allowances
export interface CountryAllowanceBreakdown {
  country: string;
  days8h: number;
  rate8h: number;
  total8h: number;
  days24h: number;
  rate24h: number;
  total24h: number;
  totalCountry: number;
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
    byCountry: CountryAllowanceBreakdown[];
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

// Country allowance rates
export interface CountryAllowance {
  country: string;
  countryCode: string;
  rate8h: number; // Partial day rate (>8h)
  rate24h: number; // Full day rate (24h)
  flightType: 'shorthaul' | 'longhaul'; // Flight operation type for this destination
}

// Re-export constants for backward compatibility
// Note: Constants are now in src/constants/index.ts for better tree-shaking
export { MONTH_NAMES, DUTY_CODES, GROUND_DUTY_CODES } from '../constants';
export type { GroundDutyCode } from '../constants';
