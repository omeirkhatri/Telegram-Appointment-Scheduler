import {
    DEFAULT_RETRY_CONFIG,
    isRetryableError,
    RETRY_CONFIGS,
    retryWithBackoff,
    type RetryConfig
} from './retryUtils';

// Use real timers for retry tests since fake timers don't work well with async retry logic
// jest.useFakeTimers();

describe('retryUtils', () => {
  beforeEach(() => {
    // jest.clearAllTimers();
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
      expect(isRetryableError({ code: 'ENOTFOUND' })).toBe(true);
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
    });

    it('should identify rate limiting errors as retryable', () => {
      expect(isRetryableError({ code: 429 })).toBe(true);
      expect(isRetryableError({ status: 429 })).toBe(true);
    });

    it('should identify server errors as retryable', () => {
      expect(isRetryableError({ code: 500 })).toBe(true);
      expect(isRetryableError({ code: 502 })).toBe(true);
      expect(isRetryableError({ code: 503 })).toBe(true);
    });

    it('should identify quota errors as retryable', () => {
      expect(isRetryableError({
        code: 403,
        message: 'quota exceeded'
      })).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      expect(isRetryableError({ code: 'TIMEOUT' })).toBe(true);
      expect(isRetryableError({
        message: 'request timeout'
      })).toBe(true);
    });

    it('should not identify client errors as retryable', () => {
      expect(isRetryableError({ code: 400 })).toBe(false);
      expect(isRetryableError({ code: 401 })).toBe(false);
      expect(isRetryableError({ code: 404 })).toBe(false);
    });

    it('should not identify validation errors as retryable', () => {
      expect(isRetryableError({
        code: 400,
        message: 'invalid input'
      })).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await retryWithBackoff(operation, { maxAttempts: 2 });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue({
        code: 400,
        message: 'bad request'
      });

      const result = await retryWithBackoff(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect custom retry configuration', async () => {
      const customConfig: Partial<RetryConfig> = {
        maxAttempts: 2,
        baseDelay: 500,
        maxDelay: 1000,
        backoffMultiplier: 1.5,
        jitter: false,
      };

      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, customConfig);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should calculate total time correctly', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      const resultPromise = retryWithBackoff(operation);

      const result = await resultPromise;

      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.totalTime).toBeLessThanOrEqual(2000); // Should be around 1000ms
    });

    it('should handle jitter correctly', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, { jitter: true });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });
  });

  describe('RETRY_CONFIGS', () => {
    it('should have correct read configuration', () => {
      expect(RETRY_CONFIGS.read.maxAttempts).toBe(2);
      expect(RETRY_CONFIGS.read.baseDelay).toBe(500);
      expect(RETRY_CONFIGS.read.maxDelay).toBe(5000);
    });

    it('should have correct write configuration', () => {
      expect(RETRY_CONFIGS.write.maxAttempts).toBe(3);
      expect(RETRY_CONFIGS.write.baseDelay).toBe(1000);
      expect(RETRY_CONFIGS.write.maxDelay).toBe(30000);
    });

    it('should have correct critical configuration', () => {
      expect(RETRY_CONFIGS.critical.maxAttempts).toBe(5);
      expect(RETRY_CONFIGS.critical.baseDelay).toBe(2000);
      expect(RETRY_CONFIGS.critical.maxDelay).toBe(60000);
    });
  });

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(30000);
      expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.jitter).toBe(true);
    });
  });
});
