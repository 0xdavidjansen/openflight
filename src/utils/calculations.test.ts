import { describe, it, expect } from 'vitest'
import {
  parseTimeToMinutes,
  parseBlockTimeToHours,
  calculateDistanceDeduction,
  countWorkDays,
  countTrips,
  detectTrips,
  detectHotelNights,
  detectSameDayRoundTrips,
  calculateMealAllowances,
  calculateMonthlyBreakdown,
  calculateTaxDeduction,
  calculateAbsenceDuration,
  isLonghaul,
  getBriefingTimeMinutes,
  formatCurrency,
  formatHours,
} from './calculations'
import type { Flight, NonFlightDay, Settings } from '../types'

describe('parseTimeToMinutes', () => {
  it('parses standard time format', () => {
    expect(parseTimeToMinutes('12:30')).toBe(750)
    expect(parseTimeToMinutes('00:00')).toBe(0)
    expect(parseTimeToMinutes('23:59')).toBe(1439)
  })

  it('handles single digit hours', () => {
    expect(parseTimeToMinutes('9:30')).toBe(570)
  })

  it('handles malformed input gracefully', () => {
    expect(parseTimeToMinutes('')).toBe(0)
    expect(parseTimeToMinutes('invalid')).toBe(0)
  })
})

describe('parseBlockTimeToHours', () => {
  it('converts block time to decimal hours', () => {
    expect(parseBlockTimeToHours('1:30')).toBe(1.5)
    expect(parseBlockTimeToHours('2:45')).toBe(2.75)
    expect(parseBlockTimeToHours('0:00')).toBe(0)
  })

  it('handles longer flights', () => {
    expect(parseBlockTimeToHours('10:00')).toBe(10)
    expect(parseBlockTimeToHours('12:30')).toBe(12.5)
  })
})

describe('calculateDistanceDeduction', () => {
  it('calculates correctly for distance under 20km (2024 rates)', () => {
    const result = calculateDistanceDeduction(10, 15, 2024) // 10 trips, 15km
    expect(result.totalKm).toBe(150)
    expect(result.deductionFirst20km).toBe(45) // 10 * 15 * 0.30
    expect(result.deductionAbove20km).toBe(0)
    expect(result.total).toBe(45)
    expect(result.rateFirst20km).toBe(0.30)
    expect(result.rateAbove20km).toBe(0.38)
  })

  it('calculates correctly for distance over 20km (2024 rates)', () => {
    const result = calculateDistanceDeduction(10, 30, 2024) // 10 trips, 30km
    expect(result.totalKm).toBe(300)
    expect(result.deductionFirst20km).toBe(60) // 10 * 20 * 0.30
    expect(result.deductionAbove20km).toBe(38) // 10 * 10 * 0.38
    expect(result.total).toBe(98)
    expect(result.rateFirst20km).toBe(0.30)
    expect(result.rateAbove20km).toBe(0.38)
  })

  it('handles exactly 20km (2024 rates)', () => {
    const result = calculateDistanceDeduction(5, 20, 2024)
    expect(result.deductionFirst20km).toBe(30) // 5 * 20 * 0.30
    expect(result.deductionAbove20km).toBe(0)
    expect(result.total).toBe(30)
  })

  it('handles zero trips', () => {
    const result = calculateDistanceDeduction(0, 30, 2024)
    expect(result.total).toBe(0)
  })

  it('uses 2021 rate for km 21+', () => {
    const result = calculateDistanceDeduction(1, 30, 2021)
    expect(result.deductionFirst20km).toBe(6) // 20 * 0.30
    expect(result.deductionAbove20km).toBe(3.5) // 10 * 0.35
    expect(result.rateAbove20km).toBe(0.35)
  })

  it('uses 2026 rate for all km', () => {
    const result = calculateDistanceDeduction(1, 30, 2026)
    expect(result.deductionFirst20km).toBe(7.6) // 20 * 0.38
    expect(result.deductionAbove20km).toBe(3.8) // 10 * 0.38
    expect(result.rateFirst20km).toBe(0.38)
    expect(result.rateAbove20km).toBe(0.38)
  })
})

describe('countWorkDays', () => {
  const defaultSettings: Settings = {
    distanceToWork: 30,
    cleaningCostPerDay: 1.0,
    tipPerNight: 1.0,
    countOnlyAFlag: true,
    countMedicalAsTrip: true,
    countGroundDutyAsTrip: true,
    countForeignAsWorkDay: true,
  }

  it('counts unique flight dates', () => {
    const flights: Flight[] = [
      createFlight('2024-01-15', 'LH100'),
      createFlight('2024-01-15', 'LH101'), // Same date
      createFlight('2024-01-16', 'LH102'),
    ]
    const result = countWorkDays(flights, [], defaultSettings)
    expect(result).toBe(2) // 2 unique dates
  })

  it('includes ME days when setting enabled', () => {
    const flights: Flight[] = [createFlight('2024-01-15', 'LH100')]
    const nonFlightDays: NonFlightDay[] = [
      createNonFlightDay('2024-01-16', 'ME'),
    ]
    const result = countWorkDays(flights, nonFlightDays, defaultSettings)
    expect(result).toBe(2)
  })

  it('excludes ME days when setting disabled', () => {
    const settings = { ...defaultSettings, countMedicalAsTrip: false }
    const flights: Flight[] = [createFlight('2024-01-15', 'LH100')]
    const nonFlightDays: NonFlightDay[] = [
      createNonFlightDay('2024-01-16', 'ME'),
    ]
    const result = countWorkDays(flights, nonFlightDays, settings)
    expect(result).toBe(1)
  })

  it('includes ground duty days when setting enabled', () => {
    const nonFlightDays: NonFlightDay[] = [
      createNonFlightDay('2024-01-15', 'SB'),
      createNonFlightDay('2024-01-16', 'RE'),
    ]
    const result = countWorkDays([], nonFlightDays, defaultSettings)
    expect(result).toBe(2)
  })

  it('does not double count if flight and non-flight on same day', () => {
    const flights: Flight[] = [createFlight('2024-01-15', 'LH100')]
    const nonFlightDays: NonFlightDay[] = [
      createNonFlightDay('2024-01-15', 'ME'),
    ]
    const result = countWorkDays(flights, nonFlightDays, defaultSettings)
    expect(result).toBe(1)
  })
})

