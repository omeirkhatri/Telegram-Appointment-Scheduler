import { act, renderHook } from '@testing-library/react';
import {
    createAppointmentShortcuts,
    createGlobalShortcuts,
    createPatientShortcuts,
    createStaffShortcuts,
    useKeyboardShortcuts
} from './useKeyboardShortcuts';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
  writable: true,
});

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatchEvent.mockClear();
  });

  it('should register and handle keyboard shortcuts', () => {
    const mockAction = jest.fn();
    const shortcuts = [
      {
        key: 'n',
        ctrlKey: true,
        action: mockAction,
        description: 'Test shortcut',
      },
    ];

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts,
        enabled: true,
        ignoreInputs: true,
      })
    );

    // Create a mock event with proper target
    const mockTarget = document.createElement('div');
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
    });

    // Mock the target property
    Object.defineProperty(event, 'target', {
      value: mockTarget,
      writable: false,
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should not trigger shortcuts when disabled', () => {
    const mockAction = jest.fn();
    const shortcuts = [
      {
        key: 'n',
        ctrlKey: true,
        action: mockAction,
        description: 'Test shortcut',
      },
    ];

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts,
        enabled: false,
        ignoreInputs: true,
      })
    );

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it('should ignore shortcuts when typing in input fields', () => {
    const mockAction = jest.fn();
    const shortcuts = [
      {
        key: 'n',
        ctrlKey: true,
        action: mockAction,
        description: 'Test shortcut',
      },
    ];

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts,
        enabled: true,
        ignoreInputs: true,
      })
    );

    // Create a mock input element
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
    });

    // Mock the target to be the input element
    Object.defineProperty(event, 'target', {
      value: input,
      writable: false,
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(input);
  });

  it('should handle multiple modifier keys', () => {
    const mockAction = jest.fn();
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        action: mockAction,
        description: 'Test shortcut with shift',
      },
    ];

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts,
        enabled: true,
        ignoreInputs: true,
      })
    );

    const mockTarget = document.createElement('div');
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
    });

    Object.defineProperty(event, 'target', {
      value: mockTarget,
      writable: false,
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should not trigger when modifier keys do not match', () => {
    const mockAction = jest.fn();
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        action: mockAction,
        description: 'Test shortcut with shift',
      },
    ];

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts,
        enabled: true,
        ignoreInputs: true,
      })
    );

    const mockTarget = document.createElement('div');
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: false,
    });

    Object.defineProperty(event, 'target', {
      value: mockTarget,
      writable: false,
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it('should handle disabled shortcuts', () => {
    const mockAction = jest.fn();
    const shortcuts = [
      {
        key: 'n',
        ctrlKey: true,
        action: mockAction,
        description: 'Test shortcut',
        disabled: true,
      },
    ];

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts,
        enabled: true,
        ignoreInputs: true,
      })
    );

    const mockTarget = document.createElement('div');
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
    });

    Object.defineProperty(event, 'target', {
      value: mockTarget,
      writable: false,
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it('should prevent default and stop propagation', () => {
    const mockAction = jest.fn();
    const shortcuts = [
      {
        key: 'n',
        ctrlKey: true,
        action: mockAction,
        description: 'Test shortcut',
      },
    ];

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts,
        enabled: true,
        ignoreInputs: true,
      })
    );

    const mockTarget = document.createElement('div');
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
    });

    Object.defineProperty(event, 'target', {
      value: mockTarget,
      writable: false,
    });

    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});

