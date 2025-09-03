import { backupService } from './backupService';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        count: jest.fn(() => ({
          head: jest.fn(() => Promise.resolve({ count: 10, error: null }))
        })),
        limit: jest.fn(() => Promise.resolve({ 
          data: [{ id: 1, name: 'test' }], 
          error: null 
        }))
      }))
    })),
  },
}));

describe('BackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTableInfo', () => {
    it('should return table information', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().count().head.mockResolvedValue({ count: 10, error: null });
      mockSupabase.from().select().limit.mockResolvedValue({ 
        data: [{ id: 1, name: 'test' }], 
        error: null 
      });

      const result = await backupService.getTableInfo();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('exportAllData', () => {
    it('should export all data as CSV', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select.mockResolvedValue({ 
        data: [{ id: 1, name: 'test' }], 
        error: null 
      });

      const result = await backupService.exportAllData({ format: 'csv' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.filename).toContain('.csv');
      expect(result.metadata).toBeDefined();
    });

    it('should export all data as JSON', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select.mockResolvedValue({ 
        data: [{ id: 1, name: 'test' }], 
        error: null 
      });

      const result = await backupService.exportAllData({ format: 'json' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.filename).toContain('.json');
    });

    it('should handle export errors gracefully', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select.mockRejectedValue(new Error('Database error'));

      const result = await backupService.exportAllData({ format: 'csv' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('exportTable', () => {
    it('should export specific table', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select.mockResolvedValue({ 
        data: [{ id: 1, name: 'test' }], 
        error: null 
      });

      const result = await backupService.exportTable('patients', { format: 'csv' });

      expect(result.success).toBe(true);
      expect(result.filename).toContain('patients_backup');
    });

    it('should apply date range filter when specified', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      const mockQuery = {
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ 
          data: [{ id: 1, name: 'test' }], 
          error: null 
        })
      };
      mockSupabase.from().select.mockReturnValue(mockQuery);

      const dateRange = {
        from: '2024-01-01',
        to: '2024-01-31'
      };

      const result = await backupService.exportTable('appointments', { 
        format: 'csv', 
        dateRange 
      });

      expect(result.success).toBe(true);
      expect(mockQuery.gte).toHaveBeenCalled();
      expect(mockQuery.lte).toHaveBeenCalled();
    });
  });

  describe('exportCoreData', () => {
    it('should export core business data', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select.mockResolvedValue({ 
        data: [{ id: 1, name: 'test' }], 
        error: null 
      });

      const result = await backupService.exportCoreData({ format: 'csv' });

      expect(result.success).toBe(true);
      expect(result.filename).toContain('medicare_backup');
    });
  });

  describe('exportSystemData', () => {
    it('should export system configuration data', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select.mockResolvedValue({ 
        data: [{ id: 1, name: 'test' }], 
        error: null 
      });

      const result = await backupService.exportSystemData({ format: 'csv' });

      expect(result.success).toBe(true);
      expect(result.filename).toContain('medicare_backup');
    });
  });

  describe('getBackupStatistics', () => {
    it('should return backup statistics', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().count().head.mockResolvedValue({ count: 10, error: null });
      mockSupabase.from().select().limit.mockResolvedValue({ 
        data: [{ id: 1, name: 'test' }], 
        error: null 
      });

      const result = await backupService.getBackupStatistics();

      expect(result.totalTables).toBeDefined();
      expect(result.totalRows).toBeDefined();
      expect(result.tableStats).toBeDefined();
      expect(Array.isArray(result.tableStats)).toBe(true);
    });
  });
});
