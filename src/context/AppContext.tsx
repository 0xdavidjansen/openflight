import React, { createContext, useContext, useMemo, useCallback, useDeferredValue } from 'react';
import type {
  AppState,
  TabType,
  Settings,
  MonthlyBreakdown,
  TaxCalculation,
  DailyAllowanceInfo,
} from '../types';
import { FlightDataProvider, useFlightData } from './FlightDataContext';
import { SettingsProvider, useSettings } from './SettingsContext';
import { UIProvider, useUI } from './UIContext';
import {
  parseFlugstundenPDF,
  parseStreckeneinsatzPDF,
  detectDocumentType,
  checkDuplicateFile,
  checkMissingMonths,
} from '../utils/pdfParser';
import {
  calculateMonthlyBreakdown,
  calculateTaxDeduction,
  calculateDailyAllowances,
  getFahrzeitMinutes,
  detectHomebase,
  resolveHomebase,
} from '../utils/calculations';

// Combined context that provides backward-compatible API
interface AppContextType {
  state: AppState;
  // Actions
  setTab: (tab: TabType) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  uploadFile: (file: File) => Promise<void>;
  removeFile: (fileId: string) => void;
  dismissWarning: (warningId: string) => void;
  clearAllData: () => void;
  // Computed values
  monthlyBreakdown: MonthlyBreakdown[];
  taxCalculation: TaxCalculation;
  dailyAllowances: Map<string, DailyAllowanceInfo>;
    totalFlightHours: number;
    totalWorkDays: number;
  }


const AppContext = createContext<AppContextType | null>(null);

