import { config } from './env';
import { checkConnection, executeQuery, getServiceRoleClient, SupabaseError } from './supabase';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'test-id', name: 'Test' },
            error: null,
          })),
        })),
        range: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [{ id: 'test-id', name: 'Test' }],
            count: 1,
            error: null,
          })),
        })),
        limit: jest.fn(() => ({
          data: [{ id: 'test-id' }],
          error: null,
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'test-id', name: 'Test' },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: 'test-id', name: 'Updated Test' },
              error: null,
            })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
  })),
}));

describe('Supabase Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getServiceRoleClient', () => {
    it('should create service role client with correct config', () => {
      const client = getServiceRoleClient();
      expect(client).toBeDefined();
    });

    it('should throw error if service role key is missing', () => {
      // Mock missing service role key
      const originalKey = config.supabase.serviceRoleKey;
      (config.supabase as any).serviceRoleKey = undefined;

      expect(() => getServiceRoleClient()).toThrow('SUPABASE_SERVICE_ROLE_KEY is not configured');

      // Restore
      (config.supabase as any).serviceRoleKey = originalKey;
    });
  });

  describe('SupabaseError', () => {
    it('should create error with correct properties', () => {
      const error = new SupabaseError(
        'Test error',
        'TEST_CODE',
        'Test details',
        'Test hint',
        true
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toBe('Test details');
      expect(error.hint).toBe('Test hint');
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('SupabaseError');
    });
  });

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: { id: 'test-id', name: 'Test' },
        error: null,
      });

      const result = await executeQuery(mockQuery);
      expect(result).toEqual({ id: 'test-id', name: 'Test' });
    });

    it('should throw error when query fails', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      });

      await expect(executeQuery(mockQuery)).rejects.toThrow('Database error');
    });

    it('should retry on retryable errors', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Temporary error', code: 'TEMP_ERROR' },
        })
        .mockResolvedValueOnce({
          data: { id: 'test-id', name: 'Test' },
          error: null,
        });

      const result = await executeQuery(mockQuery, { retryable: true, maxAttempts: 2 });
      expect(result).toEqual({ id: 'test-id', name: 'Test' });
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkConnection', () => {
    it('should return true for successful connection', async () => {
      const result = await checkConnection();
      expect(result).toBe(true);
    });
  });
});