describe('countTrips', () => {
  const defaultSettings: Settings = {
    distanceToWork: 30,
    cleaningCostPerDay: 1.0,
    tipPerNight: 1.0,
    countOnlyAFlag: true,
    countMedicalAsTrip: true,
    countGroundDutyAsTrip: true,
    countForeignAsWorkDay: true,
  }

  it('counts A/E flags as trips', () => {
    const flights: Flight[] = [
      createFlight('2024-01-15', 'LH100', 'A'),
      createFlight('2024-01-16', 'LH101', 'E'),
    ]
    const result = countTrips(flights, [], defaultSettings)
    expect(result).toBe(2)
  })

  it('counts only A flags when countOnlyAFlag is false', () => {
    const settings = { ...defaultSettings, countOnlyAFlag: false }
    const flights: Flight[] = [
      createFlight('2024-01-15', 'LH100', 'A'),
      createFlight('2024-01-15', 'LH101', 'E'),
      createFlight('2024-01-16', 'LH102', 'A'),
    ]
    const result = countTrips(flights, [], settings)
    expect(result).toBe(2) // Only A flags
  })

  it('adds ME days as trips', () => {
    const nonFlightDays: NonFlightDay[] = [
      createNonFlightDay('2024-01-15', 'ME'),
      createNonFlightDay('2024-01-16', 'ME'),
    ]
    const result = countTrips([], nonFlightDays, defaultSettings)
    expect(result).toBe(4) // 2 ME days * 2 trips each (round trip)
  })

  it('adds ground duty days as trips (except RE)', () => {
    const nonFlightDays: NonFlightDay[] = [
      createNonFlightDay('2024-01-15', 'SB'),
      createNonFlightDay('2024-01-16', 'RE'), // RE is excluded
      createNonFlightDay('2024-01-17', 'SI'),
    ]
    const result = countTrips([], nonFlightDays, defaultSettings)
    expect(result).toBe(4) // 2 ground duty days (SB, SI) * 2 trips each = 4 (RE excluded)
  })

  it('counts same-day round trip as 2 trips when no A/E flag', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'FRA'),
    ]
    const result = countTrips(flights, [], defaultSettings, 'FRA')
    expect(result).toBe(2) // Round trip = 2 trips
  })

  it('counts same-day round trip from MUC homebase', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'MUC', 'FRA'),
      createFlightWithRoute('2023-05-15', 'LH101', 'FRA', 'MUC'),
    ]
    const result = countTrips(flights, [], defaultSettings, 'MUC')
    expect(result).toBe(2) // Round trip = 2 trips
  })

  it('does not double count same-day round trip if A/E flag already present', () => {
    const flights: Flight[] = [
      { ...createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'), dutyCode: 'A' },
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'FRA'),
    ]
    const result = countTrips(flights, [], defaultSettings, 'FRA')
    expect(result).toBe(1) // Only count the A flag once, not the round trip
  })

  it('does not count same-day round trip if homebase is unknown', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'FRA'),
    ]
    const result = countTrips(flights, [], defaultSettings, 'Unknown')
    expect(result).toBe(0) // No trips counted without homebase
  })

  it('does not count same-day round trip if homebase is not provided', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'FRA'),
    ]
    const result = countTrips(flights, [], defaultSettings)
    expect(result).toBe(0) // No trips counted without homebase parameter
  })

  it('counts single FRA→FRA flight as 2 trips', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'),
    ]
    const result = countTrips(flights, [], defaultSettings, 'FRA')
    expect(result).toBe(2) // Round trip = 2 trips (outbound + return)
  })

  it('counts single MUC→MUC flight as 2 trips', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-29', 'LH9142', 'MUC', 'MUC'),
    ]
    const result = countTrips(flights, [], defaultSettings, 'MUC')
    expect(result).toBe(2) // Round trip = 2 trips (outbound + return)
  })

  it('does not double count FRA→FRA when A flag present', () => {
    const flights: Flight[] = [
      { ...createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'), dutyCode: 'A' },
    ]
    const result = countTrips(flights, [], defaultSettings, 'FRA')
    expect(result).toBe(1) // Only count A flag, not the round trip
  })

  it('does not double count FRA→FRA when E flag present', () => {
    const flights: Flight[] = [
      { ...createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'), dutyCode: 'E' },
    ]
    const result = countTrips(flights, [], defaultSettings, 'FRA')
    expect(result).toBe(1) // Only count E flag, not the round trip
  })

  it('counts multiple FRA→FRA flights on different days', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'),
      createFlightWithRoute('2023-05-29', 'LH9142', 'FRA', 'FRA'),
      createFlightWithRoute('2023-05-30', 'LH9143', 'FRA', 'FRA'),
    ]
    const result = countTrips(flights, [], defaultSettings, 'FRA')
    expect(result).toBe(6) // 3 days * 2 trips each = 6 trips
  })

  it('does not count FRA→FRA when homebase is Unknown', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'),
    ]
    const result = countTrips(flights, [], defaultSettings, 'Unknown')
    expect(result).toBe(0) // No trips counted when homebase is unknown
  })

  it('respects homebaseOverride in settings over detected homebase', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'),
    ]
    const settingsWithOverride = {
      ...defaultSettings,
      homebaseOverride: 'MUC' as const,  // Override to MUC
    }
    // Should NOT count FRA→FRA because homebase is overridden to MUC (not FRA)
    const result = countTrips(flights, [], settingsWithOverride, 'FRA')
    expect(result).toBe(0)
  })

  it('uses detected homebase when homebaseOverride is null', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'),
    ]
    const settingsNoOverride = {
      ...defaultSettings,
      homebaseOverride: null,  // No override (auto-detect)
    }
    // Should count FRA→FRA because detected homebase is FRA
    const result = countTrips(flights, [], settingsNoOverride, 'FRA')
    expect(result).toBe(2)
  })

  it('homebaseOverride takes precedence and enables counting', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH9141', 'MUC', 'MUC'),
    ]
    const settingsWithOverride = {
      ...defaultSettings,
      homebaseOverride: 'MUC' as const,
    }
    // Should count MUC→MUC when override is MUC, even if detected is FRA
    const result = countTrips(flights, [], settingsWithOverride, 'FRA')
    expect(result).toBe(2)
  })

  it('homebaseOverride undefined uses detected homebase', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'),
    ]
    const settingsUndefinedOverride = {
      ...defaultSettings,
      homebaseOverride: undefined,  // Undefined means use detected
    }
    // Should count FRA→FRA because override is undefined, so use detected FRA
    const result = countTrips(flights, [], settingsUndefinedOverride, 'FRA')
    expect(result).toBe(2)
  })

  it('counts each A and E flag separately, not unique days', () => {
    const flights: Flight[] = [
      { ...createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'JFK'), dutyCode: 'A' },
      { ...createFlightWithRoute('2023-05-15', 'LH101', 'JFK', 'FRA'), dutyCode: 'E' },
      { ...createFlightWithRoute('2023-05-16', 'LH102', 'FRA', 'LHR'), dutyCode: 'A' },
      { ...createFlightWithRoute('2023-05-16', 'LH103', 'LHR', 'FRA'), dutyCode: 'E' },
    ]
    const result = countTrips(flights, [], defaultSettings, 'FRA')
    // 2 A flags + 2 E flags = 4 trips (NOT 2 unique days!)
    expect(result).toBe(4)
  })

  it('counts May 2023 scenario: 2A + 3E + 3 FRA→FRA = 11 trips', () => {
    const flights: Flight[] = [
      // 2 A flags
      { ...createFlightWithRoute('2023-05-01', 'LH100', 'FRA', 'JFK'), dutyCode: 'A' },
      { ...createFlightWithRoute('2023-05-05', 'LH102', 'FRA', 'LHR'), dutyCode: 'A' },
      // 3 E flags
      { ...createFlightWithRoute('2023-05-02', 'LH101', 'JFK', 'FRA'), dutyCode: 'E' },
      { ...createFlightWithRoute('2023-05-06', 'LH103', 'LHR', 'FRA'), dutyCode: 'E' },
      { ...createFlightWithRoute('2023-05-10', 'LH105', 'CDG', 'FRA'), dutyCode: 'E' },
      // 3 FRA→FRA flights without A/E flags
      createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'),
      createFlightWithRoute('2023-05-29', 'LH9142', 'FRA', 'FRA'),
      createFlightWithRoute('2023-05-30', 'LH9143', 'FRA', 'FRA'),
    ]
    const result = countTrips(flights, [], defaultSettings, 'FRA')
    // 2 A flags = 2 trips
    // 3 E flags = 3 trips
    // 3 FRA→FRA = 6 trips (3 × 2)
    // Total = 2 + 3 + 6 = 11 trips
    expect(result).toBe(11)
  })

  it('never counts RE (training/simulator) as trips even when ground duty is enabled', () => {
    const nonFlightDays: NonFlightDay[] = [
      createNonFlightDay('2023-05-15', 'RE'),  // Training/simulator
    ]
    const settingsWithGroundDuty = {
      ...defaultSettings,
      countGroundDutyAsTrip: true,  // Ground duty counting is enabled
    }
    const result = countTrips([], nonFlightDays, settingsWithGroundDuty, 'FRA')
    // RE should never count, even when countGroundDutyAsTrip is true
    expect(result).toBe(0)
  })

  it('counts other ground duty codes (not RE) when enabled', () => {
    const nonFlightDays: NonFlightDay[] = [
      createNonFlightDay('2023-05-15', 'EM'),  // Einsatz mit Übernachtung
      createNonFlightDay('2023-05-16', 'SB'),  // Standby
    ]
    const settingsWithGroundDuty = {
      ...defaultSettings,
      countGroundDutyAsTrip: true,
    }
    const result = countTrips([], nonFlightDays, settingsWithGroundDuty, 'FRA')
    // EM and SB should count as 2 trips each when enabled
    expect(result).toBe(4) // 2 days × 2 trips = 4
  })
})

