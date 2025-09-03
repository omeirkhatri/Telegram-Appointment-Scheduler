import { DEBOUNCE_DELAY } from '@/constants';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDebounceOptions {
  delay?: number;
  immediate?: boolean; // Execute immediately on first call
  maxWait?: number; // Maximum time to wait before executing
  leading?: boolean; // Execute on leading edge
  trailing?: boolean; // Execute on trailing edge
}

interface UseDebounceReturn<T> {
  debouncedValue: T;
  isPending: boolean;
  cancel: () => void;
  flush: () => void;
}

export function useDebounce<T>(
  value: T,
  options: UseDebounceOptions = {},
): UseDebounceReturn<T> {
  const {
    delay = DEBOUNCE_DELAY,
    immediate = false,
    maxWait,
    leading = false,
    trailing = true,
  } = options;

  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>();
  const lastInvokeTimeRef = useRef<number>(0);
  const lastArgsRef = useRef<T>();

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
    }
    lastCallTimeRef.current = undefined;
    lastInvokeTimeRef.current = 0;
    setIsPending(false);
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (lastArgsRef.current !== undefined) {
      setDebouncedValue(lastArgsRef.current);
      lastInvokeTimeRef.current = Date.now();
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    const isInvoking = leading && lastCallTimeRef.current === undefined;

    lastCallTimeRef.current = now;
    lastArgsRef.current = value;

    if (isInvoking) {
      setDebouncedValue(value);
      lastInvokeTimeRef.current = now;
      setIsPending(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsPending(true);

    const shouldInvoke = (now: number) => {
      const timeSinceLastCall = now - (lastCallTimeRef.current || 0);
      const timeSinceLastInvoke = now - lastInvokeTimeRef.current;

      return (
        lastCallTimeRef.current === undefined ||
        timeSinceLastCall >= delay ||
        (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
      );
    };

    if (shouldInvoke(now)) {
      if (trailing) {
        setDebouncedValue(value);
        lastInvokeTimeRef.current = now;
      }
      setIsPending(false);
    } else {
      timeoutRef.current = setTimeout(() => {
        const now = Date.now();
        if (shouldInvoke(now)) {
          if (trailing) {
            setDebouncedValue(value);
            lastInvokeTimeRef.current = now;
          }
          setIsPending(false);
        }
      }, delay - (now - (lastCallTimeRef.current || 0)));
    }

    // Set max wait timeout
    if (maxWait !== undefined && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        if (trailing) {
          setDebouncedValue(value);
          lastInvokeTimeRef.current = Date.now();
        }
        setIsPending(false);
        maxTimeoutRef.current = undefined;
      }, maxWait);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, immediate, maxWait, leading, trailing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    debouncedValue,
    isPending,
    cancel,
    flush,
  };
}

// Legacy hook for backward compatibility
export function useDebounceLegacy<T>(value: T, delay: number = DEBOUNCE_DELAY): T {
  const { debouncedValue } = useDebounce(value, { delay });
  return debouncedValue;
}
