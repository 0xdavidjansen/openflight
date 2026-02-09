// Application constants - separated from types for tree-shaking and HMR compatibility

// German month names
export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
] as const;

// Duty codes and their meanings
export const DUTY_CODES = {
  A: 'Fahrt zur Arbeit',
  E: 'Fahrt von Arbeit',
  ME: 'Medizinische Untersuchung',
  FL: 'Auslandstag',
  EM: 'Emergency Schulung',
  RE: 'Reserve',
  DP: 'Dispatch',
  DT: 'Duty Time',
  SI: 'Simulator',
  TK: 'Training Kurzschulung',
  SB: 'Standby'
} as const;

export const GROUND_DUTY_CODES = ['EM', 'RE', 'DP', 'DT', 'SI', 'TK', 'SB'] as const;
export type GroundDutyCode = typeof GROUND_DUTY_CODES[number];

// Briefing times (in minutes)
export const BRIEFING_TIME_LONGHAUL_MINUTES = 110; // 1h50m before departure
export const BRIEFING_TIME_SHORTHAUL_MINUTES = 0;  // TODO: fill in actual shorthaul briefing time
export const BRIEFING_TIME_SIMULATOR_MINUTES = 120; // 60min before + 60min after

// Aircraft types classified as longhaul
// Matches against the "Muster" field from the PDF (e.g. "A340", "A350", "B747-8")
export const LONGHAUL_AIRCRAFT_TYPES = [
  'A330', 'A340', 'A350', 'A380',
  'B747', 'B777', 'B787',
] as const;
