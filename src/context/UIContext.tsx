import React, { createContext, useContext, useState, useCallback } from 'react';
import type { TabType } from '../types';

interface UIContextType {
  activeTab: TabType;
  setTab: (tab: TabType) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('settings');

  const setTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  return (
    <UIContext.Provider value={{ activeTab, setTab }}>
      {children}
    </UIContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
