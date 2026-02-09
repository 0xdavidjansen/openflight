import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
                Ein Fehler ist aufgetreten
              </h2>
            </div>
            
            <p className="text-red-700 dark:text-red-300 mb-4">
              {this.state.error?.message || 'Unbekannter Fehler'}
            </p>

            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mb-4">
                <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer hover:underline">
                  Technische Details anzeigen
                </summary>
                <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/40 rounded text-xs overflow-auto max-h-40 text-red-800 dark:text-red-200">
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Erneut versuchen
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
              >
                Seite neu laden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
