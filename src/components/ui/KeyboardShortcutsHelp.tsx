import { Command, Control, Keyboard, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsHelp({ isOpen, onClose, shortcuts }: KeyboardShortcutsHelpProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  const formatKey = (shortcut: KeyboardShortcut) => {
    const keys = [];

    if (shortcut.ctrlKey) {
      keys.push(
        <span key="ctrl" className="inline-flex items-center gap-1">
          <Control className="w-3 h-3" />
          <span>Ctrl</span>
        </span>
      );
    }

    if (shortcut.metaKey) {
      keys.push(
        <span key="cmd" className="inline-flex items-center gap-1">
          <Command className="w-3 h-3" />
          <span>Cmd</span>
        </span>
      );
    }

    if (shortcut.shiftKey) {
      keys.push(<span key="shift">Shift</span>);
    }

    if (shortcut.altKey) {
      keys.push(<span key="alt">Alt</span>);
    }

    keys.push(
      <span key="main" className="font-mono bg-[--muted] px-2 py-1 rounded text-sm">
        {shortcut.key.toUpperCase()}
      </span>
    );

    return keys;
  };

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.description.includes('Go to') ? 'Navigation' :
                    shortcut.description.includes('New') ? 'Create' :
                    shortcut.description.includes('Toggle') || shortcut.description.includes('Focus') ? 'Actions' :
                    'Other';

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
      isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative bg-[--card] border border-[--border] rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden transition-transform duration-200 ${
        isOpen ? 'scale-100' : 'scale-95'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[--border]">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-[--primary]" />
            <h2 className="text-xl font-semibold text-[--foreground]">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[--muted] rounded-lg transition-colors"
            aria-label="Close keyboard shortcuts help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-medium text-[--muted-foreground] uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[--muted]/50 transition-colors">
                    <span className="text-[--foreground]">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {formatKey(shortcut).map((keyElement, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyElement}
                          {keyIndex < formatKey(shortcut).length - 1 && (
                            <span className="text-[--muted-foreground] mx-1">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[--border] bg-[--muted]/30">
          <p className="text-sm text-[--muted-foreground] text-center">
            Press <kbd className="px-2 py-1 bg-[--muted] rounded text-xs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage keyboard shortcuts help modal
 */
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowShortcuts = () => {
      setIsOpen(true);
    };

    window.addEventListener('show-keyboard-shortcuts', handleShowShortcuts);
    return () => {
      window.removeEventListener('show-keyboard-shortcuts', handleShowShortcuts);
    };
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
