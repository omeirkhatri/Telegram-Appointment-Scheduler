'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DebugState {
  showMapDebugInfo: boolean;
  toggleMapDebugInfo: () => void;
}

const DebugContext = createContext<DebugState | undefined>(undefined);

interface DebugProviderProps {
  children: ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const [showMapDebugInfo, setShowMapDebugInfo] = useState(false);

  // Load debug state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('debug-map-info');
    if (saved !== null && saved !== 'undefined') {
      try {
        setShowMapDebugInfo(JSON.parse(saved));
      } catch (error) {
        // If parsing fails, default to false
        setShowMapDebugInfo(false);
      }
    }
  }, []);

  // Save debug state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('debug-map-info', JSON.stringify(showMapDebugInfo));
  }, [showMapDebugInfo]);

  const toggleMapDebugInfo = () => {
    setShowMapDebugInfo(prev => !prev);
  };

  return (
    <DebugContext.Provider value={{ showMapDebugInfo, toggleMapDebugInfo }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebugState() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebugState must be used within a DebugProvider');
  }
  return context;
}
