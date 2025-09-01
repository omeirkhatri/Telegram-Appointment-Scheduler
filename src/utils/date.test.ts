import {
  formatDate,
  formatTime,
  formatDateTime,
  isToday,
  isPast,
  isFuture,
  getRelativeTime,
  TZ,
  DATE_FMT,
  TIME_FMT,
} from './date';

describe('Date Utilities', () => {
  const testDate = new Date('2024-01-15T10:30:00Z');

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = formatDate(testDate);
      expect(result).toBe('15/01/2024');
    });

    it('should handle string input', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toBe('15/01/2024');
    });

    it('should handle invalid date', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Invalid date');
    });

    it('should use custom format', () => {
      const result = formatDate(testDate, 'yyyy-MM-dd');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const result = formatTime(testDate);
      expect(result).toBe('14:30'); // UTC+4 timezone
    });

    it('should handle string input', () => {
      const result = formatTime('2024-01-15T10:30:00Z');
      expect(result).toBe('14:30');
    });

    it('should handle invalid time', () => {
      const result = formatTime('invalid-time');
      expect(result).toBe('Invalid time');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime correctly', () => {
      const result = formatDateTime(testDate);
      expect(result).toBe('15/01/2024 14:30');
    });

    it('should handle string input', () => {
      const result = formatDateTime('2024-01-15T10:30:00Z');
      expect(result).toBe('15/01/2024 14:30');
    });

    it('should handle invalid datetime', () => {
      const result = formatDateTime('invalid-datetime');
      expect(result).toBe('Invalid datetime');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      const result = isToday(today);
      expect(result).toBe(true);
    });

    it('should return false for other dates', () => {
      const result = isToday(testDate);
      expect(result).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01');
      const result = isPast(pastDate);
      expect(result).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01');
      const result = isPast(futureDate);
      expect(result).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date('2030-01-01');
      const result = isFuture(futureDate);
      expect(result).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date('2020-01-01');
      const result = isFuture(pastDate);
      expect(result).toBe(false);
    });
  });

  describe('getRelativeTime', () => {
    it('should return "now" for current time', () => {
      const now = new Date();
      const result = getRelativeTime(now);
      expect(result).toBe('now');
    });

    it('should return minutes for recent times', () => {
      const recent = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const result = getRelativeTime(recent);
      expect(result).toContain('30 minutes from now');
    });

    it('should return hours for times within 24 hours', () => {
      const recent = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const result = getRelativeTime(recent);
      expect(result).toContain('2 hours from now');
    });

    it('should return days for times within a week', () => {
      const recent = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      const result = getRelativeTime(recent);
      expect(result).toContain('3 days from now');
    });

    it('should return formatted date for older times', () => {
      const old = new Date('2020-01-01');
      const result = getRelativeTime(old);
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('Constants', () => {
    it('should have correct timezone', () => {
      expect(TZ).toBe('Asia/Dubai');
    });

    it('should have correct date format', () => {
      expect(DATE_FMT).toBe('dd/MM/yyyy');
    });

    it('should have correct time format', () => {
      expect(TIME_FMT).toBe('HH:mm');
    });
  });
});
