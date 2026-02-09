// German tax law meal allowance rates (Verpflegungsmehraufwand)
// Based on Bundesfinanzministerium guidelines

import type { AllowanceYear, CountryAllowance, DomesticRates } from '../types';
import {
  ALLOWANCES_BY_YEAR,
  DOMESTIC_RATES_BY_YEAR,
  DEFAULT_ALLOWANCE_YEAR,
  AIRPORT_TO_CITY_ALLOWANCE,
  normalizeCountryName,
} from './allowancesData';
import { getCountryFromAirport } from './airports';

// Re-export for backwards compatibility
export { normalizeCountryName, isYearSupported, DEFAULT_ALLOWANCE_YEAR } from './allowancesData';

// Distance deduction rates (Entfernungspauschale)
export interface DistanceRates {
  FIRST_20_KM: number;
  ABOVE_20_KM: number;
}

export function getDistanceRates(year: number = DEFAULT_ALLOWANCE_YEAR): DistanceRates {
  // 2004-2020: 0.30/km for all km
  // 2021: 0.30/km first 20 km, 0.35/km from km 21
  // 2022-2025: 0.30/km first 20 km, 0.38/km from km 21
  // 2026+: 0.38/km for all km
  if (year >= 2026) {
    return { FIRST_20_KM: 0.38, ABOVE_20_KM: 0.38 };
  }
  if (year >= 2022) {
    return { FIRST_20_KM: 0.30, ABOVE_20_KM: 0.38 };
  }
  if (year === 2021) {
    return { FIRST_20_KM: 0.30, ABOVE_20_KM: 0.35 };
  }
  return { FIRST_20_KM: 0.30, ABOVE_20_KM: 0.30 };
}

// Default export for backwards compatibility (uses default year)
export const DISTANCE_RATES = getDistanceRates(DEFAULT_ALLOWANCE_YEAR);

// Default rate for countries not in the list (Luxemburg rates per BMF)
export const DEFAULT_FOREIGN_RATE = {
  rate8h: 42,
  rate24h: 63,
} as const;

// Get domestic rates for a specific year
export function getDomesticRates(year: AllowanceYear = DEFAULT_ALLOWANCE_YEAR): DomesticRates {
  return DOMESTIC_RATES_BY_YEAR[year] || DOMESTIC_RATES_BY_YEAR[DEFAULT_ALLOWANCE_YEAR];
}

// Legacy exports for backwards compatibility (uses default year)
export const DOMESTIC_RATES = DOMESTIC_RATES_BY_YEAR[DEFAULT_ALLOWANCE_YEAR];

// Build CountryAllowance array for a specific year
export function getCountryAllowancesByYear(year: AllowanceYear = DEFAULT_ALLOWANCE_YEAR): CountryAllowance[] {
  const allowanceTable = ALLOWANCES_BY_YEAR[year] || ALLOWANCES_BY_YEAR[DEFAULT_ALLOWANCE_YEAR];
  
  const allowances: CountryAllowance[] = [];
  for (const [country, rates] of Object.entries(allowanceTable)) {
    const rateTuple = rates as [number, number];
    allowances.push({
      country,
      countryCode: getCountryCodeFromName(country),
      rate8h: rateTuple[1], // partialDay
      rate24h: rateTuple[0], // fullDay
    });
  }
  return allowances;
}

// Legacy export for backwards compatibility
export const COUNTRY_ALLOWANCES = getCountryAllowancesByYear(DEFAULT_ALLOWANCE_YEAR);