describe('createGlobalShortcuts', () => {
  it('should create global shortcuts with router navigation', () => {
    const shortcuts = createGlobalShortcuts({ push: mockPush });

    expect(shortcuts).toHaveLength(8);
    expect(shortcuts[0].description).toBe('New appointment');
    expect(shortcuts[1].description).toBe('New patient');
    expect(shortcuts[2].description).toBe('New staff member');
    expect(shortcuts[3].description).toBe('Show keyboard shortcuts');
    expect(shortcuts[4].description).toBe('Go to dashboard');
    expect(shortcuts[5].description).toBe('Go to patients');
    expect(shortcuts[6].description).toBe('Go to staff');
    expect(shortcuts[7].description).toBe('Go to appointments');
  });

  it('should trigger router navigation for navigation shortcuts', () => {
    const shortcuts = createGlobalShortcuts({ push: mockPush });

    // Test navigation shortcut
    const dashboardShortcut = shortcuts.find(s => s.description === 'Go to dashboard');
    expect(dashboardShortcut).toBeDefined();

    act(() => {
      dashboardShortcut!.action();
    });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should dispatch custom event for help shortcut', () => {
    const shortcuts = createGlobalShortcuts({ push: mockPush });

    const helpShortcut = shortcuts.find(s => s.description === 'Show keyboard shortcuts');
    expect(helpShortcut).toBeDefined();

    act(() => {
      helpShortcut!.action();
    });

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'show-keyboard-shortcuts',
      })
    );
  });
});

describe('createAppointmentShortcuts', () => {
  it('should create appointment-specific shortcuts', () => {
    const mockSetViewMode = jest.fn();
    const mockFocusSearch = jest.fn();

    const shortcuts = createAppointmentShortcuts(mockSetViewMode, mockFocusSearch);

    expect(shortcuts).toHaveLength(2);
    expect(shortcuts[0].description).toBe('Toggle calendar/table view');
    expect(shortcuts[1].description).toBe('Focus search');
  });

  it('should toggle view mode when shortcut is triggered', () => {
    const mockSetViewMode = jest.fn();
    const mockFocusSearch = jest.fn();

    const shortcuts = createAppointmentShortcuts(mockSetViewMode, mockFocusSearch);

    const toggleShortcut = shortcuts.find(s => s.description === 'Toggle calendar/table view');
    expect(toggleShortcut).toBeDefined();

    act(() => {
      toggleShortcut!.action();
    });

    expect(mockSetViewMode).toHaveBeenCalled();
  });

  it('should focus search when shortcut is triggered', () => {
    const mockSetViewMode = jest.fn();
    const mockFocusSearch = jest.fn();

    const shortcuts = createAppointmentShortcuts(mockSetViewMode, mockFocusSearch);

    const focusShortcut = shortcuts.find(s => s.description === 'Focus search');
    expect(focusShortcut).toBeDefined();

    act(() => {
      focusShortcut!.action();
    });

    expect(mockFocusSearch).toHaveBeenCalled();
  });
});

describe('createPatientShortcuts', () => {
  it('should create patient-specific shortcuts', () => {
    const mockFocusSearch = jest.fn();

    const shortcuts = createPatientShortcuts(mockFocusSearch);

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].description).toBe('Focus search');
  });

  it('should focus search when shortcut is triggered', () => {
    const mockFocusSearch = jest.fn();

    const shortcuts = createPatientShortcuts(mockFocusSearch);

    const focusShortcut = shortcuts.find(s => s.description === 'Focus search');
    expect(focusShortcut).toBeDefined();

    act(() => {
      focusShortcut!.action();
    });

    expect(mockFocusSearch).toHaveBeenCalled();
  });
});

describe('createStaffShortcuts', () => {
  it('should create staff-specific shortcuts', () => {
    const mockFocusSearch = jest.fn();

    const shortcuts = createStaffShortcuts(mockFocusSearch);

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].description).toBe('Focus search');
  });

  it('should focus search when shortcut is triggered', () => {
    const mockFocusSearch = jest.fn();

    const shortcuts = createStaffShortcuts(mockFocusSearch);

    const focusShortcut = shortcuts.find(s => s.description === 'Focus search');
    expect(focusShortcut).toBeDefined();

    act(() => {
      focusShortcut!.action();
    });

    expect(mockFocusSearch).toHaveBeenCalled();
  });
});
