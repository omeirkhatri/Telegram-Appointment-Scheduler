import type { BulkCopyConfig } from '@/types/bulkCopy';
import { addDays, addMonths, addWeeks, format, isValid, parseISO } from 'date-fns';

/**
 * Generate dates based on bulk copy pattern
 */
export function generateBulkCopyDates(config: BulkCopyConfig): string[] {
  const dates: string[] = [];
  const startDate = parseISO(config.startDate);

  if (!isValid(startDate)) {
    throw new Error('Invalid start date');
  }

  switch (config.pattern) {
    case 'daily':
      for (let i = 1; i <= config.occurrences; i++) {
        const date = addDays(startDate, config.interval * i);
        dates.push(format(date, 'yyyy-MM-dd'));
      }
      break;

    case 'weekly':
      for (let i = 1; i <= config.occurrences; i++) {
        const date = addWeeks(startDate, config.interval * i);
        dates.push(format(date, 'yyyy-MM-dd'));
      }
      break;

    case 'monthly':
      for (let i = 1; i <= config.occurrences; i++) {
        const date = addMonths(startDate, config.interval * i);
        dates.push(format(date, 'yyyy-MM-dd'));
      }
      break;

    case 'custom':
      if (!config.customDates || config.customDates.length === 0) {
        throw new Error('Custom dates must be provided for custom pattern');
      }
      // Validate and sort custom dates
      const validDates = config.customDates
        .map(dateStr => {
          const date = parseISO(dateStr);
          return isValid(date) ? format(date, 'yyyy-MM-dd') : null;
        })
        .filter((date): date is string => date !== null)
        .sort();

      dates.push(...validDates.slice(0, config.occurrences));
      break;

    default:
      throw new Error(`Unsupported bulk copy pattern: ${config.pattern}`);
  }

  // Filter by end date if provided
  if (config.endDate) {
    const endDate = parseISO(config.endDate);
    if (isValid(endDate)) {
      return dates.filter(date => parseISO(date) <= endDate);
    }
  }

  return dates;
}

/**
 * Validate bulk copy configuration
 */
export function validateBulkCopyConfig(config: BulkCopyConfig): string[] {
  const errors: string[] = [];

  if (!config.pattern) {
    errors.push('Pattern is required');
  }

  if (!config.startDate) {
    errors.push('Start date is required');
  } else {
    const startDate = parseISO(config.startDate);
    if (!isValid(startDate)) {
      errors.push('Invalid start date format');
    }
  }

  if (config.occurrences <= 0) {
    errors.push('Occurrences must be greater than 0');
  }

  if (config.occurrences > 100) {
    errors.push('Maximum 100 occurrences allowed per bulk copy operation');
  }

  if (config.interval <= 0) {
    errors.push('Interval must be greater than 0');
  }

  if (config.pattern === 'custom' && (!config.customDates || config.customDates.length === 0)) {
    errors.push('Custom dates are required for custom pattern');
  }

  if (config.endDate) {
    const endDate = parseISO(config.endDate);
    if (!isValid(endDate)) {
      errors.push('Invalid end date format');
    } else {
      const startDate = parseISO(config.startDate);
      if (isValid(startDate) && endDate <= startDate) {
        errors.push('End date must be after start date');
      }
    }
  }

  return errors;
}

/**
 * Get default bulk copy configuration
 */
export function getDefaultBulkCopyConfig(): BulkCopyConfig {
  const today = new Date();
  const nextWeek = addDays(today, 7);

  return {
    pattern: 'daily',
    interval: 1,
    occurrences: 5,
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(nextWeek, 'yyyy-MM-dd'),
  };
}

/**
 * Format bulk copy pattern for display
 */
export function formatBulkCopyPattern(config: BulkCopyConfig): string {
  switch (config.pattern) {
    case 'daily':
      return `Every ${config.interval} day${config.interval > 1 ? 's' : ''}`;
    case 'weekly':
      return `Every ${config.interval} week${config.interval > 1 ? 's' : ''}`;
    case 'monthly':
      return `Every ${config.interval} month${config.interval > 1 ? 's' : ''}`;
    case 'custom':
      return `Custom dates (${config.customDates?.length || 0} dates)`;
    default:
      return 'Unknown pattern';
  }
}

/**
 * Calculate estimated end date for bulk copy
 */
export function calculateBulkCopyEndDate(config: BulkCopyConfig): string | null {
  try {
    const dates = generateBulkCopyDates(config);
    if (dates.length === 0) return null;

    const lastDate = dates[dates.length - 1];
    return lastDate;
  } catch {
    return null;
  }
}
