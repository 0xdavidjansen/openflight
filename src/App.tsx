import { useState, useRef, useEffect, useCallback } from 'react';
import { AppProvider } from './context';
import { useApp } from './hooks';
import {
  UploadTab,
  FlightsTab,
  SummaryTab,
  SettingsTab,
  AboutTab,
  ExportDropdown,
  WarningBanner,
  ErrorBoundary,
} from './components';
import {
  Upload,
  Plane,
  BarChart3,
  Settings,
  ChevronDown,
  FilePlus,
  Info,
} from 'lucide-react';
import type { TabType } from './types';

function TabButton({
  tab,
  label,
  icon: Icon,
  activeTab,
  onClick,
}: {
  tab: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeTab: TabType;
  onClick: (tab: TabType) => void;
}) {
  const isActive = tab === activeTab;
  return (
    <button
      onClick={() => onClick(tab)}
      className={`flex w-full items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all justify-start ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function UploadTabButton({
  activeTab,
  onClick,
  hasFiles,
}: {
  activeTab: TabType;
  onClick: (tab: TabType) => void;
  hasFiles: boolean;
}) {
  const isActive = activeTab === 'upload';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMainClick = () => {
    setIsOpen(false);
    
    if (!hasFiles) {
      // No files: just open file picker, don't navigate
      window.dispatchEvent(new CustomEvent('openFilePicker'));
    } else {
      // Files exist: navigate to Upload tab
      onClick('upload');
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleAddFiles = () => {
    window.dispatchEvent(new CustomEvent('openFilePicker'));
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`flex w-full items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
        }`}
      >
        <button
          onClick={handleMainClick}
          className="flex items-center gap-2 flex-1 justify-start"
        >
          <Upload className="w-5 h-5" />
          <span className="hidden sm:inline">Upload</span>
        </button>
        {hasFiles && (
          <button
            onClick={handleChevronClick}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && hasFiles && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden z-50">
          <button
            onClick={handleAddFiles}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"
          >
            <FilePlus className="w-4 h-4" />
            Weitere Dateien hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const { state, setTab, uploadFile } = useApp();
  const { activeTab, warnings, uploadedFiles } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dismissibleWarnings = warnings.filter((w) => w.dismissible);
  const hasFiles = uploadedFiles.length > 0;

  // Listen for file picker trigger event at app level
  useEffect(() => {
    const handleOpenFilePicker = () => {
      fileInputRef.current?.click();
    };

    window.addEventListener('openFilePicker', handleOpenFilePicker);
    return () => window.removeEventListener('openFilePicker', handleOpenFilePicker);
  }, []);

  // Handle file selection
  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList) return;

      const filesToProcess = Array.from(fileList);
      e.target.value = ''; // Reset input to allow re-selecting same files

      for (const file of filesToProcess) {
        await uploadFile(file);
      }
    },
    [uploadFile]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hidden file input for global file picker access */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Warning Banners */}
      {dismissibleWarnings.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-4 space-y-2">
          {dismissibleWarnings.slice(0, 3).map((warning) => (
            <WarningBanner key={warning.id} warning={warning} />
          ))}
          {dismissibleWarnings.length > 3 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              + {dismissibleWarnings.length - 3} weitere Warnungen
            </p>
          )}
        </div>
      )}

      <div className="w-full px-4 pb-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Navigation */}
          <nav className="w-full md:w-[220px] bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm h-fit md:sticky md:top-6">
            <div className="flex flex-col gap-2">
              <UploadTabButton
                activeTab={activeTab}
                onClick={setTab}
                hasFiles={hasFiles}
              />
              <TabButton
                tab="settings"
                label="Einstellungen"
                icon={Settings}
                activeTab={activeTab}
                onClick={setTab}
              />
              <TabButton
                tab="flights"
                label="Arbeitstage"
                icon={Plane}
                activeTab={activeTab}
                onClick={setTab}
              />
              <TabButton
                tab="summary"
                label="Übersicht"
                icon={BarChart3}
                activeTab={activeTab}
                onClick={setTab}
              />
              <ExportDropdown />
              
              {/* Separator */}
              <div className="border-t border-slate-200 dark:border-slate-600 my-2"></div>
              
              {/* About at the bottom */}
              <TabButton
                tab="about"
                label="Info"
                icon={Info}
                activeTab={activeTab}
                onClick={setTab}
              />
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 md:pt-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
              <ErrorBoundary>
                {activeTab === 'upload' && <UploadTab key="upload" />}
                {activeTab === 'flights' && <FlightsTab />}
                {activeTab === 'summary' && <SummaryTab />}
                {activeTab === 'settings' && <SettingsTab />}
                {activeTab === 'about' && <AboutTab />}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            Alle Angaben ohne Gewähr. Bitte konsultieren Sie einen Steuerberater
            für verbindliche Auskünfte.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