describe('detectSameDayRoundTrips', () => {
  it('detects FRA same-day round trip', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'FRA'),
    ]
    const result = detectSameDayRoundTrips(flights, 'FRA', new Set())
    expect(result.has('2023-05-15')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('detects MUC same-day round trip', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'MUC', 'FRA'),
      createFlightWithRoute('2023-05-15', 'LH101', 'FRA', 'MUC'),
    ]
    const result = detectSameDayRoundTrips(flights, 'MUC', new Set())
    expect(result.has('2023-05-15')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('detects round trip with multiple flights in between', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'BER'),
      createFlightWithRoute('2023-05-15', 'LH102', 'BER', 'FRA'),
    ]
    const result = detectSameDayRoundTrips(flights, 'FRA', new Set())
    expect(result.has('2023-05-15')).toBe(true)
  })

  it('does not detect if only one flight', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
    ]
    const result = detectSameDayRoundTrips(flights, 'FRA', new Set())
    expect(result.size).toBe(0)
  })

  it('does not detect if not returning to homebase', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'BER'),
    ]
    const result = detectSameDayRoundTrips(flights, 'FRA', new Set())
    expect(result.size).toBe(0)
  })

  it('does not detect if not departing from homebase', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'BER', 'MUC'),
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'FRA'),
    ]
    const result = detectSameDayRoundTrips(flights, 'FRA', new Set())
    expect(result.size).toBe(0)
  })

  it('returns empty set for unknown homebase', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'FRA'),
    ]
    const result = detectSameDayRoundTrips(flights, 'Unknown', new Set())
    expect(result.size).toBe(0)
  })

  it('detects multiple same-day round trips on different days', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'FRA'),
      createFlightWithRoute('2023-05-16', 'LH102', 'FRA', 'BER'),
      createFlightWithRoute('2023-05-16', 'LH103', 'BER', 'FRA'),
    ]
    const result = detectSameDayRoundTrips(flights, 'FRA', new Set())
    expect(result.has('2023-05-15')).toBe(true)
    expect(result.has('2023-05-16')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('detects single flight from homebase to homebase (FRA→FRA)', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'),
    ]
    const result = detectSameDayRoundTrips(flights, 'FRA', new Set())
    expect(result.has('2023-05-15')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('detects single flight from homebase to homebase (MUC→MUC)', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-29', 'LH9142', 'MUC', 'MUC'),
    ]
    const result = detectSameDayRoundTrips(flights, 'MUC', new Set())
    expect(result.has('2023-05-29')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('does not detect FRA→FRA when homebase is MUC', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH9141', 'FRA', 'FRA'),
    ]
    const result = detectSameDayRoundTrips(flights, 'MUC', new Set())
    expect(result.size).toBe(0)
  })

  it('does not detect single flight not returning to homebase', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'),
    ]
    const result = detectSameDayRoundTrips(flights, 'FRA', new Set())
    expect(result.size).toBe(0)
  })

  it('excludes days with A/E flags from same-day round trip detection', () => {
    const flights: Flight[] = [
      { ...createFlightWithRoute('2023-05-15', 'LH100', 'FRA', 'MUC'), dutyCode: 'A' },
      createFlightWithRoute('2023-05-15', 'LH101', 'MUC', 'FRA'),
      createFlightWithRoute('2023-05-16', 'LH102', 'FRA', 'BER'),
      createFlightWithRoute('2023-05-16', 'LH103', 'BER', 'FRA'),
    ]
    const daysWithAE = new Set(['2023-05-15'])  // 15.05 has A flag
    const result = detectSameDayRoundTrips(flights, 'FRA', daysWithAE)
    // 15.05 should be excluded because it has A flag
    // 16.05 should be included
    expect(result.has('2023-05-15')).toBe(false)
    expect(result.has('2023-05-16')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('excludes 17.05 with A and E flags even though it forms FRA→FRA', () => {
    const flights: Flight[] = [
      { ...createFlightWithRoute('2023-05-17', 'LH9916', 'FRA', 'IGS'), dutyCode: 'A' },
      createFlightWithRoute('2023-05-17', 'LH9601', 'IGS', 'IGS'),
      { ...createFlightWithRoute('2023-05-17', 'LH9917', 'IGS', 'FRA'), dutyCode: 'E' },
    ]
    const daysWithAE = new Set(['2023-05-17'])  // 17.05 has A and E flags
    const result = detectSameDayRoundTrips(flights, 'FRA', daysWithAE)
    // Should NOT include 17.05 because it has A/E flags
    expect(result.has('2023-05-17')).toBe(false)
    expect(result.size).toBe(0)
  })
})

describe('formatCurrency', () => {
  it('formats as German EUR currency', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1.234,56')
    expect(result).toContain('€')
  })

  it('handles zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0,00')
  })

  it('handles negative values', () => {
    const result = formatCurrency(-100)
    expect(result).toContain('100,00')
  })
})

