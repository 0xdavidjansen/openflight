import { useMemo } from 'react';
import { useApp } from '../hooks';
import { User, Calendar, Hash, Building, Plane } from 'lucide-react';

export function InfoTab() {
  const { state } = useApp();
  const { personalInfo, flights, settings } = state;

  // Calculate final homebase (override takes precedence over detected)
  const finalHomebase = useMemo(() => {
    return settings.homebaseOverride ?? personalInfo?.detectedHomebase ?? 'Unknown';
  }, [settings.homebaseOverride, personalInfo?.detectedHomebase]);

  // Get year range - memoized
  const yearRange = useMemo(() => {
    const years = [...new Set(flights.map((f) => f.year))].sort();
    if (years.length === 0) return 'N/A';
    if (years.length === 1) return years[0].toString();
    return `${years[0]} - ${years[years.length - 1]}`;
  }, [flights]);

  return (
    <div className="space-y-6">
      {/* Personal Info Card */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
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
                <div className="flex items-center gap-3">
                  <Plane className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Homebase
                      {settings.homebaseOverride && (
                        <span className="ml-1 text-amber-500">(manuell)</span>
                      )}
                    </p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {finalHomebase === 'Unknown' ? 'Unbekannt' : finalHomebase}
                    </p>
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
                {personalInfo.documentDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Erstellt am</p>
                      <p className="font-medium text-slate-800 dark:text-white">
                        {personalInfo.documentDate}
                      </p>
                    </div>
                  </div>
                )}
                {personalInfo.sheetNumber && (
                  <div className="flex items-center gap-3">
                    <Hash className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Blatt</p>
                      <p className="font-medium text-slate-800 dark:text-white">
                        {personalInfo.sheetNumber}
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
  );
}
