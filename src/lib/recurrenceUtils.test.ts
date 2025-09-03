import { RecurringRule } from '@/types/appointment';
import {
    createRuleFromPattern,
    DAYS_OF_WEEK,
    generateOccurrenceDates,
    getDayOfWeek,
    getNextOccurrenceDate,
    getRecurrenceDescription,
    hasEndCondition,
    isWeekend,
    RECURRENCE_PATTERNS,
    validateRecurrenceRule,
} from './recurrenceUtils';

describe('recurrenceUtils', () => {
  describe('generateOccurrenceDates', () => {
    it('should generate daily occurrences', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
      };
      const baseDate = '2024-01-01';
      const dates = generateOccurrenceDates(baseDate, rule, 5);

      expect(dates).toEqual([
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
        '2024-01-04',
        '2024-01-05',
      ]);
    });

    it('should generate weekly occurrences', () => {
      const rule: RecurringRule = {
        frequency: 'weekly',
        interval: 1,
      };
      const baseDate = '2024-01-01'; // Monday
      const dates = generateOccurrenceDates(baseDate, rule, 3);

      expect(dates).toEqual([
        '2024-01-01',
        '2024-01-08',
        '2024-01-15',
      ]);
    });

    it('should generate weekly occurrences with specific days', () => {
      const rule: RecurringRule = {
        frequency: 'weekly',
        interval: 1,
        days_of_week: [1, 3, 5], // Monday, Wednesday, Friday
      };
      const baseDate = '2024-01-01'; // Monday
      const dates = generateOccurrenceDates(baseDate, rule, 5);

      expect(dates).toEqual([
        '2024-01-01', // Monday
        '2024-01-03', // Wednesday
        '2024-01-05', // Friday
        '2024-01-08', // Monday
        '2024-01-10', // Wednesday
      ]);
    });

    it('should generate monthly occurrences', () => {
      const rule: RecurringRule = {
        frequency: 'monthly',
        interval: 1,
      };
      const baseDate = '2024-01-15';
      const dates = generateOccurrenceDates(baseDate, rule, 3);

      expect(dates).toEqual([
        '2024-01-15',
        '2024-02-15',
        '2024-03-15',
      ]);
    });

    it('should generate yearly occurrences', () => {
      const rule: RecurringRule = {
        frequency: 'yearly',
        interval: 1,
      };
      const baseDate = '2024-01-15';
      const dates = generateOccurrenceDates(baseDate, rule, 3);

      expect(dates).toEqual([
        '2024-01-15',
        '2025-01-15',
        '2026-01-15',
      ]);
    });
  });

  describe('getNextOccurrenceDate', () => {
    it('should return the base date for first occurrence', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
      };
      const baseDate = new Date('2024-01-01');
      const result = getNextOccurrenceDate(baseDate, rule, 0);

      expect(result.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should calculate next daily occurrence', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 2,
      };
      const baseDate = new Date('2024-01-01');
      const result = getNextOccurrenceDate(baseDate, rule, 1);

      expect(result.toISOString().split('T')[0]).toBe('2024-01-03');
    });

    it('should handle leap year correctly', () => {
      const rule: RecurringRule = {
        frequency: 'yearly',
        interval: 1,
      };
      const baseDate = new Date('2024-02-29'); // Leap year
      const result = getNextOccurrenceDate(baseDate, rule, 1);

      // The result should be Feb 28 in 2025 (non-leap year)
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBe(28);
    });
  });

  describe('validateRecurrenceRule', () => {
    it('should validate a correct daily rule', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
      };
      const errors = validateRecurrenceRule(rule);

      expect(errors).toEqual([]);
    });

    it('should validate a correct weekly rule with days', () => {
      const rule: RecurringRule = {
        frequency: 'weekly',
        interval: 1,
        days_of_week: [1, 3, 5],
      };
      const errors = validateRecurrenceRule(rule);

      expect(errors).toEqual([]);
    });

    it('should reject rule without frequency', () => {
      const rule = { interval: 1 };
      const errors = validateRecurrenceRule(rule);

      expect(errors).toContain('Frequency is required');
    });

    it('should reject rule with invalid interval', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 0,
      };
      const errors = validateRecurrenceRule(rule);

      expect(errors).toContain('Interval must be at least 1');
    });

    it('should reject weekly rule without days', () => {
      const rule: RecurringRule = {
        frequency: 'weekly',
        interval: 1,
        days_of_week: [],
      };
      const errors = validateRecurrenceRule(rule);

      expect(errors).toContain('At least one day of the week must be selected');
    });

    it('should reject rule with both end date and occurrences', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
        end_date: '2024-12-31',
        end_occurrences: 10,
      };
      const errors = validateRecurrenceRule(rule);

      expect(errors).toContain('Cannot specify both end date and number of occurrences');
    });

    it('should reject invalid day of month', () => {
      const rule: RecurringRule = {
        frequency: 'monthly',
        interval: 1,
        day_of_month: 32,
      };
      const errors = validateRecurrenceRule(rule);

      expect(errors).toContain('Day of month must be between 1 and 31');
    });

    it('should reject invalid month of year', () => {
      const rule: RecurringRule = {
        frequency: 'yearly',
        interval: 1,
        month_of_year: 13,
      };
      const errors = validateRecurrenceRule(rule);

      expect(errors).toContain('Month of year must be between 1 and 12');
    });
  });

  describe('hasEndCondition', () => {
    it('should return false for rule without end condition', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
      };

      expect(hasEndCondition(rule)).toBe(false);
    });

    it('should return true for rule with end date', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
        end_date: '2024-12-31',
      };

      expect(hasEndCondition(rule)).toBe(true);
    });

    it('should return true for rule with end occurrences', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
        end_occurrences: 10,
      };

      expect(hasEndCondition(rule)).toBe(true);
    });
  });

  describe('getRecurrenceDescription', () => {
    it('should describe daily recurrence', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
      };

      expect(getRecurrenceDescription(rule)).toBe('Every day');
    });

    it('should describe weekly recurrence with interval', () => {
      const rule: RecurringRule = {
        frequency: 'weekly',
        interval: 2,
      };

      expect(getRecurrenceDescription(rule)).toBe('Every 2 weekly');
    });

    it('should describe weekly recurrence with specific days', () => {
      const rule: RecurringRule = {
        frequency: 'weekly',
        interval: 1,
        days_of_week: [1, 3, 5],
      };

      expect(getRecurrenceDescription(rule)).toBe('Every week on Mon, Wed, Fri');
    });

    it('should describe monthly recurrence with day of month', () => {
      const rule: RecurringRule = {
        frequency: 'monthly',
        interval: 1,
        day_of_month: 15,
      };

      expect(getRecurrenceDescription(rule)).toBe('Every month on the 15th');
    });

    it('should describe yearly recurrence with month and day', () => {
      const rule: RecurringRule = {
        frequency: 'yearly',
        interval: 1,
        month_of_year: 6,
        day_of_month: 15,
      };

      expect(getRecurrenceDescription(rule)).toBe('Every year on the 15th in June');
    });

    it('should include end date in description', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
        end_date: '2024-12-31',
      };

      const description = getRecurrenceDescription(rule);
      expect(description).toContain('until');
    });

    it('should include end occurrences in description', () => {
      const rule: RecurringRule = {
        frequency: 'daily',
        interval: 1,
        end_occurrences: 10,
      };

      const description = getRecurrenceDescription(rule);
      expect(description).toContain('for 10 occurrences');
    });
  });

  describe('createRuleFromPattern', () => {
    it('should create rule from daily pattern', () => {
      const pattern = RECURRENCE_PATTERNS.find(p => p.id === 'daily')!;
      const rule = createRuleFromPattern(pattern);

      expect(rule).toEqual({
        frequency: 'daily',
        interval: 1,
      });
    });

    it('should create rule from pattern with custom interval', () => {
      const pattern = RECURRENCE_PATTERNS.find(p => p.id === 'daily')!;
      const rule = createRuleFromPattern(pattern, 3);

      expect(rule).toEqual({
        frequency: 'daily',
        interval: 3,
      });
    });

    it('should create rule from weekdays pattern', () => {
      const pattern = RECURRENCE_PATTERNS.find(p => p.id === 'weekdays')!;
      const rule = createRuleFromPattern(pattern);

      expect(rule).toEqual({
        frequency: 'weekly',
        interval: 1,
        days_of_week: [1, 2, 3, 4, 5],
      });
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2024-01-06'); // Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date('2024-01-07'); // Sunday
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for Monday', () => {
      const monday = new Date('2024-01-01'); // Monday
      expect(isWeekend(monday)).toBe(false);
    });
  });

  describe('getDayOfWeek', () => {
    it('should return 1 for Monday', () => {
      const monday = new Date('2024-01-01'); // Monday
      expect(getDayOfWeek(monday)).toBe(1);
    });

    it('should return 7 for Sunday', () => {
      const sunday = new Date('2024-01-07'); // Sunday
      expect(getDayOfWeek(sunday)).toBe(7);
    });

    it('should return 5 for Friday', () => {
      const friday = new Date('2024-01-05'); // Friday
      expect(getDayOfWeek(friday)).toBe(5);
    });
  });

  describe('RECURRENCE_PATTERNS', () => {
    it('should have all required patterns', () => {
      const patternIds = RECURRENCE_PATTERNS.map(p => p.id);

      expect(patternIds).toContain('daily');
      expect(patternIds).toContain('weekdays');
      expect(patternIds).toContain('weekly');
      expect(patternIds).toContain('biweekly');
      expect(patternIds).toContain('monthly');
      expect(patternIds).toContain('quarterly');
      expect(patternIds).toContain('yearly');
    });

    it('should have valid frequency values', () => {
      const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];

      RECURRENCE_PATTERNS.forEach(pattern => {
        expect(validFrequencies).toContain(pattern.frequency);
      });
    });

    it('should have positive intervals', () => {
      RECURRENCE_PATTERNS.forEach(pattern => {
        expect(pattern.interval).toBeGreaterThan(0);
      });
    });
  });

  describe('DAYS_OF_WEEK', () => {
    it('should have 7 days', () => {
      expect(DAYS_OF_WEEK).toHaveLength(7);
    });

    it('should have correct day values', () => {
      const values = DAYS_OF_WEEK.map(d => d.value);
      expect(values).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('should have correct day labels', () => {
      const labels = DAYS_OF_WEEK.map(d => d.label);
      expect(labels).toEqual([
        'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday', 'Sunday',
      ]);
    });
  });
});