// Helper to get ISO country code from German country name
function getCountryCodeFromName(countryName: string): string {
  // Map of German country names to ISO codes
  const countryCodeMap: Record<string, string> = {
    'Deutschland': 'DE',
    'Afghanistan': 'AF',
    'Aegypten': 'EG',
    'Aethiopien': 'ET',
    'Aequatorialguinea': 'GQ',
    'Albanien': 'AL',
    'Algerien': 'DZ',
    'Andorra': 'AD',
    'Angola': 'AO',
    'Argentinien': 'AR',
    'Armenien': 'AM',
    'Aserbaidschan': 'AZ',
    'Australien': 'AU',
    'Bahrain': 'BH',
    'Bangladesch': 'BD',
    'Barbados': 'BB',
    'Belgien': 'BE',
    'Benin': 'BJ',
    'Bhutan': 'BT',
    'Bolivien': 'BO',
    'Bosnien und Herzegowina': 'BA',
    'Botsuana': 'BW',
    'Brasilien': 'BR',
    'Brunei': 'BN',
    'Bulgarien': 'BG',
    'Burkina Faso': 'BF',
    'Burundi': 'BI',
    'Chile': 'CL',
    'China': 'CN',
    'Hongkong': 'HK',
    'Costa Rica': 'CR',
    'Elfenbeinkueste': 'CI',
    'Daenemark': 'DK',
    'Dominikanische Republik': 'DO',
    'Dschibuti': 'DJ',
    'Ecuador': 'EC',
    'El Salvador': 'SV',
    'Eritrea': 'ER',
    'Estland': 'EE',
    'Fidschi': 'FJ',
    'Finnland': 'FI',
    'Frankreich': 'FR',
    'Gabun': 'GA',
    'Gambia': 'GM',
    'Georgien': 'GE',
    'Ghana': 'GH',
    'Griechenland': 'GR',
    'Grossbritannien': 'GB',
    'Guatemala': 'GT',
    'Guinea': 'GN',
    'Guinea-Bissau': 'GW',
    'Haiti': 'HT',
    'Honduras': 'HN',
    'Indien': 'IN',
    'Indonesien': 'ID',
    'Iran': 'IR',
    'Irland': 'IE',
    'Island': 'IS',
    'Israel': 'IL',
    'Italien': 'IT',
    'Jamaika': 'JM',
    'Japan': 'JP',
    'Jemen': 'YE',
    'Jordanien': 'JO',
    'Kambodscha': 'KH',
    'Kamerun': 'CM',
    'Kanada': 'CA',
    'Kap Verde': 'CV',
    'Kasachstan': 'KZ',
    'Katar': 'QA',
    'Kenia': 'KE',
    'Kirgisistan': 'KG',
    'Kolumbien': 'CO',
    'Kongo': 'CG',
    'Kongo, Demokratische Republik': 'CD',
    'Korea, Demokratische Volksrepublik': 'KP',
    'Korea, Republik': 'KR',
    'Kosovo': 'XK',
    'Kroatien': 'HR',
    'Kuba': 'CU',
    'Kuwait': 'KW',
    'Laos': 'LA',
    'Lesotho': 'LS',
    'Lettland': 'LV',
    'Libanon': 'LB',
    'Libyen': 'LY',
    'Liberia': 'LR',
    'Liechtenstein': 'LI',
    'Litauen': 'LT',
    'Luxemburg': 'LU',
    'Madagaskar': 'MG',
    'Malawi': 'MW',
    'Malaysia': 'MY',
    'Malediven': 'MV',
    'Mali': 'ML',
    'Malta': 'MT',
    'Marokko': 'MA',
    'Marshall Inseln': 'MH',
    'Mauretanien': 'MR',
    'Mauritius': 'MU',
    'Mexiko': 'MX',
    'Moldau': 'MD',
    'Monaco': 'MC',
    'Mongolei': 'MN',
    'Montenegro': 'ME',
    'Mosambik': 'MZ',
    'Myanmar': 'MM',
    'Namibia': 'NA',
    'Nepal': 'NP',
    'Neuseeland': 'NZ',
    'Nicaragua': 'NI',
    'Niederlande': 'NL',
    'Niger': 'NE',
    'Nigeria': 'NG',
    'Nordmazedonien': 'MK',
    'Norwegen': 'NO',
    'Oesterreich': 'AT',
    'Oman': 'OM',
    'Pakistan': 'PK',
    'Palau': 'PW',
    'Panama': 'PA',
    'Papua-Neuguinea': 'PG',
    'Paraguay': 'PY',
    'Peru': 'PE',
    'Philippinen': 'PH',
    'Polen': 'PL',
    'Portugal': 'PT',
    'Ruanda': 'RW',
    'Rumaenien': 'RO',
    'Russland': 'RU',
    'Sambia': 'ZM',
    'Samoa': 'WS',
    'San Marino': 'SM',
    'Sao Tome und Principe': 'ST',
    'Saudi-Arabien': 'SA',
    'Schweden': 'SE',
    'Schweiz': 'CH',
    'Senegal': 'SN',
    'Serbien': 'RS',
    'Seychellen': 'SC',
    'Sierra Leone': 'SL',
    'Simbabwe': 'ZW',
    'Singapur': 'SG',
    'Slowakei': 'SK',
    'Slowenien': 'SI',
    'Spanien': 'ES',
    'Sri Lanka': 'LK',
    'Sudan': 'SD',
    'Suedafrika': 'ZA',
    'Suedsudan': 'SS',
    'Syrien': 'SY',
    'Tadschikistan': 'TJ',
    'Taiwan': 'TW',
    'Tansania': 'TZ',
    'Thailand': 'TH',
    'Togo': 'TG',
    'Tonga': 'TO',
    'Trinidad und Tobago': 'TT',
    'Tschad': 'TD',
    'Tschechien': 'CZ',
    'Tunesien': 'TN',
    'Tuerkei': 'TR',
    'Turkmenistan': 'TM',
    'Uganda': 'UG',
    'Ukraine': 'UA',
    'Ungarn': 'HU',
    'Uruguay': 'UY',
    'USA': 'US',
    'Usbekistan': 'UZ',
    'Vatikanstadt': 'VA',
    'Venezuela': 'VE',
    'Vereinigte Arabische Emirate': 'AE',
    'Vietnam': 'VN',
    'Weissrussland': 'BY',
    'Zentralafrikanische Republik': 'CF',
    'Zypern': 'CY',
  };
  
  // Handle city-specific entries (e.g., "USA - New York")
  const baseCountry = countryName.split(' - ')[0];
  return countryCodeMap[baseCountry] || 'XX';
}

