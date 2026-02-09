// Airport IATA codes to country mapping
// Common airports for German airline crews

export const AIRPORT_COUNTRIES: Record<string, string> = {
  // Germany (DE)
  FRA: 'DE', // Frankfurt
  MUC: 'DE', // Munich
  DUS: 'DE', // Düsseldorf
  TXL: 'DE', // Berlin Tegel (closed)
  BER: 'DE', // Berlin Brandenburg
  HAM: 'DE', // Hamburg
  CGN: 'DE', // Cologne/Bonn
  STR: 'DE', // Stuttgart
  HAJ: 'DE', // Hannover
  NUE: 'DE', // Nuremberg
  LEJ: 'DE', // Leipzig
  DRS: 'DE', // Dresden
  DTM: 'DE', // Dortmund
  FMO: 'DE', // Münster/Osnabrück
  PAD: 'DE', // Paderborn
  SCN: 'DE', // Saarbrücken
  FDH: 'DE', // Friedrichshafen
  FKB: 'DE', // Karlsruhe/Baden-Baden
  HHN: 'DE', // Frankfurt-Hahn
  NRN: 'DE', // Weeze
  ERF: 'DE', // Erfurt
  RLG: 'DE', // Rostock
  GWT: 'DE', // Sylt
  BRE: 'DE', // Bremen
  IGS: 'DE', // Ingolstadt

  // Austria (AT)
  VIE: 'AT', // Vienna
  SZG: 'AT', // Salzburg
  INN: 'AT', // Innsbruck
  GRZ: 'AT', // Graz
  LNZ: 'AT', // Linz
  KLU: 'AT', // Klagenfurt

  // Switzerland (CH)
  ZRH: 'CH', // Zurich
  GVA: 'CH', // Geneva
  BSL: 'CH', // Basel (EuroAirport)

  // United Kingdom (GB)
  LHR: 'GB', // London Heathrow
  LGW: 'GB', // London Gatwick
  STN: 'GB', // London Stansted
  LTN: 'GB', // London Luton
  LCY: 'GB', // London City
  MAN: 'GB', // Manchester
  BHX: 'GB', // Birmingham
  EDI: 'GB', // Edinburgh
  GLA: 'GB', // Glasgow
  BRS: 'GB', // Bristol
  NCL: 'GB', // Newcastle
  LPL: 'GB', // Liverpool
  EMA: 'GB', // East Midlands
  ABZ: 'GB', // Aberdeen
  BFS: 'GB', // Belfast

  // France (FR)
  CDG: 'FR', // Paris Charles de Gaulle
  ORY: 'FR', // Paris Orly
  NCE: 'FR', // Nice
  LYS: 'FR', // Lyon
  MRS: 'FR', // Marseille
  TLS: 'FR', // Toulouse
  BOD: 'FR', // Bordeaux
  NTE: 'FR', // Nantes
  SXB: 'FR', // Strasbourg
  LIL: 'FR', // Lille
  MPL: 'FR', // Montpellier
  BIQ: 'FR', // Biarritz

  // Italy (IT)
  FCO: 'IT', // Rome Fiumicino
  MXP: 'IT', // Milan Malpensa
  LIN: 'IT', // Milan Linate
  VCE: 'IT', // Venice
  NAP: 'IT', // Naples
  BGY: 'IT', // Milan Bergamo
  BLQ: 'IT', // Bologna
  FLR: 'IT', // Florence
  PSA: 'IT', // Pisa
  TRN: 'IT', // Turin
  CTA: 'IT', // Catania
  PMO: 'IT', // Palermo
  CAG: 'IT', // Cagliari
  OLB: 'IT', // Olbia
  VRN: 'IT', // Verona
  GOA: 'IT', // Genoa
  BRI: 'IT', // Bari

  // Spain (ES)
  MAD: 'ES', // Madrid
  BCN: 'ES', // Barcelona
  PMI: 'ES', // Palma de Mallorca
  AGP: 'ES', // Malaga
  ALC: 'ES', // Alicante
  VLC: 'ES', // Valencia
  SVQ: 'ES', // Seville
  BIO: 'ES', // Bilbao
  TFN: 'ES', // Tenerife North
  TFS: 'ES', // Tenerife South
  LPA: 'ES', // Gran Canaria
  ACE: 'ES', // Lanzarote
  FUE: 'ES', // Fuerteventura
  IBZ: 'ES', // Ibiza
  MAH: 'ES', // Menorca
  SCQ: 'ES', // Santiago de Compostela

  // Portugal (PT)
  LIS: 'PT', // Lisbon
  OPO: 'PT', // Porto
  FAO: 'PT', // Faro
  FNC: 'PT', // Madeira
  PDL: 'PT', // Ponta Delgada (Azores)

  // Netherlands (NL)
  AMS: 'NL', // Amsterdam
  RTM: 'NL', // Rotterdam
  EIN: 'NL', // Eindhoven
  MST: 'NL', // Maastricht

  // Belgium (BE)
  BRU: 'BE', // Brussels
  CRL: 'BE', // Charleroi
  ANR: 'BE', // Antwerp
  LGG: 'BE', // Liège

  // Luxembourg (LU)
  LUX: 'LU', // Luxembourg

  // Ireland (IE)
  DUB: 'IE', // Dublin
  SNN: 'IE', // Shannon
  ORK: 'IE', // Cork

  // Denmark (DK)
  CPH: 'DK', // Copenhagen
  BLL: 'DK', // Billund
  AAL: 'DK', // Aalborg

  // Sweden (SE)
  ARN: 'SE', // Stockholm Arlanda
  GOT: 'SE', // Gothenburg
  MMX: 'SE', // Malmö
  BMA: 'SE', // Stockholm Bromma

  // Norway (NO)
  OSL: 'NO', // Oslo
  BGO: 'NO', // Bergen
  TRD: 'NO', // Trondheim
  SVG: 'NO', // Stavanger
  TOS: 'NO', // Tromsø

  // Finland (FI)
  HEL: 'FI', // Helsinki
  OUL: 'FI', // Oulu
  TMP: 'FI', // Tampere
  TKU: 'FI', // Turku
  RVN: 'FI', // Rovaniemi

  // Iceland (IS)
  KEF: 'IS', // Reykjavik Keflavik
  RKV: 'IS', // Reykjavik

  // Poland (PL)
  WAW: 'PL', // Warsaw
  KRK: 'PL', // Krakow
  GDN: 'PL', // Gdansk
  WRO: 'PL', // Wroclaw
  POZ: 'PL', // Poznan
  KTW: 'PL', // Katowice

  // Czech Republic (CZ)
  PRG: 'CZ', // Prague
  BRQ: 'CZ', // Brno

  // Slovakia (SK)
  BTS: 'SK', // Bratislava

  // Hungary (HU)
  BUD: 'HU', // Budapest

  // Estonia (EE)
  TLL: 'EE', // Tallinn

  // Latvia (LV)
  RIX: 'LV', // Riga

  // Lithuania (LT)
  VNO: 'LT', // Vilnius

  // Moldova (MD)
  KIV: 'MD', // Chisinau

  // Romania (RO)
  OTP: 'RO', // Bucharest
  CLJ: 'RO', // Cluj-Napoca

  // Bulgaria (BG)
  SOF: 'BG', // Sofia
  VAR: 'BG', // Varna
  BOJ: 'BG', // Burgas

  // Greece (GR)
  ATH: 'GR', // Athens
  SKG: 'GR', // Thessaloniki
  HER: 'GR', // Heraklion (Crete)
  RHO: 'GR', // Rhodes
  CFU: 'GR', // Corfu
  JMK: 'GR', // Mykonos
  JTR: 'GR', // Santorini
  KGS: 'GR', // Kos
  CHQ: 'GR', // Chania

  // Turkey (TR)
  IST: 'TR', // Istanbul
  SAW: 'TR', // Istanbul Sabiha Gökçen
  ESB: 'TR', // Ankara
  AYT: 'TR', // Antalya
  ADB: 'TR', // Izmir
  DLM: 'TR', // Dalaman
  BJV: 'TR', // Bodrum

  // Croatia (HR)
  ZAG: 'HR', // Zagreb
  SPU: 'HR', // Split
  DBV: 'HR', // Dubrovnik
  PUY: 'HR', // Pula

  // Slovenia (SI)
  LJU: 'SI', // Ljubljana

  // Serbia (RS)
  BEG: 'RS', // Belgrade

  // Montenegro (ME)
  TGD: 'ME', // Podgorica
  TIV: 'ME', // Tivat

  // Bosnia and Herzegovina (BA)
  SJJ: 'BA', // Sarajevo

  // Albania (AL)
  TIA: 'AL', // Tirana

  // North Macedonia (MK)
  SKP: 'MK', // Skopje

  // Cyprus (CY)
  LCA: 'CY', // Larnaca
  PFO: 'CY', // Paphos

  // Malta (MT)
  MLA: 'MT', // Malta

  // Russia (RU)
  SVO: 'RU', // Moscow Sheremetyevo
  DME: 'RU', // Moscow Domodedovo
  VKO: 'RU', // Moscow Vnukovo
  LED: 'RU', // St. Petersburg

  // Ukraine (UA)
  KBP: 'UA', // Kyiv Boryspil
  IEV: 'UA', // Kyiv Zhuliany
  ODS: 'UA', // Odessa
  LWO: 'UA', // Lviv

  // Middle East
  DXB: 'AE', // Dubai
  AUH: 'AE', // Abu Dhabi
  SHJ: 'AE', // Sharjah
  DOH: 'QA', // Doha
  BAH: 'BH', // Bahrain
  KWI: 'KW', // Kuwait
  MCT: 'OM', // Muscat
  JED: 'SA', // Jeddah
  RUH: 'SA', // Riyadh
  DMM: 'SA', // Dammam
  TLV: 'IL', // Tel Aviv
  AMM: 'JO', // Amman
  BEY: 'LB', // Beirut
  BGW: 'IQ', // Baghdad
  EBL: 'IQ', // Erbil
  IKA: 'IR', // Tehran
  CAI: 'EG', // Cairo
  HRG: 'EG', // Hurghada
  SSH: 'EG', // Sharm El Sheikh

  // Africa
  CMN: 'MA', // Casablanca
  RAK: 'MA', // Marrakech
  AGA: 'MA', // Agadir
  TUN: 'TN', // Tunis
  DJE: 'TN', // Djerba
  ALG: 'DZ', // Algiers
  NBO: 'KE', // Nairobi
  MBA: 'KE', // Mombasa
  ADD: 'ET', // Addis Ababa
  JNB: 'ZA', // Johannesburg
  CPT: 'ZA', // Cape Town
  DUR: 'ZA', // Durban
  LOS: 'NG', // Lagos
  ABV: 'NG', // Abuja
  ABJ: 'CI', // Abidjan
  ACC: 'GH', // Accra
  DAR: 'TZ', // Dar es Salaam
  MRU: 'MU', // Mauritius
  SEZ: 'SC', // Seychelles
  WDH: 'NA', // Windhoek
  LAD: 'AO', // Luanda
  SSG: 'GQ', // Malabo

  // Asia
  PEK: 'CN', // Beijing
  PVG: 'CN', // Shanghai Pudong
  SHA: 'CN', // Shanghai Hongqiao
  CAN: 'CN', // Guangzhou
  HKG: 'HK', // Hong Kong
  TPE: 'TW', // Taipei
  NRT: 'JP', // Tokyo Narita
  HND: 'JP', // Tokyo Haneda
  KIX: 'JP', // Osaka Kansai
  ICN: 'KR', // Seoul Incheon
  GMP: 'KR', // Seoul Gimpo
  SIN: 'SG', // Singapore
  BKK: 'TH', // Bangkok Suvarnabhumi
  DMK: 'TH', // Bangkok Don Mueang
  HKT: 'TH', // Phuket
  KUL: 'MY', // Kuala Lumpur
  CGK: 'ID', // Jakarta
  DPS: 'ID', // Bali
  MNL: 'PH', // Manila
  CEB: 'PH', // Cebu
  HAN: 'VN', // Hanoi
  SGN: 'VN', // Ho Chi Minh City
  DEL: 'IN', // Delhi
  BOM: 'IN', // Mumbai
  BLR: 'IN', // Bangalore
  MAA: 'IN', // Chennai
  CCU: 'IN', // Kolkata
  HYD: 'IN', // Hyderabad
  CMB: 'LK', // Colombo
  MLE: 'MV', // Maldives
  KTM: 'NP', // Kathmandu
  DAC: 'BD', // Dhaka
  KHI: 'PK', // Karachi
  ISB: 'PK', // Islamabad
  LHE: 'PK', // Lahore
  TAS: 'UZ', // Tashkent
  ALA: 'KZ', // Almaty
  NQZ: 'KZ', // Astana (Nur-Sultan)
  TBS: 'GE', // Tbilisi
  EVN: 'AM', // Yerevan
  GYD: 'AZ', // Baku

  // Americas
  JFK: 'US', // New York JFK
  EWR: 'US', // Newark
  LGA: 'US', // New York LaGuardia
  LAX: 'US', // Los Angeles
  SFO: 'US', // San Francisco
  ORD: 'US', // Chicago O'Hare
  MIA: 'US', // Miami
  DFW: 'US', // Dallas/Fort Worth
  ATL: 'US', // Atlanta
  DEN: 'US', // Denver
  SEA: 'US', // Seattle
  BOS: 'US', // Boston
  IAD: 'US', // Washington Dulles
  DCA: 'US', // Washington Reagan
  PHL: 'US', // Philadelphia
  IAH: 'US', // Houston
  PHX: 'US', // Phoenix
  SAN: 'US', // San Diego
  LAS: 'US', // Las Vegas
  MCO: 'US', // Orlando
  DTW: 'US', // Detroit
  MSP: 'US', // Minneapolis
  CLT: 'US', // Charlotte
  STL: 'US', // St. Louis
  AUS: 'US', // Austin
  YYZ: 'CA', // Toronto
  YVR: 'CA', // Vancouver
  YUL: 'CA', // Montreal
  YYC: 'CA', // Calgary
  YOW: 'CA', // Ottawa
  MEX: 'MX', // Mexico City
  CUN: 'MX', // Cancun
  GDL: 'MX', // Guadalajara
  HAV: 'CU', // Havana
  VRA: 'CU', // Varadero
  PUJ: 'DO', // Punta Cana
  SDQ: 'DO', // Santo Domingo
  SJU: 'PR', // San Juan
  PTY: 'PA', // Panama City
  SJO: 'CR', // San Jose (Costa Rica)
  BOG: 'CO', // Bogota
  MDE: 'CO', // Medellin
  CTG: 'CO', // Cartagena
  LIM: 'PE', // Lima
  CUZ: 'PE', // Cusco
  SCL: 'CL', // Santiago
  GRU: 'BR', // Sao Paulo
  GIG: 'BR', // Rio de Janeiro
  BSB: 'BR', // Brasilia
  EZE: 'AR', // Buenos Aires
  AEP: 'AR', // Buenos Aires Aeroparque
  MVD: 'UY', // Montevideo
  CCS: 'VE', // Caracas
  UIO: 'EC', // Quito
  GYE: 'EC', // Guayaquil
  LPB: 'BO', // La Paz
  ASU: 'PY', // Asuncion

  // Caribbean
  MBJ: 'JM', // Montego Bay
  KIN: 'JM', // Kingston
  NAS: 'BS', // Nassau
  BGI: 'BB', // Barbados
  AUA: 'AW', // Aruba
  CUR: 'CW', // Curacao
  SXM: 'SX', // St. Maarten
  POS: 'TT', // Port of Spain

  // Oceania
  SYD: 'AU', // Sydney
  MEL: 'AU', // Melbourne
  BNE: 'AU', // Brisbane
  PER: 'AU', // Perth
  AKL: 'NZ', // Auckland
  WLG: 'NZ', // Wellington
  CHC: 'NZ', // Christchurch
  NAN: 'FJ', // Fiji
  PPT: 'PF', // Tahiti
  DRW: 'AU', // Darwin
  ADL: 'AU', // Adelaide
  OOL: 'AU', // Gold Coast
  CNS: 'AU', // Cairns
};

