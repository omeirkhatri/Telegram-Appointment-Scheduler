/**
 * Retry utilities for handling failed operations with exponential backoff
 *
 * Enhanced retry system with error classification, circuit breaker patterns,
 * and comprehensive logging for calendar operations.
 */

import { getErrorSeverity, isRetryableError } from '@/lib/errorCodes';
import { errorLoggingService } from '@/services/errorLoggingService';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  context?: Record<string, any>;
  operationType?: string;
  staffId?: string;
  appointmentId?: string;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000, // 1 minute
  context: {},
  operationType: 'unknown',
  staffId: undefined,
  appointmentId: undefined,
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

// =============================================================================
// CIRCUIT BREAKER STATE
// =============================================================================

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Get or create circuit breaker state for an operation
 */
function getCircuitBreakerState(operationKey: string): CircuitBreakerState {
  if (!circuitBreakers.has(operationKey)) {
    circuitBreakers.set(operationKey, {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed'
    });
  }
  return circuitBreakers.get(operationKey)!;
}

/**
 * Check if circuit breaker should allow operation
 */
function shouldAllowOperation(
  operationKey: string,
  threshold: number,
  timeout: number
): boolean {
  const state = getCircuitBreakerState(operationKey);
  const now = Date.now();

  switch (state.state) {
    case 'closed':
      return true;
    case 'open':
      if (now - state.lastFailureTime > timeout) {
        state.state = 'half-open';
        return true;
      }
      return false;
    case 'half-open':
      return true;
    default:
      return true;
  }
}

/**
 * Record operation success
 */
function recordSuccess(operationKey: string): void {
  const state = getCircuitBreakerState(operationKey);
  state.failures = 0;
  state.state = 'closed';
}

/**
 * Record operation failure
 */
function recordFailure(operationKey: string, threshold: number): void {
  const state = getCircuitBreakerState(operationKey);
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= threshold) {
    state.state = 'open';
  }
}

/**
 * Retries an async operation with exponential backoff and circuit breaker
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const operationKey = `${config.operationType}_${config.staffId || 'global'}`;
  let lastError: Error;

  // Check circuit breaker
  if (!shouldAllowOperation(operationKey, config.circuitBreakerThreshold, config.circuitBreakerTimeout)) {
    const error = new Error(`Circuit breaker is open for operation: ${config.operationType}`);
    await errorLoggingService.logSystemError({
      errorCode: 'CIRCUIT_BREAKER_OPEN',
      message: `Circuit breaker is open for operation: ${config.operationType}`,
      context: { operationKey, operationType: config.operationType },
      operationType: config.operationType
    });
    throw error;
  }

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();

      // Record success and reset circuit breaker
      recordSuccess(operationKey);

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Log the error with context
      const errorCode = extractErrorCode(lastError);
      const isRetryable = isRetryableError(errorCode);
      const severity = getErrorSeverity(errorCode);

      await errorLoggingService.logError({
        errorCode,
        errorType: 'system',
        message: lastError.message,
        context: {
          ...config.context,
          attempt,
          maxAttempts: config.maxAttempts,
          operationType: config.operationType,
          isRetryable
        },
        staffId: config.staffId,
        appointmentId: config.appointmentId,
        operationType: config.operationType,
        stackTrace: lastError.stack
      });

      // Record failure in circuit breaker
      recordFailure(operationKey, config.circuitBreakerThreshold);

      // Don't retry if not retryable or on last attempt
      if (!isRetryable || attempt === config.maxAttempts) {
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

// =============================================================================
// ERROR EXTRACTION AND UTILITIES
// =============================================================================

/**
 * Extract error code from error object
 */
function extractErrorCode(error: Error): string {
  // Check if error has a code property
  if ('code' in error && typeof error.code === 'string') {
    return error.code;
  }

  // Check if error message contains a known error code pattern
  const errorCodeMatch = error.message.match(/([A-Z_]+_\d{3})/);
  if (errorCodeMatch) {
    return errorCodeMatch[1];
  }

  // Check for Google API errors
  if (error.message.includes('Google Calendar')) {
    if (error.message.includes('quota')) return 'GC_AUTH_005'; // QUOTA_EXCEEDED
    if (error.message.includes('permission')) return 'GC_AUTH_003'; // INSUFFICIENT_PERMISSIONS
    if (error.message.includes('not found')) return 'GC_CAL_001'; // CALENDAR_NOT_FOUND
    if (error.message.includes('timeout')) return 'GC_NET_002'; // API_TIMEOUT
    if (error.message.includes('rate limit')) return 'GC_NET_003'; // API_RATE_LIMIT
  }

  // Check for network errors
  if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
    return 'GC_NET_001'; // NETWORK_ERROR
  }

  // Check for validation errors
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return 'APP_VAL_001'; // VALIDATION_ERROR
  }

  // Default to unknown error
  return 'GC_SYS_005'; // UNKNOWN_ERROR
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
  const status: Record<string, CircuitBreakerState> = {};
  for (const [key, state] of circuitBreakers.entries()) {
    status[key] = { ...state };
  }
  return status;
}

/**
 * Reset circuit breaker for a specific operation
 */
export function resetCircuitBreaker(operationKey: string): void {
  circuitBreakers.delete(operationKey);
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
}

/**
 * Get retry statistics for monitoring
 */
export function getRetryStatistics(): {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  circuitBreakerStates: Record<string, string>;
} {
  const states = getCircuitBreakerStatus();
  const circuitBreakerStates: Record<string, string> = {};

  for (const [key, state] of Object.entries(states)) {
    circuitBreakerStates[key] = state.state;
  }

  return {
    totalOperations: circuitBreakers.size,
    successfulOperations: Object.values(states).filter(s => s.failures === 0).length,
    failedOperations: Object.values(states).filter(s => s.failures > 0).length,
    circuitBreakerStates
  };
}