/**
 * Get allowance rate for a specific country by ISO code and year
 */
export function getCountryAllowance(countryCode: string, year: AllowanceYear = DEFAULT_ALLOWANCE_YEAR): CountryAllowance {
  const normalizedCode = countryCode.toUpperCase();
  const allowanceTable = ALLOWANCES_BY_YEAR[year] || ALLOWANCES_BY_YEAR[DEFAULT_ALLOWANCE_YEAR];
  
  // Find country by ISO code
  for (const [country, rates] of Object.entries(allowanceTable)) {
    if (getCountryCodeFromName(country) === normalizedCode) {
      const rateTuple = rates as [number, number];
      return {
        country,
        countryCode: normalizedCode,
        rate8h: rateTuple[1],
        rate24h: rateTuple[0],
      };
    }
  }
  
  // Return default rates with the country code
  return {
    country: countryCode,
    countryCode: normalizedCode,
    rate8h: DEFAULT_FOREIGN_RATE.rate8h,
    rate24h: DEFAULT_FOREIGN_RATE.rate24h,
  };
}

/**
 * Get allowance rate by country name (German) and year
 */
export function getCountryAllowanceByName(countryName: string, year: AllowanceYear = DEFAULT_ALLOWANCE_YEAR): CountryAllowance {
  const normalizedName = normalizeCountryName(countryName);
  const allowanceTable = ALLOWANCES_BY_YEAR[year] || ALLOWANCES_BY_YEAR[DEFAULT_ALLOWANCE_YEAR];
  
  // Try exact match first
  const exactMatch = allowanceTable[normalizedName];
  if (exactMatch) {
    const rateTuple = exactMatch as [number, number];
    return {
      country: normalizedName,
      countryCode: getCountryCodeFromName(normalizedName),
      rate8h: rateTuple[1],
      rate24h: rateTuple[0],
    };
  }
  
  // Try case-insensitive match
  for (const [country, rates] of Object.entries(allowanceTable)) {
    if (country.toLowerCase() === normalizedName.toLowerCase()) {
      const rateTuple = rates as [number, number];
      return {
        country,
        countryCode: getCountryCodeFromName(country),
        rate8h: rateTuple[1],
        rate24h: rateTuple[0],
      };
    }
  }
  
  // Return default rates
  return {
    country: countryName,
    countryCode: 'XX',
    rate8h: DEFAULT_FOREIGN_RATE.rate8h,
    rate24h: DEFAULT_FOREIGN_RATE.rate24h,
  };
}

/**
 * Get allowance rates for an airport by IATA code and year
 * This handles city-specific rates (e.g., JFK -> "USA - New York")
 */
export function getAllowanceByAirport(iataCode: string, year: AllowanceYear = DEFAULT_ALLOWANCE_YEAR): CountryAllowance {
  const code = iataCode?.toUpperCase() || '';
  const allowanceTable = ALLOWANCES_BY_YEAR[year] || ALLOWANCES_BY_YEAR[DEFAULT_ALLOWANCE_YEAR];
  
  // Check if there's a city-specific mapping for this airport
  const citySpecificKey = AIRPORT_TO_CITY_ALLOWANCE[code];
  if (citySpecificKey) {
    const rates = allowanceTable[citySpecificKey];
    if (rates) {
      const rateTuple = rates as [number, number];
      return {
        country: citySpecificKey,
        countryCode: getCountryCodeFromName(citySpecificKey),
        rate8h: rateTuple[1],
        rate24h: rateTuple[0],
      };
    }
  }
  
  // Fall back to country-based lookup using airports.ts
  const countryCode = getCountryFromAirport(code);
  return getCountryAllowance(countryCode, year);
}

/**
 * Check if a country code represents Germany (domestic)
 */
export function isDomestic(countryCode: string): boolean {
  return countryCode.toUpperCase() === 'DE';
}

/**
 * Get the list of supported years
 */
export function getSupportedYears(): AllowanceYear[] {
  return [2025, 2024, 2023];
}
