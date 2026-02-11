import { useApp } from '../hooks';
import { BarChart3, Calculator, TrendingUp, Info } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export function SummaryTab() {
  const { state, monthlyBreakdown, taxCalculation, totalFlightHours, totalWorkDays } = useApp();
  const { flights, settings } = state;

  if (flights.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">
          Keine Daten vorhanden
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Laden Sie zuerst Ihre Flugdokumente hoch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Monthly Breakdown Table */}
      <section className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Details pro Monat
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/30">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                  Monat
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                  Flugstunden
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                  Arbeitstage
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                  Fahrten
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                  Entfernungspauschale
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                  Verpflegung
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                  AG-Erstattung
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                  Trinkgeld
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                  Reinigung
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyBreakdown.map((month) => (
                <tr
                  key={`${month.year}-${month.month}`}
                  className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-white">
                    {month.monthName} {month.year}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                    {month.flightHours.toFixed(1)}h
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                    {month.workDays}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                    {month.trips}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(month.distanceDeduction)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(month.mealAllowance)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(month.employerReimbursement)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(month.tips)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(month.cleaningCosts)}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 font-semibold">
                <td className="py-3 px-4 text-slate-800 dark:text-white">
                  Gesamt
                </td>
                <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
                  {totalFlightHours.toFixed(1)}h
                </td>
                <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
                  {totalWorkDays}
                </td>
                <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
                  {taxCalculation.travelCosts.trips}
                </td>
                <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
                  {formatCurrency(taxCalculation.travelCosts.total)}
                </td>
                <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
                  {formatCurrency(taxCalculation.mealAllowances.totalAllowances)}
                </td>
                <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
                  {formatCurrency(taxCalculation.mealAllowances.employerReimbursement)}
                </td>
                <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
                  {formatCurrency(taxCalculation.travelExpenses.total)}
                </td>
                <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
                  {formatCurrency(taxCalculation.cleaningCosts.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Endabrechnung */}
      <section className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-600" />
            Endabrechnung
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Reinigungskosten */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
              Reinigungskosten (Zeile 57)
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-green-600 dark:text-green-400">Arbeitstage</p>
                <p className="font-semibold text-green-800 dark:text-green-200">
                  {taxCalculation.cleaningCosts.workDays}
                </p>
              </div>
              <div>
                <p className="text-green-600 dark:text-green-400">× Tagessatz</p>
                <p className="font-semibold text-green-800 dark:text-green-200">
                  {formatCurrency(taxCalculation.cleaningCosts.ratePerDay)}
                </p>
              </div>
              <div>
                <p className="text-green-600 dark:text-green-400">= Summe</p>
                <p className="font-bold text-lg text-green-800 dark:text-green-200">
                  {formatCurrency(taxCalculation.cleaningCosts.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Reisenebenkosten (Trinkgeld) */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              Reisenebenkosten / Trinkgeld (Zeile 71)
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-amber-600 dark:text-amber-400">Hotelnächte</p>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  {taxCalculation.travelExpenses.hotelNights}
                </p>
              </div>
              <div>
                <p className="text-amber-600 dark:text-amber-400">× Trinkgeld</p>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  {formatCurrency(taxCalculation.travelExpenses.tipRate)}
                </p>
              </div>
              <div>
                <p className="text-amber-600 dark:text-amber-400">= Summe</p>
                <p className="font-bold text-lg text-amber-800 dark:text-amber-200">
                  {formatCurrency(taxCalculation.travelExpenses.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Fahrtkosten */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Fahrtkosten / Entfernungspauschale
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">
                  Fahrten × Entfernung
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  {taxCalculation.travelCosts.trips} × {settings.distanceToWork} km = {taxCalculation.travelCosts.totalKm} km
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">
                  Erste 20 km × {formatCurrency(taxCalculation.travelCosts.rateFirst20km)}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  {formatCurrency(taxCalculation.travelCosts.deductionFirst20km)}
                </span>
              </div>
              {taxCalculation.travelCosts.deductionAbove20km > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-600 dark:text-blue-400">
                    Ab km 21 × {formatCurrency(taxCalculation.travelCosts.rateAbove20km)}
                  </span>
                  <span className="text-blue-800 dark:text-blue-200">
                    {formatCurrency(taxCalculation.travelCosts.deductionAbove20km)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-2 font-bold">
                <span className="text-blue-800 dark:text-blue-200">Summe Fahrtkosten</span>
                <span className="text-lg text-blue-800 dark:text-blue-200">
                  {formatCurrency(taxCalculation.travelCosts.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Verpflegungsmehraufwendungen */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
              Verpflegungsmehraufwendungen
            </h4>
            <div className="space-y-2 text-sm">
              {taxCalculation.mealAllowances.byCountry.map((country) => (
                <div key={country.country} className="space-y-1">
                  <div className="font-medium text-purple-700 dark:text-purple-300">
                    {country.country}
                  </div>
                  {country.days8h > 0 && (
                    <div className="flex justify-between pl-4">
                      <span className="text-purple-600 dark:text-purple-400">
                        {'>'} 8h: {country.days8h} Tage × {formatCurrency(country.rate8h)}
                      </span>
                      <span className="text-purple-800 dark:text-purple-200">
                        {formatCurrency(country.total8h)}
                      </span>
                    </div>
                  )}
                  {country.days24h > 0 && (
                    <div className="flex justify-between pl-4">
                      <span className="text-purple-600 dark:text-purple-400">
                        24h: {country.days24h} Tage × {formatCurrency(country.rate24h)}
                      </span>
                      <span className="text-purple-800 dark:text-purple-200">
                        {formatCurrency(country.total24h)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between border-t border-purple-200 dark:border-purple-700 pt-2">
                <span className="font-semibold text-purple-800 dark:text-purple-200">
                  Summe Verpflegung
                </span>
                <span className="font-semibold text-purple-800 dark:text-purple-200">
                  {formatCurrency(taxCalculation.mealAllowances.totalAllowances)}
                </span>
              </div>
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>- Arbeitgeber-Erstattung (steuerfrei)</span>
                <span>
                  -{formatCurrency(taxCalculation.mealAllowances.employerReimbursement)}
                </span>
              </div>
              <div className="flex justify-between border-t border-purple-200 dark:border-purple-700 pt-2 font-bold">
                <span className="text-purple-800 dark:text-purple-200">
                  = Abzugsfähige Differenz
                </span>
                <span className="text-lg text-purple-800 dark:text-purple-200">
                  {formatCurrency(taxCalculation.mealAllowances.deductibleDifference)}
                </span>
              </div>
            </div>
          </div>

          {/* Grand Total */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-lg p-6 text-white">
            <h4 className="text-lg font-semibold mb-4">Gesamtsumme Werbungskosten</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Reinigungskosten</span>
                <span>{formatCurrency(taxCalculation.cleaningCosts.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Trinkgeld</span>
                <span>{formatCurrency(taxCalculation.travelExpenses.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Fahrtkosten</span>
                <span>{formatCurrency(taxCalculation.travelCosts.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Verpflegung (Differenz)</span>
                <span>{formatCurrency(taxCalculation.mealAllowances.deductibleDifference)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-600 pt-3 mt-3">
                <span className="text-xl font-bold">Gesamtsumme</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(taxCalculation.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Diese Berechnung dient als Orientierung für Ihre Steuererklärung.
            Bitte prüfen Sie alle Werte und passen Sie sie gegebenenfalls an.
            Die angegebenen Zeilennummern beziehen sich auf die Anlage N.
          </p>
        </div>
      </div>
    </div>
  );
}
