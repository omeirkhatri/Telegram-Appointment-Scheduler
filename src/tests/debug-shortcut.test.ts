import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { DebugProvider, useDebugState } from '@/hooks/useDebugState';
import { createGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Debug State Management', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('should initialize with false by default', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DebugProvider>{children}</DebugProvider>
    );

    const { result } = renderHook(() => useDebugState(), { wrapper });

    expect(result.current.showMapDebugInfo).toBe(false);
    expect(typeof result.current.toggleMapDebugInfo).toBe('function');
  });

  it('should toggle debug state when toggleMapDebugInfo is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DebugProvider>{children}</DebugProvider>
    );

    const { result } = renderHook(() => useDebugState(), { wrapper });

    expect(result.current.showMapDebugInfo).toBe(false);

    act(() => {
      result.current.toggleMapDebugInfo();
    });

    expect(result.current.showMapDebugInfo).toBe(true);

    act(() => {
      result.current.toggleMapDebugInfo();
    });

    expect(result.current.showMapDebugInfo).toBe(false);
  });

  it('should save debug state to localStorage', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DebugProvider>{children}</DebugProvider>
    );

    const { result } = renderHook(() => useDebugState(), { wrapper });

    act(() => {
      result.current.toggleMapDebugInfo();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('debug-map-info', 'true');
  });

  it('should load debug state from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValue('true');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DebugProvider>{children}</DebugProvider>
    );

    const { result } = renderHook(() => useDebugState(), { wrapper });

    expect(result.current.showMapDebugInfo).toBe(true);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('debug-map-info');
  });
});

describe('Keyboard Shortcuts', () => {
  it('should include debug toggle shortcut', () => {
    const mockToggle = jest.fn();
    const mockRouter = { push: jest.fn() };
    
    const shortcuts = createGlobalShortcuts(mockRouter, mockToggle);
    
    const debugShortcut = shortcuts.find(s => s.description === 'Toggle map debug info');
    
    expect(debugShortcut).toBeDefined();
    expect(debugShortcut?.key).toBe('d');
    expect(debugShortcut?.ctrlKey).toBe(true);
    expect(debugShortcut?.shiftKey).toBe(true);
    expect(debugShortcut?.disabled).toBe(false);
    
    // Test the action
    debugShortcut?.action();
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should disable debug shortcut when toggle function is not provided', () => {
    const mockRouter = { push: jest.fn() };
    
    const shortcuts = createGlobalShortcuts(mockRouter);
    
    const debugShortcut = shortcuts.find(s => s.description === 'Toggle map debug info');
    
    expect(debugShortcut).toBeDefined();
    expect(debugShortcut?.disabled).toBe(true);
  });
});
