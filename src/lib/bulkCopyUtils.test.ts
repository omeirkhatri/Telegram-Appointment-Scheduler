import type { BulkCopyConfig } from '@/types/bulkCopy';
import {
    calculateBulkCopyEndDate,
    formatBulkCopyPattern,
    generateBulkCopyDates,
    getDefaultBulkCopyConfig,
    validateBulkCopyConfig,
} from './bulkCopyUtils';

describe('bulkCopyUtils', () => {
  describe('generateBulkCopyDates', () => {
    it('should generate daily dates correctly', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 3,
        startDate: '2024-01-01',
      };

      const dates = generateBulkCopyDates(config);
      expect(dates).toEqual(['2024-01-02', '2024-01-03', '2024-01-04']);
    });

    it('should generate weekly dates correctly', () => {
      const config: BulkCopyConfig = {
        pattern: 'weekly',
        interval: 1,
        occurrences: 2,
        startDate: '2024-01-01',
      };

      const dates = generateBulkCopyDates(config);
      expect(dates).toEqual(['2024-01-08', '2024-01-15']);
    });

    it('should generate monthly dates correctly', () => {
      const config: BulkCopyConfig = {
        pattern: 'monthly',
        interval: 1,
        occurrences: 2,
        startDate: '2024-01-01',
      };

      const dates = generateBulkCopyDates(config);
      expect(dates).toEqual(['2024-02-01', '2024-03-01']);
    });

    it('should generate custom dates correctly', () => {
      const config: BulkCopyConfig = {
        pattern: 'custom',
        interval: 1,
        occurrences: 3,
        startDate: '2024-01-01',
        customDates: ['2024-01-05', '2024-01-10', '2024-01-15', '2024-01-20'],
      };

      const dates = generateBulkCopyDates(config);
      expect(dates).toEqual(['2024-01-05', '2024-01-10', '2024-01-15']);
    });

    it('should respect end date filter', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 10,
        startDate: '2024-01-01',
        endDate: '2024-01-05',
      };

      const dates = generateBulkCopyDates(config);
      expect(dates).toEqual(['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']);
    });

    it('should throw error for invalid start date', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 3,
        startDate: 'invalid-date',
      };

      expect(() => generateBulkCopyDates(config)).toThrow('Invalid start date');
    });

    it('should throw error for custom pattern without custom dates', () => {
      const config: BulkCopyConfig = {
        pattern: 'custom',
        interval: 1,
        occurrences: 3,
        startDate: '2024-01-01',
      };

      expect(() => generateBulkCopyDates(config)).toThrow('Custom dates must be provided for custom pattern');
    });
  });

  describe('validateBulkCopyConfig', () => {
    it('should validate correct configuration', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 5,
        startDate: '2024-01-01',
      };

      const errors = validateBulkCopyConfig(config);
      expect(errors).toEqual([]);
    });

    it('should detect missing pattern', () => {
      const config = {
        interval: 1,
        occurrences: 5,
        startDate: '2024-01-01',
      } as any;

      const errors = validateBulkCopyConfig(config);
      expect(errors).toContain('Pattern is required');
    });

    it('should detect invalid start date', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 5,
        startDate: 'invalid-date',
      };

      const errors = validateBulkCopyConfig(config);
      expect(errors).toContain('Invalid start date format');
    });

    it('should detect zero occurrences', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 0,
        startDate: '2024-01-01',
      };

      const errors = validateBulkCopyConfig(config);
      expect(errors).toContain('Occurrences must be greater than 0');
    });

    it('should detect too many occurrences', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 101,
        startDate: '2024-01-01',
      };

      const errors = validateBulkCopyConfig(config);
      expect(errors).toContain('Maximum 100 occurrences allowed per bulk copy operation');
    });

    it('should detect zero interval', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 0,
        occurrences: 5,
        startDate: '2024-01-01',
      };

      const errors = validateBulkCopyConfig(config);
      expect(errors).toContain('Interval must be greater than 0');
    });

    it('should detect missing custom dates for custom pattern', () => {
      const config: BulkCopyConfig = {
        pattern: 'custom',
        interval: 1,
        occurrences: 5,
        startDate: '2024-01-01',
      };

      const errors = validateBulkCopyConfig(config);
      expect(errors).toContain('Custom dates are required for custom pattern');
    });

    it('should detect invalid end date', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 5,
        startDate: '2024-01-01',
        endDate: 'invalid-date',
      };

      const errors = validateBulkCopyConfig(config);
      expect(errors).toContain('Invalid end date format');
    });

    it('should detect end date before start date', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 5,
        startDate: '2024-01-01',
        endDate: '2023-12-31',
      };

      const errors = validateBulkCopyConfig(config);
      expect(errors).toContain('End date must be after start date');
    });
  });

  describe('getDefaultBulkCopyConfig', () => {
    it('should return valid default configuration', () => {
      const config = getDefaultBulkCopyConfig();

      expect(config.pattern).toBe('daily');
      expect(config.interval).toBe(1);
      expect(config.occurrences).toBe(5);
      expect(config.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(config.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatBulkCopyPattern', () => {
    it('should format daily pattern correctly', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 5,
        startDate: '2024-01-01',
      };

      expect(formatBulkCopyPattern(config)).toBe('Every 1 day');
    });

    it('should format weekly pattern correctly', () => {
      const config: BulkCopyConfig = {
        pattern: 'weekly',
        interval: 2,
        occurrences: 5,
        startDate: '2024-01-01',
      };

      expect(formatBulkCopyPattern(config)).toBe('Every 2 weeks');
    });

    it('should format monthly pattern correctly', () => {
      const config: BulkCopyConfig = {
        pattern: 'monthly',
        interval: 1,
        occurrences: 5,
        startDate: '2024-01-01',
      };

      expect(formatBulkCopyPattern(config)).toBe('Every 1 month');
    });

    it('should format custom pattern correctly', () => {
      const config: BulkCopyConfig = {
        pattern: 'custom',
        interval: 1,
        occurrences: 5,
        startDate: '2024-01-01',
        customDates: ['2024-01-05', '2024-01-10'],
      };

      expect(formatBulkCopyPattern(config)).toBe('Custom dates (2 dates)');
    });
  });

  describe('calculateBulkCopyEndDate', () => {
    it('should calculate end date for daily pattern', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 3,
        startDate: '2024-01-01',
      };

      const endDate = calculateBulkCopyEndDate(config);
      expect(endDate).toBe('2024-01-04');
    });

    it('should return null for invalid configuration', () => {
      const config: BulkCopyConfig = {
        pattern: 'daily',
        interval: 1,
        occurrences: 3,
        startDate: 'invalid-date',
      };

      const endDate = calculateBulkCopyEndDate(config);
      expect(endDate).toBeNull();
    });
  });
});