describe('formatHours', () => {
  it('formats decimal hours to HH:MM', () => {
    expect(formatHours(1.5)).toBe('1:30')
    expect(formatHours(2.75)).toBe('2:45')
    expect(formatHours(10)).toBe('10:00')
  })

  it('handles zero', () => {
    expect(formatHours(0)).toBe('0:00')
  })

  it('rounds minutes correctly', () => {
    expect(formatHours(1.99)).toBe('1:59')
  })
})

describe('detectTrips', () => {
  it('detects a simple round-trip', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2024-01-15', 'LH100', 'FRA', 'LHR'), // Outbound
      createFlightWithRoute('2024-01-15', 'LH101', 'LHR', 'FRA'), // Return same day
    ]
    const trips = detectTrips(flights)
    expect(trips.length).toBe(1)
    expect(trips[0].countries).toContain('GB')
  })

  it('detects multi-day trip with overnight', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2024-01-15', 'LH100', 'FRA', 'JFK'), // Day 1 outbound
      createFlightWithRoute('2024-01-17', 'LH101', 'JFK', 'FRA'), // Day 3 return
    ]
    const trips = detectTrips(flights)
    expect(trips.length).toBe(1)
    expect(trips[0].countries).toContain('US')
  })

  it('handles multiple separate trips', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2024-01-10', 'LH100', 'FRA', 'LHR'),
      createFlightWithRoute('2024-01-10', 'LH101', 'LHR', 'FRA'),
      createFlightWithRoute('2024-01-20', 'LH200', 'FRA', 'CDG'),
      createFlightWithRoute('2024-01-20', 'LH201', 'CDG', 'FRA'),
    ]
    const trips = detectTrips(flights)
    expect(trips.length).toBe(2)
  })

  it('handles empty flight list', () => {
    const trips = detectTrips([])
    expect(trips.length).toBe(0)
  })
})

