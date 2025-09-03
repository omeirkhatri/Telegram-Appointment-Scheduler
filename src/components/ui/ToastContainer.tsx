'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useToast, type Toast as ToastType } from '@/hooks/useToast';
import { Toast } from './Toast';

interface ToastContextType {
  showToast: (toast: Omit<ToastType, 'id'>) => string;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToastContext(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { toasts, showToast, dismissToast, dismissAllToasts } = useToast();

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, dismissAllToasts }}>
      {children}

      {/* Toast Container */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={dismissToast}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
