// Re-export all hooks from contexts
// This separation helps with React Fast Refresh which requires
// files to export only components OR only hooks, not both

// Main combined hook
export { useApp } from '../context/AppContext';

// Individual context hooks for optimized subscriptions
export { useSettings } from '../context/SettingsContext';
export { useFlightData } from '../context/FlightDataContext';
export { useUI } from '../context/UIContext';
