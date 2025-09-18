/**
 * Retry utilities for handling failed operations with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Calculates the delay for the next retry attempt
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);

  if (options.jitter) {
    // Add random jitter to prevent thundering herd
    const jitterAmount = cappedDelay * 0.1; // 10% jitter
    return cappedDelay + (Math.random() * jitterAmount * 2 - jitterAmount);
  }

  return cappedDelay;
}

/**
 * Sleeps for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt
      if (attempt === config.maxAttempts) {
        throw lastError;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, config);
      console.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`, lastError.message);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retries an operation with a simple fixed delay
 */
export async function retryWithFixedDelay<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      console.warn(`Operation failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms:`, lastError.message);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Creates a retry wrapper function with predefined options
 */
export function createRetryWrapper(options: RetryOptions = {}) {
  return <T>(operation: () => Promise<T>) => retryWithBackoff(operation, options);
}