// Inner provider that has access to all the split contexts
function AppContextInner({ children }: { children: React.ReactNode }) {
  const {
    state: flightState,
    setLoading,
    setError,
    setPersonalInfo,
    addFlights,
    addNonFlightDays,
    addReimbursementData,
    addUploadedFile,
    storeBlobUrl,
    addWarnings,
    dismissWarning,
    clearAllData: clearFlightData,
    removeFile,
  } = useFlightData();

  const { settings, updateSettings } = useSettings();
  const { activeTab, setTab } = useUI();

  // Combine state for backward compatibility
  const state: AppState = useMemo(
    () => ({
      personalInfo: flightState.personalInfo,
      flights: flightState.flights,
      nonFlightDays: flightState.nonFlightDays,
      reimbursementData: flightState.reimbursementData,
      uploadedFiles: flightState.uploadedFiles,
      settings,
      warnings: flightState.warnings,
      activeTab,
      isLoading: flightState.isLoading,
      error: flightState.error,
    }),
    [flightState, settings, activeTab]
  );

  // Upload file handler
  const uploadFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);

      try {
        const docType = await detectDocumentType(file);
        console.log('[DEBUG] File type detected:', { filename: file.name, docType });

        // Store blob URL for opening file later
        const blobUrl = URL.createObjectURL(file);
        storeBlobUrl(file.name, blobUrl);

        if (docType === 'unknown') {
          console.log('[DEBUG] Storing as unknown file:', file.name);
          // Store unknown files without parsing (no warning needed)
          addUploadedFile({
            id: `${Date.now()}-${Math.random()}`,
            name: file.name,
            type: 'unknown',
            uploadedAt: new Date(),
          });
        } else if (docType === 'flugstunden') {
          const result = await parseFlugstundenPDF(file);

          // Check for duplicates
          const duplicateWarning = checkDuplicateFile(result.fileInfo, flightState.uploadedFiles);
          if (duplicateWarning) {
            addWarnings([duplicateWarning]);
          }

          if (result.personalInfo) {
            setPersonalInfo(result.personalInfo);
          }
          addFlights(result.flights);
          addNonFlightDays(result.nonFlightDays);
          addUploadedFile(result.fileInfo);
          addWarnings(result.warnings);
        } else if (docType === 'streckeneinsatz') {
          const result = await parseStreckeneinsatzPDF(file);

          const duplicateWarning = checkDuplicateFile(result.fileInfo, flightState.uploadedFiles);
          if (duplicateWarning) {
            addWarnings([duplicateWarning]);
          }

          addReimbursementData(result.reimbursementData);
          addUploadedFile(result.fileInfo);
        }

        // Check for missing months
        const missingWarnings = checkMissingMonths([
          ...flightState.uploadedFiles,
          { id: '', name: file.name, type: docType, uploadedAt: new Date() },
        ]);
        addWarnings(missingWarnings);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Fehler beim Verarbeiten der Datei');
      } finally {
        setLoading(false);
      }
    },
    [
      flightState.uploadedFiles,
      setLoading,
      setError,
      setPersonalInfo,
      addFlights,
      addNonFlightDays,
      addReimbursementData,
      addUploadedFile,
      storeBlobUrl,
      addWarnings,
    ]
  );

  const clearAllData = useCallback(() => {
    clearFlightData();
  }, [clearFlightData]);

  // Computed values with deferred updates for performance
  const deferredFlights = useDeferredValue(flightState.flights);
  const deferredNonFlightDays = useDeferredValue(flightState.nonFlightDays);
  const deferredSettings = useDeferredValue(settings);
  const deferredReimbursementData = useDeferredValue(flightState.reimbursementData);
  const deferredAircraftType = useDeferredValue(flightState.personalInfo?.aircraftType);
  const deferredRole = useDeferredValue(flightState.personalInfo?.role);

  // Detect homebase from flight patterns (fresh calculation, not deferred)
  const detectedHomebaseValue = useMemo(
    () => detectHomebase(deferredFlights),
    [deferredFlights]
  );

  // Update personalInfo with detected homebase when it changes
  React.useEffect(() => {
    if (flightState.personalInfo && detectedHomebaseValue !== flightState.personalInfo.detectedHomebase) {
      setPersonalInfo({
        ...flightState.personalInfo,
        detectedHomebase: detectedHomebaseValue,
      });
    }
  }, [detectedHomebaseValue, flightState.personalInfo, setPersonalInfo]);

  // Resolve effective homebase using priority order:
  // 1. Parsed from PDF, 2. Auto-detected, 3. Unknown
  const effectiveHomebase = useMemo(
    () => resolveHomebase(flightState.personalInfo, detectedHomebaseValue),
    [flightState.personalInfo, detectedHomebaseValue]
  );

  const monthlyBreakdown = useMemo(
    () => calculateMonthlyBreakdown(
      deferredFlights, 
      deferredNonFlightDays, 
      deferredSettings, 
      deferredReimbursementData, 
      deferredAircraftType,
      effectiveHomebase,  // Use resolved homebase (parsed > detected)
      deferredRole
    ),
    [deferredFlights, deferredNonFlightDays, deferredSettings, deferredReimbursementData, deferredAircraftType, effectiveHomebase, deferredRole]
  );

  const taxCalculation = useMemo(
    () =>
      calculateTaxDeduction(
        deferredFlights,
        deferredNonFlightDays,
        deferredSettings,
        deferredReimbursementData,
        deferredAircraftType,
        effectiveHomebase,  // Use resolved homebase (parsed > detected)
        deferredRole
      ),
    [deferredFlights, deferredNonFlightDays, deferredSettings, deferredReimbursementData, deferredAircraftType, effectiveHomebase, deferredRole]
  );

  // Calculate daily allowances for display in flight table
  const dailyAllowances = useMemo(() => {
    const sortedFlights = [...deferredFlights].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.departureTime.localeCompare(b.departureTime);
    });
    const fahrzeitMinutes = getFahrzeitMinutes(deferredSettings);
    return calculateDailyAllowances(sortedFlights, deferredNonFlightDays, 2025, fahrzeitMinutes, deferredAircraftType, deferredRole);
  }, [deferredFlights, deferredNonFlightDays, deferredSettings, deferredAircraftType, deferredRole]);

  // Reactively warn about months with flights but no AG-Erstattung
  // Debounced to wait for all files in a batch upload to finish processing
  React.useEffect(() => {
    if (flightState.isLoading) return;
    if (monthlyBreakdown.length === 0) return;

    const timer = setTimeout(() => {
      const missingReimbursementWarnings = monthlyBreakdown
        .filter((m) => m.workDays > 0 && m.employerReimbursement === 0)
        .map((m) => ({
          id: `missing-reimbursement-${m.year}-${m.month}`,
          type: 'missing_month' as const,
          severity: 'warning' as const,
          message: `AG-Erstattung für ${m.month}/${m.year} fehlt`,
          details: `Für diesen Monat wurden Flugdaten hochgeladen, aber keine Streckeneinsatzabrechnung (AG-Erstattung) gefunden. Bitte laden Sie die Streckeneinsatzabrechnung für ${m.month}/${m.year} hoch, um korrekte Berechnungen zu erhalten.`,
          dismissible: true,
        }));

      if (missingReimbursementWarnings.length > 0) {
        addWarnings(missingReimbursementWarnings);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [flightState.isLoading, monthlyBreakdown, addWarnings]);

  const totalFlightHours = useMemo(
    () => monthlyBreakdown.reduce((sum, m) => sum + m.flightHours, 0),
    [monthlyBreakdown]
  );

  const totalWorkDays = useMemo(
    () => monthlyBreakdown.reduce((sum, m) => sum + m.workDays, 0),
    [monthlyBreakdown]
  );

  const value: AppContextType = {
    state,
    setTab,
    updateSettings,
    uploadFile,
    removeFile,
    dismissWarning,
    clearAllData,
    monthlyBreakdown,
    taxCalculation,
    dailyAllowances,
    totalFlightHours,
    totalWorkDays,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Main provider that composes all contexts
export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <SettingsProvider>
        <FlightDataProvider>
          <AppContextInner>{children}</AppContextInner>
        </FlightDataProvider>
      </SettingsProvider>
    </UIProvider>
  );
}

// Hook to use the combined context
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}