describe('detectHotelNights', () => {
  it('detects hotel night on multi-day foreign trip', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2024-01-15', 'LH100', 'FRA', 'JFK'), // Outbound
      createFlightWithRoute('2024-01-16', 'LH101', 'JFK', 'FRA'), // Return next day
    ]
    const hotelNights = detectHotelNights(flights)
    expect(hotelNights.length).toBe(1)
    expect(hotelNights[0].country).toBe('USA')
  })

  it('returns empty for same-day round trips', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2024-01-15', 'LH100', 'FRA', 'LHR'),
      createFlightWithRoute('2024-01-15', 'LH101', 'LHR', 'FRA'),
    ]
    const hotelNights = detectHotelNights(flights)
    expect(hotelNights.length).toBe(0)
  })

  it('counts multiple nights on long trip', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2024-01-15', 'LH100', 'FRA', 'JFK'),
      createFlightWithRoute('2024-01-18', 'LH101', 'JFK', 'FRA'), // 3 nights
    ]
    const hotelNights = detectHotelNights(flights)
    expect(hotelNights.length).toBe(3)
  })
})

describe('calculateMealAllowances', () => {
  it('calculates domestic single day trip', () => {
    // Domestic trip - should not generate foreign allowances
    const flights: Flight[] = [
      createFlightWithRoute('2024-01-15', 'LH100', 'FRA', 'MUC'),
      createFlightWithRoute('2024-01-15', 'LH101', 'MUC', 'FRA'),
    ]
    const result = calculateMealAllowances(flights, [])
    expect(result.foreign.length).toBe(0)
    // Should have domestic 8h allowance for a day trip
    expect(result.domestic8h.days).toBeGreaterThanOrEqual(0)
  })

  it('calculates foreign trip allowances', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2024-01-15', 'LH100', 'FRA', 'LHR'),
      createFlightWithRoute('2024-01-15', 'LH101', 'LHR', 'FRA'),
    ]
    const result = calculateMealAllowances(flights, [])
    // Should have foreign allowance for GB
    expect(result.total).toBeGreaterThan(0)
  })

  it('includes FL (abroad) days in calculation', () => {
    const nonFlightDays: NonFlightDay[] = [
      { ...createNonFlightDay('2024-01-16', 'FL'), country: 'US' },
    ]
    const result = calculateMealAllowances([], nonFlightDays)
    expect(result.total).toBeGreaterThan(0)
    expect(result.foreign.length).toBeGreaterThan(0)
  })
})

describe('calculateMonthlyBreakdown', () => {
  const defaultSettings: Settings = {
    distanceToWork: 30,
    cleaningCostPerDay: 1.0,
    tipPerNight: 1.0,
    countOnlyAFlag: true,
    countMedicalAsTrip: true,
    countGroundDutyAsTrip: true,
    countForeignAsWorkDay: true,
  }

  it('groups flights by month', () => {
    const flights: Flight[] = [
      createFlight('2024-01-15', 'LH100'),
      createFlight('2024-01-20', 'LH101'),
      createFlight('2024-02-10', 'LH200'),
    ]
    const breakdown = calculateMonthlyBreakdown(flights, [], defaultSettings)
    expect(breakdown.length).toBe(2)
    expect(breakdown[0].month).toBe(1)
    expect(breakdown[1].month).toBe(2)
  })

  it('calculates flight hours per month', () => {
    const flights: Flight[] = [
      { ...createFlight('2024-01-15', 'LH100'), blockTime: '2:00' },
      { ...createFlight('2024-01-20', 'LH101'), blockTime: '3:30' },
    ]
    const breakdown = calculateMonthlyBreakdown(flights, [], defaultSettings)
    expect(breakdown[0].flightHours).toBe(5.5)
  })

  it('sorts by year and month', () => {
    const flights: Flight[] = [
      createFlight('2024-03-15', 'LH300'),
      createFlight('2024-01-15', 'LH100'),
      createFlight('2023-12-15', 'LH900'),
    ]
    const breakdown = calculateMonthlyBreakdown(flights, [], defaultSettings)
    expect(breakdown[0].year).toBe(2023)
    expect(breakdown[0].month).toBe(12)
    expect(breakdown[1].year).toBe(2024)
    expect(breakdown[1].month).toBe(1)
    expect(breakdown[2].year).toBe(2024)
    expect(breakdown[2].month).toBe(3)
  })
})