/**
 * UTC offsets for airports (standard time, winter)
 * DST adds +1 hour in applicable regions
 */
const AIRPORT_UTC_OFFSETS: Record<string, number> = {
  // Germany (UTC+1)
  FRA: 1, MUC: 1, DUS: 1, TXL: 1, BER: 1, HAM: 1, CGN: 1, STR: 1, HAJ: 1, NUE: 1, LEJ: 1, DRS: 1, BRE: 1, DTM: 1, IGS: 1,
  
  // Africa
  NBO: 3, MBA: 3, JNB: 2, CPT: 2, CAI: 2, LOS: 1, ABV: 1, ADD: 3, CMN: 1, RAK: 1, TUN: 1, ALG: 1, DAR: 3, ACC: 0, MRU: 4, SEZ: 4, WDH: 2, LAD: 1, SSG: 1,
  
  // Middle East
  DXB: 4, AUH: 4, DOH: 3, RUH: 3, JED: 3, DMM: 3, TLV: 2, AMM: 2, KWI: 3, BAH: 3, MCT: 4, BGW: 3, EBL: 3, IKA: 3.5, BEY: 2,
  
  // North America
  JFK: -5, EWR: -5, LAX: -8, ORD: -6, SFO: -8, MIA: -5, DFW: -6, IAH: -6, BOS: -5, ATL: -5, SEA: -8, DEN: -7, PHX: -7, IAD: -5, DCA: -5, PHL: -5, DTW: -5, MSP: -6, CLT: -5, SAN: -8, LAS: -8, STL: -6, AUS: -6,
  YYZ: -5, YVR: -8, YUL: -5, YYC: -7, YOW: -5,
  MEX: -6, CUN: -5,
  
  // South America
  GRU: -3, GIG: -3, EZE: -3, SCL: -3, BOG: -5, LIM: -5, CCS: -4, PTY: -5, SJO: -6, HAV: -5, PUJ: -4, SDQ: -4, MBJ: -5, UIO: -5,
  
  // Asia
  PEK: 8, PVG: 8, CAN: 8, HKG: 8, NRT: 9, HND: 9, KIX: 9, ICN: 9, SIN: 8, BKK: 7, HKT: 7, KUL: 8, CGK: 7, DPS: 8, MNL: 8, SGN: 7, HAN: 7,
  DEL: 5.5, BOM: 5.5, BLR: 5.5, MAA: 5.5, CCU: 5.5, HYD: 5.5, CMB: 5.5, MLE: 5, KTM: 5.75, DAC: 6, ISB: 5, KHI: 5, TPE: 8,
  
  // Oceania
  SYD: 10, MEL: 10, BNE: 10, PER: 8, AKL: 12,
  
  // Europe
  LHR: 0, LGW: 0, STN: 0, LCY: 0, MAN: 0, EDI: 0, BHX: 0,
  CDG: 1, ORY: 1, NCE: 1, LYS: 1, MRS: 1, TLS: 1,
  AMS: 1, BRU: 1, ZRH: 1, GVA: 1, BSL: 1, VIE: 1, SZG: 1, INN: 1,
  MAD: 1, BCN: 1, PMI: 1, AGP: 1, VLC: 1, ALC: 1, TFS: 0, LPA: 0,
  FCO: 1, MXP: 1, VCE: 1, NAP: 1, FLR: 1,
  LIS: 0, OPO: 0, FAO: 0,
  CPH: 1, OSL: 1, BGO: 1, ARN: 1, GOT: 1, HEL: 2, DUB: 0,
  ATH: 2, SKG: 2, HER: 2, RHO: 2,
  IST: 3, SAW: 3, AYT: 3, ADB: 3, ESB: 3,
  WAW: 1, KRK: 1, GDN: 1, PRG: 1, BUD: 1, OTP: 2, SOF: 2, BEG: 1,
  ZAG: 1, SPU: 1, DBV: 1, LJU: 1, BTS: 1,
  RIX: 2, VNO: 2, TLL: 2, KIV: 2, KBP: 2, LWO: 2,
  TBS: 4, EVN: 4, GYD: 4,
  SVO: 3, DME: 3, LED: 3,
  
  // Central Asia
  NQZ: 6, ALA: 6, TAS: 5,
  
  // Caribbean
  SXM: -4, CUR: -4, AUA: -4, BGI: -4, POS: -4,
};

