import { useState, useCallback } from 'react';

interface ErrorState {
  error: string | Error | null;
  hasError: boolean;
}

interface UseErrorHandlerReturn {
  error: string | Error | null;
  hasError: boolean;
  setError: (error: string | Error | null) => void;
  clearError: () => void;
  handleError: (error: unknown) => void;
  handleAsyncError: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
  });

  const setError = useCallback((error: string | Error | null) => {
    setErrorState({
      error,
      hasError: !!error,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      hasError: false,
    });
  }, []);

  const handleError = useCallback((error: unknown) => {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    } else {
      errorMessage = 'An unexpected error occurred';
    }

    setError(errorMessage);
    console.error('Error handled by useErrorHandler:', error);
  }, [setError]);

  const handleAsyncError = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      clearError();
      return await asyncFn();
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [clearError, handleError]);

  return {
    error: errorState.error,
    hasError: errorState.hasError,
    setError,
    clearError,
    handleError,
    handleAsyncError,
  };
}