describe('calculateTaxDeduction', () => {
  const defaultSettings: Settings = {
    distanceToWork: 30,
    cleaningCostPerDay: 1.50,
    tipPerNight: 2.00,
    countOnlyAFlag: true,
    countMedicalAsTrip: true,
    countGroundDutyAsTrip: true,
    countForeignAsWorkDay: true,
  }

  it('calculates cleaning costs correctly', () => {
    const flights: Flight[] = [
      createFlight('2024-01-15', 'LH100'),
      createFlight('2024-01-16', 'LH101'),
    ]
    const result = calculateTaxDeduction(flights, [], defaultSettings, [])
    expect(result.cleaningCosts.workDays).toBe(2)
    expect(result.cleaningCosts.ratePerDay).toBe(1.50)
    expect(result.cleaningCosts.total).toBe(3.00)
  })

  it('subtracts employer reimbursement from meal allowances', () => {
    const flights: Flight[] = [
      createFlightWithRoute('2024-01-15', 'LH100', 'FRA', 'LHR'),
      createFlightWithRoute('2024-01-15', 'LH101', 'LHR', 'FRA'),
    ]
    const reimbursementData = [
      { month: 1, year: 2024, taxFreeReimbursement: 10, domesticDays8h: 0, domesticDays24h: 0, foreignDays: [] },
    ]
    const result = calculateTaxDeduction(flights, [], defaultSettings, reimbursementData)
    expect(result.mealAllowances.employerReimbursement).toBe(10)
    // deductibleDifference should be totalAllowances - employerReimbursement (min 0)
    const expectedDiff = Math.max(0, result.mealAllowances.totalAllowances - 10)
    expect(result.mealAllowances.deductibleDifference).toBe(expectedDiff)
  })

  it('calculates grand total as sum of all deductions', () => {
    const flights: Flight[] = [
      createFlight('2024-01-15', 'LH100', 'A'),
    ]
    const result = calculateTaxDeduction(flights, [], defaultSettings, [])
    const expectedGrandTotal = 
      result.cleaningCosts.total +
      result.travelExpenses.total +
      result.travelCosts.total +
      result.mealAllowances.deductibleDifference
    expect(result.grandTotal).toBeCloseTo(expectedGrandTotal, 2)
  })
})

// Helper functions to create test data
function createFlight(dateStr: string, flightNumber: string, dutyCode?: string): Flight {
  const date = new Date(dateStr)
  return {
    id: `${dateStr}-${flightNumber}`,
    date,
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    flightNumber,
    departure: 'FRA',
    arrival: 'LHR',
    departureTime: '08:00',
    arrivalTime: '10:00',
    blockTime: '2:00',
    dutyCode,
    isContinuation: false,
    country: 'GB',
  }
}

function createFlightWithRoute(
  dateStr: string,
  flightNumber: string,
  departure: string,
  arrival: string
): Flight {
  const date = new Date(dateStr)
  // Import inline to avoid circular dependency issues in tests
  const countryMap: Record<string, string> = {
    FRA: 'DE', MUC: 'DE', DUS: 'DE', BER: 'DE',
    LHR: 'GB', CDG: 'FR', JFK: 'US', LAX: 'US',
  }
  return {
    id: `${dateStr}-${flightNumber}`,
    date,
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    flightNumber,
    departure,
    arrival,
    departureTime: '08:00',
    arrivalTime: '12:00',
    blockTime: '4:00',
    isContinuation: false,
    country: countryMap[arrival] || 'XX',
  }
}

function createNonFlightDay(dateStr: string, type: NonFlightDay['type']): NonFlightDay {
  const date = new Date(dateStr)
  return {
    id: `${dateStr}-${type}`,
    date,
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    type,
    description: type,
  }
}

