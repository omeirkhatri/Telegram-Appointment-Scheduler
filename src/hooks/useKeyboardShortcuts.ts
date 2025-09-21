import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  disabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  ignoreInputs?: boolean;
}

/**
 * Custom hook for managing keyboard shortcuts
 * @param options Configuration for keyboard shortcuts
 * @returns Object with methods to manage shortcuts
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  ignoreInputs = true,
}: UseKeyboardShortcutsOptions) {
  const router = useRouter();
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore shortcuts when typing in input fields
      if (ignoreInputs) {
        const target = event.target as HTMLElement;
        const isInputField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.contentEditable === 'true' ||
          (target.getAttribute && target.getAttribute('role') === 'textbox');

        if (isInputField) return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcutsRef.current.find(shortcut => {
        if (shortcut.disabled) return false;

        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.metaKey === event.metaKey &&
          !!shortcut.shiftKey === event.shiftKey &&
          !!shortcut.altKey === event.altKey
        );
      });

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
      }
    },
    [enabled, ignoreInputs]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

/**
 * Predefined global shortcuts for the application
 * Using Ctrl+Shift combinations to avoid browser conflicts
 */
export const createGlobalShortcuts = (router: any, toggleMapDebugInfo?: () => void) => [
  {
    key: 'n',
    ctrlKey: true,
    shiftKey: true,
    action: () => router.push('/appointments?new=true'),
    description: 'New appointment',
  },
  {
    key: 'p',
    ctrlKey: true,
    shiftKey: true,
    action: () => router.push('/patients?new=true'),
    description: 'New patient',
  },
  {
    key: 's',
    ctrlKey: true,
    shiftKey: true,
    action: () => router.push('/staff?new=true'),
    description: 'New staff member',
  },
  {
    key: 'h',
    ctrlKey: true,
    shiftKey: true,
    action: () => {
      // This will be handled by the help modal component
      const event = new CustomEvent('show-keyboard-shortcuts');
      window.dispatchEvent(event);
    },
    description: 'Show keyboard shortcuts',
  },
  {
    key: '1',
    ctrlKey: true,
    shiftKey: true,
    action: () => router.push('/'),
    description: 'Go to dashboard',
  },
  {
    key: '2',
    ctrlKey: true,
    shiftKey: true,
    action: () => router.push('/patients'),
    description: 'Go to patients',
  },
  {
    key: '3',
    ctrlKey: true,
    shiftKey: true,
    action: () => router.push('/staff'),
    description: 'Go to staff',
  },
  {
    key: '4',
    ctrlKey: true,
    shiftKey: true,
    action: () => router.push('/appointments'),
    description: 'Go to appointments',
  },
  {
    key: 'd',
    ctrlKey: true,
    shiftKey: true,
    action: () => toggleMapDebugInfo?.(),
    description: 'Toggle map debug info',
    disabled: !toggleMapDebugInfo,
  },
];

/**
 * Predefined shortcuts for appointments page
 * Using Ctrl+Shift combinations to avoid browser conflicts
 */
export const createAppointmentShortcuts = (setViewMode: (mode: 'calendar' | 'table') => void, focusSearch: () => void) => [
  {
    key: 't',
    ctrlKey: true,
    shiftKey: true,
    action: () => {
      setViewMode(prev => prev === 'calendar' ? 'table' : 'calendar');
    },
    description: 'Toggle calendar/table view',
  },
  {
    key: 'f',
    ctrlKey: true,
    shiftKey: true,
    action: () => {
      focusSearch();
    },
    description: 'Focus search',
  },
];

/**
 * Predefined shortcuts for patients page
 * Using Ctrl+Shift combinations to avoid browser conflicts
 */
export const createPatientShortcuts = (focusSearch: () => void) => [
  {
    key: 'f',
    ctrlKey: true,
    shiftKey: true,
    action: () => {
      focusSearch();
    },
    description: 'Focus search',
  },
];

/**
 * Predefined shortcuts for staff page
 * Using Ctrl+Shift combinations to avoid browser conflicts
 */
export const createStaffShortcuts = (focusSearch: () => void) => [
  {
    key: 'f',
    ctrlKey: true,
    shiftKey: true,
    action: () => {
      focusSearch();
    },
    description: 'Focus search',
  },
];