/**
 * Get country code for an airport IATA code
 */
export function getCountryFromAirport(iataCode: string): string {
  const code = iataCode.toUpperCase().trim();
  return AIRPORT_COUNTRIES[code] || 'XX'; // XX for unknown
}

/**
 * Check if an airport is in Germany
 */
export function isDomesticAirport(iataCode: string): boolean {
  return getCountryFromAirport(iataCode) === 'DE';
}

/**
 * Get all unique countries from a list of airport codes
 */
export function getCountriesFromAirports(iataCodes: string[]): string[] {
  const countries = new Set<string>();
  for (const code of iataCodes) {
    const country = getCountryFromAirport(code);
    if (country !== 'XX') {
      countries.add(country);
    }
  }
  return Array.from(countries);
}

/**
 * Get a human-readable country name from code
 */
export function getCountryName(countryCode: string): string {
  const names: Record<string, string> = {
    DE: 'Deutschland',
    AT: 'Österreich',
    CH: 'Schweiz',
    GB: 'Großbritannien',
    FR: 'Frankreich',
    IT: 'Italien',
    ES: 'Spanien',
    PT: 'Portugal',
    NL: 'Niederlande',
    BE: 'Belgien',
    LU: 'Luxemburg',
    IE: 'Irland',
    DK: 'Dänemark',
    SE: 'Schweden',
    NO: 'Norwegen',
    FI: 'Finnland',
    IS: 'Island',
    PL: 'Polen',
    CZ: 'Tschechien',
    HU: 'Ungarn',
    RO: 'Rumänien',
    BG: 'Bulgarien',
    GR: 'Griechenland',
    TR: 'Türkei',
    HR: 'Kroatien',
    SI: 'Slowenien',
    RS: 'Serbien',
    ME: 'Montenegro',
    BA: 'Bosnien und Herzegowina',
    AL: 'Albanien',
    MK: 'Nordmazedonien',
    CY: 'Zypern',
    MT: 'Malta',
    RU: 'Russland',
    UA: 'Ukraine',
    EE: 'Estland',
    LV: 'Lettland',
    LT: 'Litauen',
    SK: 'Slowakei',
    MD: 'Moldawien',
    AE: 'Vereinigte Arabische Emirate',
    QA: 'Katar',
    BH: 'Bahrain',
    KW: 'Kuwait',
    OM: 'Oman',
    SA: 'Saudi-Arabien',
    IL: 'Israel',
    JO: 'Jordanien',
    LB: 'Libanon',
    IQ: 'Irak',
    IR: 'Iran',
    EG: 'Ägypten',
    MA: 'Marokko',
    TN: 'Tunesien',
    DZ: 'Algerien',
    KE: 'Kenia',
    ET: 'Äthiopien',
    ZA: 'Südafrika',
    NG: 'Nigeria',
    CI: 'Côte d\'Ivoire',
    GH: 'Ghana',
    TZ: 'Tansania',
    MU: 'Mauritius',
    SC: 'Seychellen',
    NA: 'Namibia',
    AO: 'Angola',
    GQ: 'Äquatorialguinea',
    CN: 'China',
    HK: 'Hongkong',
    TW: 'Taiwan',
    JP: 'Japan',
    KZ: 'Kasachstan',
    KR: 'Südkorea',
    SG: 'Singapur',
    TH: 'Thailand',
    MY: 'Malaysia',
    ID: 'Indonesien',
    PH: 'Philippinen',
    VN: 'Vietnam',
    IN: 'Indien',
    LK: 'Sri Lanka',
    MV: 'Malediven',
    PK: 'Pakistan',
    BD: 'Bangladesch',
    NP: 'Nepal',
    UZ: 'Usbekistan',
    GE: 'Georgien',
    AM: 'Armenien',
    AZ: 'Aserbaidschan',
    US: 'USA',
    CA: 'Kanada',
    MX: 'Mexiko',
    CU: 'Kuba',
    DO: 'Dominikanische Republik',
    PA: 'Panama',
    CR: 'Costa Rica',
    CO: 'Kolumbien',
    PE: 'Peru',
    CL: 'Chile',
    BR: 'Brasilien',
    AR: 'Argentinien',
    AU: 'Australien',
    NZ: 'Neuseeland',
  };
  return names[countryCode.toUpperCase()] || countryCode;
}

/**
 * Get UTC offset for an airport (in hours)
 * Returns standard time offset; DST adds +1 hour in applicable regions
 */
export function getUtcOffset(iataCode: string): number {
  const code = iataCode.toUpperCase().trim();
  return AIRPORT_UTC_OFFSETS[code] || 0; // Default to UTC if unknown
}

/**
 * Convert UTC time to local time at a given airport
 * Returns object with local time and day offset
 */
export function utcToLocalTime(
  utcHours: number,
  utcMinutes: number,
  iataCode: string
): {
  hours: number;
  minutes: number;
  dayOffset: -1 | 0 | 1;
} {
  const offset = getUtcOffset(iataCode);
  let localHours = utcHours + offset;
  let dayOffset: -1 | 0 | 1 = 0;
  
  // Handle day boundary crossing
  if (localHours >= 24) {
    localHours -= 24;
    dayOffset = 1; // Next day
  } else if (localHours < 0) {
    localHours += 24;
    dayOffset = -1; // Previous day
  }
  
  return {
    hours: localHours,
    minutes: utcMinutes,
    dayOffset: dayOffset,
  };
}