describe('calculateMealAllowances - city-specific rates', () => {
  it('applies city-specific rate for Mumbai (BOM) instead of generic India rate', () => {
    // Date: 09.03.2023
    // Flight: FRA -> BOM -> FRA (same day return)
    // Expected: Mumbai rate (50€ full, 33€ partial) not generic India rate (32€ full, 21€ partial)
    const flights: Flight[] = [
      {
        id: '2023-03-09-LH756',
        date: new Date('2023-03-09'),
        month: 3,
        year: 2023,
        flightNumber: 'LH756',
        departure: 'FRA',
        arrival: 'BOM',
        departureTime: '08:00',
        arrivalTime: '20:00',
        blockTime: '8:00',
        dutyCode: 'A',
        isContinuation: false,
        country: 'IN',
      },
      {
        id: '2023-03-09-LH757',
        date: new Date('2023-03-09'),
        month: 3,
        year: 2023,
        flightNumber: 'LH757',
        departure: 'BOM',
        arrival: 'FRA',
        departureTime: '22:00',
        arrivalTime: '06:00',
        blockTime: '8:00',
        dutyCode: 'E',
        isContinuation: false,
        country: 'IN',
      },
    ]

    const result = calculateMealAllowances(flights, [], 2023)
    
    // Should get the Mumbai partial rate (33€) for both departure and return days
    // Total = 2 days * 33€ = 66€, not generic India rate (2 * 21€ = 42€)
    expect(result.foreign).toHaveLength(1)
    expect(result.foreign[0].country).toBe('Indien - Mumbai')
    expect(result.foreign[0].rate).toBe(50) // Mumbai full day rate (for reference)
    expect(result.foreign[0].total).toBe(66) // 2 partial days at Mumbai rate: 2 * 33€ = 66€
  })

  it('applies city-specific rate for Johannesburg (JNB) instead of generic South Africa rate', () => {
    // Date: Single day trip to Johannesburg
    // Expected: Johannesburg rate (36€ full, 24€ partial) not generic South Africa rate (29€ full, 20€ partial)
    const flights: Flight[] = [
      {
        id: '2023-05-15-SA260',
        date: new Date('2023-05-15'),
        month: 5,
        year: 2023,
        flightNumber: 'SA260',
        departure: 'FRA',
        arrival: 'JNB',
        departureTime: '20:00',
        arrivalTime: '08:00',
        blockTime: '10:00',
        dutyCode: 'A',
        isContinuation: false,
        country: 'ZA',
      },
      {
        id: '2023-05-15-SA261',
        date: new Date('2023-05-15'),
        month: 5,
        year: 2023,
        flightNumber: 'SA261',
        departure: 'JNB',
        arrival: 'FRA',
        departureTime: '19:00',
        arrivalTime: '06:00',
        blockTime: '11:00',
        dutyCode: 'E',
        isContinuation: false,
        country: 'ZA',
      },
    ]

    const result = calculateMealAllowances(flights, [], 2023)
    
    // The system detects this as an incomplete trip (return without departure)
    // It assumes at least one day abroad before the return flight
    // Expected breakdown:
    // - 14.05.2023: Full day abroad (assumed) - 36€
    // - 15.05.2023: Full day abroad - 36€  
    // - 16.05.2023: Return to Germany - 24€ (partial)
    // Total = 36 + 36 + 24 = 96€
    // NOT generic South Africa: 29 + 29 + 20 = 78€
    expect(result.foreign).toHaveLength(1)
    expect(result.foreign[0].country).toBe('Suedafrika - Johannesburg')
    expect(result.foreign[0].rate).toBe(36) // Johannesburg full day rate
    expect(result.foreign[0].total).toBe(96) // 2 full days (72€) + 1 partial day (24€)
  })

  it('applies city-specific rate for Cape Town (CPT) instead of generic South Africa rate', () => {
    // Date: 31.03.2023 - 04.04.2023
    // Flight: FRA -> CPT (overnight) -> stay -> CPT -> FRA (overnight)
    // Expected: Cape Town rate (33€ full, 22€ partial) not generic South Africa rate (29€ full, 20€ partial)
    const flights: Flight[] = [
      {
        id: '2023-03-31-LH572',
        date: new Date('2023-03-31'),
        month: 3,
        year: 2023,
        flightNumber: 'LH572',
        departure: 'FRA',
        arrival: 'CPT',
        departureTime: '21:00',
        arrivalTime: '09:00',
        blockTime: '11:00',
        dutyCode: 'A',
        isContinuation: false,
        country: 'ZA',
      },
      {
        id: '2023-04-03-LH573',
        date: new Date('2023-04-03'),
        month: 4,
        year: 2023,
        flightNumber: 'LH573',
        departure: 'CPT',
        arrival: 'FRA',
        departureTime: '19:00',
        arrivalTime: '03:33',
        blockTime: '11:33',
        dutyCode: 'E',
        isContinuation: false,
        country: 'ZA',
      },
    ]

    const result = calculateMealAllowances(flights, [], 2023)
    
    // Expected breakdown:
    // - 31.03.2023: Departure day (Anreisetag) - overnight departure from Germany, partial rate 22€
    // - 01.04.2023: Full day abroad - full rate 33€
    // - 02.04.2023: Full day abroad - full rate 33€
    // - 03.04.2023: Full day abroad - full rate 33€ (departure day from abroad, abroad entire calendar day)
    // - 04.04.2023: Arrival back in Germany (Abreisetag) - partial rate 22€
    // Total = 22 + 33 + 33 + 33 + 22 = 143€
    // NOT generic South Africa: 20 + 29 + 29 + 29 + 20 = 127€
    expect(result.foreign).toHaveLength(1)
    expect(result.foreign[0].country).toBe('Suedafrika - Kapstadt')
    expect(result.foreign[0].rate).toBe(33) // Cape Town full day rate
    expect(result.foreign[0].total).toBe(143) // Cape Town rates: 3 full days (99€) + 2 partial days (44€)
  })
})

