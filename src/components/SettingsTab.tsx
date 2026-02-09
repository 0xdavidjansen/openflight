import { useCallback, useMemo } from 'react';
import { useApp } from '../hooks';
import { Car, Sparkles, Coffee, Info, User, Calendar, Hash, Building, Plane, Clock } from 'lucide-react';
import { distanceToFahrzeitMinutes } from '../utils/calculations';

export function SettingsTab() {
  const { state, updateSettings } = useApp();
  const { settings, personalInfo, flights } = state;

  // Calculate final homebase for display
  const detectedHomebase = useMemo(() => {
    return personalInfo?.detectedHomebase ?? 'Unknown';
  }, [personalInfo?.detectedHomebase]);

  // Get year range - memoized
  const yearRange = useMemo(() => {
    const years = [...new Set(flights.map((f) => f.year))].sort();
    if (years.length === 0) return 'N/A';
    if (years.length === 1) return years[0].toString();
    return `${years[0]} - ${years[years.length - 1]}`;
  }, [flights]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSettings({ distanceToWork: parseFloat(e.target.value) || 0 });
    },
    [updateSettings]
  );

  const handleCountOnlyAFlagChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSettings({ countOnlyAFlag: e.target.checked });
    },
    [updateSettings]
  );

  const handleCountGroundDutyAsTripChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSettings({ countGroundDutyAsTrip: e.target.checked });
    },
    [updateSettings]
  );

  const handleCleaningCostChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSettings({ cleaningCostPerDay: parseFloat(e.target.value) || 0 });
    },
    [updateSettings]
  );

  const handleTipChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSettings({ tipPerNight: parseFloat(e.target.value) || 0 });
    },
    [updateSettings]
  );

  const handleFahrzeitOverrideChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '') {
        // Clear override to use calculated value
        updateSettings({ fahrzeitMinutesOverride: undefined });
      } else {
        updateSettings({ fahrzeitMinutesOverride: parseFloat(value) || 0 });
      }
    },
    [updateSettings]
  );

  const handleHomebaseOverrideChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value === '') {
        updateSettings({ homebaseOverride: null });
      } else {
        updateSettings({ homebaseOverride: value as 'MUC' | 'FRA' });
      }
    },
    [updateSettings]
  );

  // Calculate displayed Fahrzeit (use override if present, otherwise calculate from distance)
  const displayedFahrzeitMinutes = useMemo(() => {
    if (settings.fahrzeitMinutesOverride !== undefined && settings.fahrzeitMinutesOverride >= 0) {
      return settings.fahrzeitMinutesOverride;
    }
    return distanceToFahrzeitMinutes(settings.distanceToWork);
  }, [settings.distanceToWork, settings.fahrzeitMinutesOverride]);

  // Format Fahrzeit for display (e.g., "30 Min" or "1h 15min")
  const formatFahrzeit = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) {
      return `${mins} Min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins} Min`;
    }
  }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left Column: Settings */}
      <div className="space-y-6">
        {/* Distance Settings */}
      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">
              Entfernungspauschale
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Fahrten zwischen Wohnung und erster Tätigkeitsstätte
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Distance Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Einfache Entfernung zum Arbeitsplatz (km)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                value={settings.distanceToWork}
                onChange={handleDistanceChange}
                className="w-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              />
              <span className="text-slate-500 dark:text-slate-400">km</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              2021: €0,30/km bis 20 km, €0,35/km ab km 21 · 2022–2025: €0,30/km bis 20 km, €0,38/km ab km 21
            </p>
          </div>

          {/* Fahrzeit Display and Override */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Berechnete Fahrzeit (eine Richtung): {formatFahrzeit(displayedFahrzeitMinutes)}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Formel: 1h pro 120km {settings.fahrzeitMinutesOverride !== undefined && '(überschrieben)'}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                Fahrzeit manuell setzen (optional):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.fahrzeitMinutesOverride ?? ''}
                  onChange={handleFahrzeitOverrideChange}
                  placeholder="Automatisch"
                  className="w-24 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">Minuten (leer = automatisch)</span>
              </div>
            </div>
          </div>

          {/* Trip Counting Options */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Welche Tage als Fahrten zählen:
            </p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.countOnlyAFlag}
                onChange={handleCountOnlyAFlagChange}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-slate-700 dark:text-slate-200">
                  Hin und Rückweg zählen
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hin- und Rückfahrten werden jeweils als Fahrt gezählt
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.countGroundDutyAsTrip}
                onChange={handleCountGroundDutyAsTripChange}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-slate-700 dark:text-slate-200">
                  Bodendienst als Fahrt zählen
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  EM, DP, DT, SI, TK, SB = Hin- und Rückfahrt (RE nie)
                </p>
              </div>
            </label>

          </div>
        </div>
      </section>

      {/* Cleaning Costs */}
      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Sparkles className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">
              Reinigungskosten
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kosten für Reinigung der Berufskleidung
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            Kosten pro Arbeitstag
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.10"
              value={settings.cleaningCostPerDay}
              onChange={handleCleaningCostChange}
              className="w-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
            />
            <span className="text-slate-500 dark:text-slate-400">€ / Tag</span>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Coffee className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">
              Trinkgeld (Reisenebenkosten)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Trinkgeld für Hotelpersonal bei Übernachtungen
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            Trinkgeld pro Übernachtung
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.50"
              value={settings.tipPerNight}
              onChange={handleTipChange}
              className="w-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
            />
            <span className="text-slate-500 dark:text-slate-400">€ / Nacht</span>
          </div>
        </div>
      </section>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                Hinweis zur Steuererklärung
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Die berechneten Werte dienen als Orientierung. Die endgültigen
                Beträge sollten Sie mit Ihrem Steuerberater abstimmen. Die
                Pauschalen können je nach Finanzamt variieren.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Personal Info */}
      <div>
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 sticky top-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Persönliche Daten
          </h3>
          
          {personalInfo ? (
            <div className="space-y-4">
              {personalInfo.name && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {personalInfo.name}
                    </p>
                  </div>
                </div>
              )}
              {personalInfo.personnelNumber && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Personalnummer</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {personalInfo.personnelNumber}
                    </p>
                  </div>
                </div>
              )}
              {personalInfo.pkNumber && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">PK-Nummer</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {personalInfo.pkNumber}
                    </p>
                  </div>
                </div>
              )}
              {personalInfo.company && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Gesellschaft</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {personalInfo.company}
                    </p>
                  </div>
                </div>
              )}
              {personalInfo.dutyStation && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Dienststelle</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {personalInfo.dutyStation}
                    </p>
                  </div>
                </div>
              )}
              {personalInfo.role && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Funktion</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {personalInfo.role}
                    </p>
                  </div>
                </div>
              )}
              {personalInfo.aircraftType && (
                <div className="flex items-center gap-3">
                  <Plane className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Muster</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {personalInfo.aircraftType}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Homebase Override Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <Plane className="w-4 h-4 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Homebase</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      Automatisch erkannt: {detectedHomebase === 'Unknown' ? 'Unbekannt' : detectedHomebase}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Homebase überschreiben (optional):
                  </label>
                  <select
                    value={settings.homebaseOverride ?? ''}
                    onChange={handleHomebaseOverrideChange}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="">Automatisch</option>
                    <option value="MUC">MUC (München)</option>
                    <option value="FRA">FRA (Frankfurt)</option>
                  </select>
                </div>
              </div>

              {personalInfo.costCenter && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Kostenstelle</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {personalInfo.costCenter}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Zeitraum</p>
                  <p className="font-medium text-slate-800 dark:text-white">{yearRange}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 italic">
              Keine persönlichen Daten verfügbar. Laden Sie eine Flugstundenübersicht hoch.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
