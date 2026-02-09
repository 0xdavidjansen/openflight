import { useCallback, useMemo } from 'react';
import { useApp } from '../hooks';
import { useFlightData } from '../context';
import { FileText, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

export function UploadTab() {
  const { state, removeFile, clearAllData } = useApp();
  const { getBlobUrl } = useFlightData();
  const { uploadedFiles, isLoading, error } = state;

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      removeFile(fileId);
    },
    [removeFile]
  );

  const handleOpenFile = useCallback(
    (filename: string) => {
      const blobUrl = getBlobUrl(filename);
      if (blobUrl) {
        window.open(blobUrl, '_blank');
      }
    },
    [getBlobUrl]
  );

  const flugstundenFiles = useMemo(
    () => uploadedFiles.filter((f) => f.type === 'flugstunden'),
    [uploadedFiles]
  );
  const streckeneinsatzFiles = useMemo(
    () => uploadedFiles.filter((f) => f.type === 'streckeneinsatz'),
    [uploadedFiles]
  );
  const otherFiles = useMemo(
    () => uploadedFiles.filter((f) => f.type === 'unknown'),
    [uploadedFiles]
  );

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-blue-700 dark:text-blue-300">
            Verarbeite Dokument...
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">
              Fehler beim Hochladen
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Uploaded Files */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Flugstundenübersicht */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Flugstundenübersicht
          </h3>
          {flugstundenFiles.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              Noch keine Dateien hochgeladen
            </p>
          ) : (
            <ul className="space-y-2">
              {flugstundenFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-200 flex-shrink-0">
                      {file.month}/{file.year}
                    </span>
                    <span 
                      className="text-xs text-blue-600 dark:text-blue-400 break-all cursor-pointer hover:underline"
                      onClick={() => handleOpenFile(file.name)}
                      title={`Datei: ${file.name}\nHochgeladen: ${file.uploadedAt.toLocaleString('de-DE')}\n\nKlicken Sie, um die PDF-Datei in einem neuen Tab zu öffnen.`}
                    >
                      ({file.name})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Streckeneinsatzabrechnung */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Streckeneinsatzabrechnung
          </h3>
          {streckeneinsatzFiles.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              Noch keine Dateien hochgeladen
            </p>
          ) : (
            <ul className="space-y-2">
              {streckeneinsatzFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-200 flex-shrink-0">
                      {file.month}/{file.year}
                    </span>
                    <span 
                      className="text-xs text-blue-600 dark:text-blue-400 break-all cursor-pointer hover:underline"
                      onClick={() => handleOpenFile(file.name)}
                      title={`Datei: ${file.name}\nHochgeladen: ${file.uploadedAt.toLocaleString('de-DE')}\n\nKlicken Sie, um die PDF-Datei in einem neuen Tab zu öffnen.`}
                    >
                      ({file.name})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Weitere Dokumente */}
      {otherFiles.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Weitere Dokumente
          </h3>
          <ul className="space-y-2">
            {otherFiles.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span 
                    className="text-xs text-blue-600 dark:text-blue-400 break-all cursor-pointer hover:underline"
                    onClick={() => handleOpenFile(file.name)}
                    title={`Datei: ${file.name}\nHochgeladen: ${file.uploadedAt.toLocaleString('de-DE')}\n\nKlicken Sie, um die PDF-Datei in einem neuen Tab zu öffnen.`}
                  >
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clear All Button */}
      {uploadedFiles.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={clearAllData}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Alle Daten löschen
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          Hinweis
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>
            Die <strong>Flugstundenübersicht</strong> enthält Ihre Flugzeiten und
            Arbeitstage
          </li>
          <li>
            Die <strong>Streckeneinsatzabrechnung</strong> enthält bereits
            erstattete Verpflegungspauschalen
          </li>
          <li>
            Laden Sie alle Monate eines Jahres hoch für eine vollständige
            Berechnung
          </li>
          <li>Ihre Daten werden nur lokal in Ihrem Browser verarbeitet</li>
        </ul>
      </div>
    </div>
  );
}
