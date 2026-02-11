import { Info, Github, Calculator, Clock, Plane, MapPin } from 'lucide-react';

export function AboutTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Info className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Über diesen Rechner
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Wie Ihre Steuerdaten berechnet werden
          </p>
        </div>
      </div>

      {/* Calculation Explanation */}
      <div className="space-y-4">
        <section className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Calculator className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Arbeitstage & Fahrten
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Gezählt werden alle Kalendertage mit Flugtätigkeit plus optionale Bodendienste (SB, SI, etc.) und medizinische Tage (ME). 
                Fahrten zur Arbeit (A-Flag) oder alle Tage mit A/E-Flags, je nach Einstellung.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Abwesenheitsdauer & Briefing
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Die Abwesenheit beginnt mit der Abfahrt von zuhause (Entfernung ÷ 2 = Fahrzeit in Minuten).
                Bei <strong>Langstreckenflügen</strong> (A330/A340/A350/A380/B747/B777/B787) beginnt die Dienstzeit 
                zusätzlich <strong>1h50 vor Abflug</strong> (Briefing). Bei Kurzstrecke entfällt dies derzeit.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Verpflegungsmehraufwand
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <span className="block">
                  Berechnet nach länderspezifischen BMF-Sätzen. Teilbetrag (&gt;8h) für Tagesreisen oder An-/Abreisetage,
                  Vollbetrag (24h) für volle Tage mit Übernachtung. Städtespezifische Zuschläge werden automatisch angewendet
                  (z.B. NYC, Paris, Mumbai). Vom Ergebnis wird die Arbeitgebererstattung abgezogen.
                </span>
                <span className="block">
                  <strong>Inland:</strong> Nur reine Inlandsflüge mit Abwesenheit &gt;8h = Teilbetrag (14€). 
                  Vom Ergebnis wird die Arbeitgebererstattung abgezogen.
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Plane className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Entfernungspauschale
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Erste 20km: 0,30€/km, darüber 0,38€/km (ab 2024). Multipliziert mit der Anzahl der Fahrten.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* GitHub Link */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-600">
        <a
          href="https://github.com/0xdavidjansen/ohmy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <Github className="w-5 h-5" />
          <span className="font-medium">View on GitHub</span>
        </a>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Open Source • MIT License • Contributions welcome
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Hinweis:</strong> Alle Berechnungen dienen nur zur Orientierung. 
          Für verbindliche steuerliche Auskünfte konsultieren Sie bitte einen Steuerberater.
        </p>
      </div>
    </div>
  );
}
