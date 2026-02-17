import { Info, Github, Calculator, Clock, Plane, MapPin, Briefcase } from 'lucide-react';

export function AboutTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Info className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Berechnungsgrundlagen
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            So werden Ihre steuerlichen Abzüge berechnet
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Briefing & De-Briefing */}
        <section className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Briefing & De-Briefing
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
                <p className="font-medium text-slate-700 dark:text-slate-200">Briefing (vor Abflug):</p>
                <ul className="list-disc list-inside ml-1 space-y-0.5">
                  <li>Langstrecke: 1h 50min</li>
                  <li>Kurzstrecke Cockpit: 1h 20min</li>
                  <li>Kurzstrecke Cabin: 1h 25min</li>
                  <li>Simulator: 1h (pre) + 1h (post)</li>
                </ul>
                <p className="font-medium text-slate-700 dark:text-slate-200 pt-1">De-Briefing (nach Ankunft):</p>
                <ul className="list-disc list-inside ml-1 space-y-0.5">
                  <li>Alle Flüge (nicht Simulator): 30min</li>
                </ul>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  Langstrecke = Zielland interkontinental. Kurzstrecke = Europa/Inland.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Abwesenheit */}
        <section className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Calculator className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Abwesenheitsberechnung
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
                <p><strong>Fahrzeit:</strong> Entfernung (km) ÷ 2 = Fahrzeit in Minuten (einfach).</p>
                <p><strong>Tagesreise:</strong> Fahrzeit + Briefing + Flugzeit + De-Briefing + Fahrzeit</p>
                <p><strong>Mehrtägig (Abreisetag):</strong> Immer Teilbetrag (Übernachtung im Ausland)</p>
                <p><strong>Mehrtägig (Ankunftstag):</strong> Ankunftszeit + De-Briefing + Fahrzeit</p>
                <p><strong>Zwischentage:</strong> Voller 24h-Satz</p>
              </div>
            </div>
          </div>
        </section>

        {/* Verpflegungsmehraufwand */}
        <section className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Verpflegungsmehraufwand
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
                <p>Länderspezifische BMF-Sätze mit automatischer Stadtzuordnung (z.B. NYC, Mumbai, Kapstadt).</p>
                <ul className="list-disc list-inside ml-1 space-y-0.5">
                  <li><strong>Teilbetrag (An/Ab):</strong> Tagesreise &gt;8h oder An-/Abreisetag</li>
                  <li><strong>Vollbetrag (24h):</strong> Volle Kalendertage im Ausland</li>
                  <li><strong>Inland (DE):</strong> 14€ Teilbetrag bei &gt;8h Abwesenheit</li>
                </ul>
                <p>Arbeitgebererstattung wird automatisch abgezogen.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bodendienste */}
        <section className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Bodendienste & Simulator
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
                <p><strong>Verpflegung:</strong> ME, SB und EM erhalten den Inland-Teilbetrag (14€).</p>
                <p><strong>Simulator:</strong> Inland-Teilbetrag bei &gt;8h Abwesenheit (inkl. 60min Pre- + 60min Post-Briefing).</p>
                <p><strong>Arbeitstage:</strong> Alle Flugtage + optional Bodendienste (SB, SI, ME, etc.) je nach Einstellung.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Entfernungspauschale & Reinigung */}
        <section className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Plane className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Entfernungspauschale & Reinigung
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
                <p><strong>Erste 20 km:</strong> 0,30€/km &mdash; <strong>ab 21 km:</strong> 0,38€/km (2022-2025)</p>
                <p>Multipliziert mit der Anzahl der Fahrten zur Arbeit.</p>
                <p><strong>Reinigungskosten:</strong> Einstellbarer Tagessatz &times; Arbeitstage.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* GitHub Link */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-600">
        <a
          href="https://github.com/0xdavidjansen/openflight"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <Github className="w-5 h-5" />
          <span className="font-medium">View on GitHub</span>
        </a>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Open Source &bull; MIT License &bull; Contributions welcome
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
