'use client';

import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from '@/components/ui/KeyboardShortcutsHelp';
import { createGlobalShortcuts, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRouter } from 'next/navigation';
import React from 'react';

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const { isOpen, close } = useKeyboardShortcutsHelp();

  // Global shortcuts
  const globalShortcuts = createGlobalShortcuts(router);

  useKeyboardShortcuts({
    shortcuts: globalShortcuts,
    enabled: true,
    ignoreInputs: true,
  });

  return (
    <>
      {children}
      <KeyboardShortcutsHelp
        isOpen={isOpen}
        onClose={close}
        shortcuts={globalShortcuts}
      />
    </>
  );
}
