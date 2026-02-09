import { useCallback } from 'react';
import { useApp } from '../hooks';
import { AlertTriangle, X, AlertCircle } from 'lucide-react';
import type { DataWarning } from '../types';

interface WarningBannerProps {
  warning: DataWarning;
}

export function WarningBanner({ warning }: WarningBannerProps) {
  const { dismissWarning } = useApp();

  const handleDismiss = useCallback(() => {
    dismissWarning(warning.id);
  }, [dismissWarning, warning.id]);

  const isError = warning.severity === 'error';
  const Icon = isError ? AlertCircle : AlertTriangle;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${
        isError
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          isError ? 'text-red-600' : 'text-amber-600'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium ${
            isError
              ? 'text-red-800 dark:text-red-200'
              : 'text-amber-800 dark:text-amber-200'
          }`}
        >
          {warning.message}
        </p>
        {warning.details && (
          <p
            className={`text-sm mt-1 ${
              isError
                ? 'text-red-600 dark:text-red-300'
                : 'text-amber-600 dark:text-amber-300'
            }`}
          >
            {warning.details}
          </p>
        )}
      </div>
      {warning.dismissible && (
        <button
          onClick={handleDismiss}
          className={`p-1 rounded hover:bg-white/50 dark:hover:bg-black/20 transition-colors ${
            isError ? 'text-red-600' : 'text-amber-600'
          }`}
          aria-label="Warnung schließen"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
