'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

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
    if (typeof window === 'undefined') return; // Only run on client

    try {
      const saved = localStorage.getItem('debug-map-info');
      if (saved !== null && saved !== 'undefined') {
        setShowMapDebugInfo(JSON.parse(saved));
      }
    } catch (error) {
      // If parsing fails, default to false
      setShowMapDebugInfo(false);
    }
  }, []);

  // Save debug state to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return; // Only run on client

    try {
      localStorage.setItem('debug-map-info', JSON.stringify(showMapDebugInfo));
    } catch (error) {
      // Silently fail if localStorage is not available
      console.warn('Failed to save debug state to localStorage:', error);
    }
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