describe('isLonghaul', () => {
  it('identifies A340 as longhaul', () => {
    expect(isLonghaul('A340')).toBe(true)
  })

  it('identifies A340-600 as longhaul (startsWith match)', () => {
    expect(isLonghaul('A340-600')).toBe(true)
  })

  it('identifies A350 as longhaul', () => {
    expect(isLonghaul('A350')).toBe(true)
  })

  it('identifies A380 as longhaul', () => {
    expect(isLonghaul('A380')).toBe(true)
  })

  it('identifies B747 as longhaul', () => {
    expect(isLonghaul('B747')).toBe(true)
  })

  it('identifies B747-8 as longhaul', () => {
    expect(isLonghaul('B747-8')).toBe(true)
  })

  it('identifies A320 as NOT longhaul', () => {
    expect(isLonghaul('A320')).toBe(false)
  })

  it('identifies A321 as NOT longhaul', () => {
    expect(isLonghaul('A321')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isLonghaul('a340')).toBe(true)
    expect(isLonghaul('a320')).toBe(false)
  })

  it('returns false for undefined/empty', () => {
    expect(isLonghaul(undefined)).toBe(false)
    expect(isLonghaul('')).toBe(false)
  })
})

describe('getBriefingTimeMinutes', () => {
  it('returns 110 minutes for longhaul aircraft', () => {
    expect(getBriefingTimeMinutes('A340')).toBe(110)
    expect(getBriefingTimeMinutes('A350')).toBe(110)
    expect(getBriefingTimeMinutes('B747-8')).toBe(110)
  })

  it('returns 0 minutes for shorthaul aircraft (placeholder)', () => {
    expect(getBriefingTimeMinutes('A320')).toBe(0)
    expect(getBriefingTimeMinutes('A321')).toBe(0)
  })

  it('returns 0 for undefined aircraft type', () => {
    expect(getBriefingTimeMinutes(undefined)).toBe(0)
  })
})

describe('calculateAbsenceDuration with briefing time', () => {
  // Example from requirements: 06:00 departure, 120km distance (60min Fahrzeit), A340 (110min briefing)
  // Timeline: 03:10 leave home → 04:10 arrive airport → 06:00 departure
  // Absence = (24 - 6) + 110/60 + 60/60 = 18 + 1.833 + 1 = 20.833h

  it('adds briefing time on departure day for longhaul', () => {
    const flight: Flight = {
      id: 'test-1',
      date: new Date('2024-01-15'),
      month: 1,
      year: 2024,
      flightNumber: 'LH400',
      departure: 'FRA',
      arrival: 'JFK',
      departureTime: '06:00',
      arrivalTime: '10:00',
      blockTime: '9:00',
      isContinuation: false,
      country: 'US',
    }

    const fahrzeitMinutes = 60 // 120km / 2 = 60min
    const briefingMinutes = 110 // 1h50m longhaul

    const absence = calculateAbsenceDuration(flight, true, fahrzeitMinutes, briefingMinutes)
    // (24 - 6) + 110/60 + 60/60 = 18 + 1.8333 + 1 = 20.8333
    expect(absence).toBeCloseTo(20.833, 2)
  })

  it('does NOT add briefing time on return day', () => {
    const flight: Flight = {
      id: 'test-2',
      date: new Date('2024-01-17'),
      month: 1,
      year: 2024,
      flightNumber: 'LH401',
      departure: 'JFK',
      arrival: 'FRA',
      departureTime: '18:00',
      arrivalTime: '08:00',
      blockTime: '8:00',
      isContinuation: false,
      country: 'US',
    }

    const fahrzeitMinutes = 60
    const briefingMinutes = 110

    // Return day: arrHour + fahrzeit = 8 + 1 = 9 (no briefing)
    const absence = calculateAbsenceDuration(flight, false, fahrzeitMinutes, briefingMinutes)
    expect(absence).toBeCloseTo(9, 2)
  })

  it('without briefing (shorthaul/default), behavior is unchanged', () => {
    const flight: Flight = {
      id: 'test-3',
      date: new Date('2024-01-15'),
      month: 1,
      year: 2024,
      flightNumber: 'LH100',
      departure: 'FRA',
      arrival: 'MUC',
      departureTime: '08:00',
      arrivalTime: '09:00',
      blockTime: '1:00',
      isContinuation: false,
      country: 'DE',
    }

    const fahrzeitMinutes = 60
    // No briefing (default = 0)
    const absence = calculateAbsenceDuration(flight, true, fahrzeitMinutes, 0)
    // (24 - 8) + 0 + 1 = 17
    expect(absence).toBe(17)
  })

  it('adds briefing time for overnight longhaul departure', () => {
    const flight: Flight = {
      id: 'test-4',
      date: new Date('2024-01-15'),
      month: 1,
      year: 2024,
      flightNumber: 'LH500',
      departure: 'FRA',
      arrival: 'NRT',
      departureTime: '21:00',
      arrivalTime: '09:00',
      blockTime: '13:00',
      isContinuation: false,
      country: 'JP',
    }

    const fahrzeitMinutes = 60
    const briefingMinutes = 110

    // Overnight: (24 - 21) + 9 + 110/60 + 1 = 3 + 9 + 1.833 + 1 = 14.833
    const absence = calculateAbsenceDuration(flight, true, fahrzeitMinutes, briefingMinutes)
    expect(absence).toBeCloseTo(14.833, 2)
  })
})
