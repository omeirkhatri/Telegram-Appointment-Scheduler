import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  it('should initialize with empty toasts array', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast when showToast is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({
        type: 'success',
        title: 'Success',
        message: 'Test message',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'success',
      title: 'Success',
      message: 'Test message',
      duration: 5000,
    });
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it('should use custom duration when provided', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({
        type: 'error',
        title: 'Error',
        message: 'Test error',
        duration: 3000,
      });
    });

    expect(result.current.toasts[0].duration).toBe(3000);
  });

  it('should remove a toast when dismissToast is called', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      toastId = result.current.showToast({
        type: 'info',
        title: 'Info',
        message: 'Test info',
      });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.dismissToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should remove all toasts when dismissAllToasts is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({
        type: 'success',
        title: 'Success 1',
        message: 'Message 1',
      });
      result.current.showToast({
        type: 'error',
        title: 'Error 1',
        message: 'Message 2',
      });
    });

    expect(result.current.toasts).toHaveLength(2);

    act(() => {
      result.current.dismissAllToasts();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should auto-dismiss toast after duration', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({
        type: 'warning',
        title: 'Warning',
        message: 'Test warning',
        duration: 1000,
      });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.toasts).toHaveLength(0);

    jest.useRealTimers();
  });

  it('should not auto-dismiss when duration is 0', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({
        type: 'info',
        title: 'Persistent',
        message: 'This should not auto-dismiss',
        duration: 0,
      });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.toasts).toHaveLength(1);

    jest.useRealTimers();
  });
});
