import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Settings } from '../types';

// Default settings
const DEFAULT_SETTINGS: Settings = {
  distanceToWork: 30,
  cleaningCostPerDay: 1.6,
  tipPerNight: 3.6,
  countOnlyAFlag: false,
  countMedicalAsTrip: true,
  countGroundDutyAsTrip: true,
  countForeignAsWorkDay: true,
};

const STORAGE_KEY = 'flugpersonal-settings';

// Load settings from localStorage
function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error);
  }
}

type SettingsAction = { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> };

function settingsReducer(state: Settings, action: SettingsAction): Settings {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, dispatch] = useReducer(settingsReducer, DEFAULT_SETTINGS, loadSettings);

  // Persist settings changes
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
