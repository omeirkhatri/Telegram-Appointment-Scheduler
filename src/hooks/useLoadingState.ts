import { useCallback, useState } from 'react';

interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
}

interface UseLoadingStateReturn {
  isLoading: boolean;
  loadingMessage?: string;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  withLoading: <T>(asyncFn: () => Promise<T>, message?: string) => Promise<T>;
}

export function useLoadingState(): UseLoadingStateReturn {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
  });

  const startLoading = useCallback((message?: string) => {
    setLoadingState({
      isLoading: true,
      loadingMessage: message,
    });
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      loadingMessage: undefined,
    });
  }, []);

  const withLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    startLoading(message);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading: loadingState.isLoading,
    loadingMessage: loadingState.loadingMessage,
    startLoading,
    stopLoading,
    withLoading,
  };
}
