import { RecurringRule } from '@/types/appointment';

export interface RecurrencePattern {
  id: string;
  label: string;
  description: string;
  frequency: RecurringRule['frequency'];
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  month_of_year?: number;
}

export const RECURRENCE_PATTERNS: RecurrencePattern[] = [
  {
    id: 'daily',
    label: 'Daily',
    description: 'Every day',
    frequency: 'daily',
    interval: 1,
  },
  {
    id: 'weekdays',
    label: 'Every weekday',
    description: 'Monday to Friday',
    frequency: 'weekly',
    interval: 1,
    days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
  },
  {
    id: 'weekly',
    label: 'Weekly',
    description: 'Every week on the same day',
    frequency: 'weekly',
    interval: 1,
  },
  {
    id: 'biweekly',
    label: 'Every 2 weeks',
    description: 'Every other week',
    frequency: 'weekly',
    interval: 2,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    description: 'Every month on the same date',
    frequency: 'monthly',
    interval: 1,
  },
  {
    id: 'quarterly',
    label: 'Quarterly',
    description: 'Every 3 months',
    frequency: 'monthly',
    interval: 3,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    description: 'Every year on the same date',
    frequency: 'yearly',
    interval: 1,
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Custom interval',
    frequency: 'daily',
    interval: 1,
  },
];

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' },
];

/**
 * Generate the next occurrence dates for a recurring appointment
 */
export function generateOccurrenceDates(
  baseDate: string,
  rule: RecurringRule,
  count: number = 10
): string[] {
  const dates: string[] = [];
  const startDate = new Date(baseDate);

  for (let i = 0; i < count; i++) {
    const nextDate = getNextOccurrenceDate(startDate, rule, i);
    dates.push(nextDate.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Get the next occurrence date for a recurring appointment
 */
export function getNextOccurrenceDate(
  baseDate: Date,
  rule: RecurringRule,
  occurrence: number = 0
): Date {
  const date = new Date(baseDate);

  switch (rule.frequency) {
    case 'daily':
      date.setDate(date.getDate() + (rule.interval * occurrence));
      break;

    case 'weekly':
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        // For specific days of week, find the next occurrence
        if (occurrence === 0) {
          return date; // Return the base date for first occurrence
        }

        // Find the next occurrence from the base date
        let currentDate = new Date(baseDate);
        let foundOccurrences = 0;

        // Look ahead up to 8 weeks to find the next occurrence
        for (let week = 0; week < 8; week++) {
          for (const dayOfWeek of rule.days_of_week) {
            const targetDate = new Date(currentDate);
            const daysToAdd = (dayOfWeek - currentDate.getDay() + 7) % 7;
            targetDate.setDate(currentDate.getDate() + daysToAdd + (week * 7));

            if (targetDate > baseDate || (targetDate.getTime() === baseDate.getTime() && foundOccurrences === 0)) {
              foundOccurrences++;
              if (foundOccurrences === occurrence + 1) {
                return targetDate;
              }
            }
          }
        }

        // Fallback: add weeks if we can't find specific days
        date.setDate(date.getDate() + (rule.interval * 7 * occurrence));
      } else {
        date.setDate(date.getDate() + (rule.interval * 7 * occurrence));
      }
      break;

    case 'monthly':
      if (rule.day_of_month) {
        // For specific day of month
        const targetMonth = date.getMonth() + (rule.interval * occurrence);
        const targetYear = date.getFullYear();

        // Handle month/year overflow
        const newDate = new Date(targetYear, targetMonth, 1);
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const dayOfMonth = Math.min(rule.day_of_month, daysInMonth);

        newDate.setDate(dayOfMonth);
        return newDate;
      } else {
        date.setMonth(date.getMonth() + (rule.interval * occurrence));
      }
      break;

    case 'yearly':
      if (rule.month_of_year) {
        // For specific month of year
        const targetYear = date.getFullYear() + (rule.interval * occurrence);
        const newDate = new Date(targetYear, rule.month_of_year - 1, 1);

        if (rule.day_of_month) {
          const daysInMonth = new Date(targetYear, rule.month_of_year, 0).getDate();
          const dayOfMonth = Math.min(rule.day_of_month, daysInMonth);
          newDate.setDate(dayOfMonth);
        }

        return newDate;
      } else {
        // For yearly without specific month, handle leap year edge case
        const targetYear = date.getFullYear() + (rule.interval * occurrence);
        const newDate = new Date(date);

        // If the original date was Feb 29 and target year is not a leap year,
        // adjust to Feb 28 before setting the year
        if (date.getMonth() === 1 && date.getDate() === 29) {
          const isLeapYear = (year: number) =>
            (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

          if (!isLeapYear(targetYear)) {
            newDate.setDate(28); // Set to Feb 28 first
          }
        }

        newDate.setFullYear(targetYear);
        return newDate;
      }
      break;
  }

  return date;
}

/**
 * Validate a recurrence rule
 */
export function validateRecurrenceRule(rule: Partial<RecurringRule>): string[] {
  const errors: string[] = [];

  if (!rule.frequency) {
    errors.push('Frequency is required');
  }

  if (!rule.interval || rule.interval < 1) {
    errors.push('Interval must be at least 1');
  }

  if (rule.frequency === 'weekly' && rule.days_of_week) {
    if (rule.days_of_week.length === 0) {
      errors.push('At least one day of the week must be selected');
    }

    const invalidDays = rule.days_of_week.filter(day => day < 1 || day > 7);
    if (invalidDays.length > 0) {
      errors.push('Days of week must be between 1 (Monday) and 7 (Sunday)');
    }
  }

  if (rule.frequency === 'monthly' && rule.day_of_month) {
    if (rule.day_of_month < 1 || rule.day_of_month > 31) {
      errors.push('Day of month must be between 1 and 31');
    }
  }

  if (rule.frequency === 'yearly') {
    if (rule.month_of_year && (rule.month_of_year < 1 || rule.month_of_year > 12)) {
      errors.push('Month of year must be between 1 and 12');
    }
  }

  if (rule.end_date && rule.end_occurrences) {
    errors.push('Cannot specify both end date and number of occurrences');
  }

  if (rule.end_date) {
    const endDate = new Date(rule.end_date);
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end date');
    }
  }

  if (rule.end_occurrences && rule.end_occurrences < 1) {
    errors.push('Number of occurrences must be at least 1');
  }

  return errors;
}

/**
 * Check if a recurrence rule has an end condition
 */
export function hasEndCondition(rule: RecurringRule): boolean {
  return !!(rule.end_date || rule.end_occurrences);
}

/**
 * Get a human-readable description of a recurrence rule
 */
export function getRecurrenceDescription(rule: RecurringRule): string {
  const parts: string[] = [];

  // Frequency and interval
  if (rule.interval === 1) {
    const frequencyMap: Record<string, string> = {
      'daily': 'day',
      'weekly': 'week',
      'monthly': 'month',
      'yearly': 'year',
    };
    parts.push(`Every ${frequencyMap[rule.frequency] || rule.frequency}`);
  } else {
    parts.push(`Every ${rule.interval} ${rule.frequency}`);
  }

  // Days of week for weekly
  if (rule.frequency === 'weekly' && rule.days_of_week && rule.days_of_week.length > 0) {
    const dayNames = rule.days_of_week
      .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.short)
      .filter(Boolean);

    if (dayNames.length > 0) {
      parts.push(`on ${dayNames.join(', ')}`);
    }
  }

  // Day of month for monthly/yearly
  if ((rule.frequency === 'monthly' || rule.frequency === 'yearly') && rule.day_of_month) {
    parts.push(`on the ${rule.day_of_month}${getOrdinalSuffix(rule.day_of_month)}`);
  }

  // Month for yearly
  if (rule.frequency === 'yearly' && rule.month_of_year) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    parts.push(`in ${monthNames[rule.month_of_year - 1]}`);
  }

  // End condition
  if (rule.end_date) {
    parts.push(`until ${new Date(rule.end_date).toLocaleDateString()}`);
  } else if (rule.end_occurrences) {
    parts.push(`for ${rule.end_occurrences} occurrence${rule.end_occurrences > 1 ? 's' : ''}`);
  }

  return parts.join(' ');
}

/**
 * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

/**
 * Create a recurrence rule from a pattern
 */
export function createRuleFromPattern(pattern: RecurrencePattern, customInterval?: number): RecurringRule {
  return {
    frequency: pattern.frequency,
    interval: customInterval || pattern.interval,
    days_of_week: pattern.days_of_week,
    day_of_month: pattern.day_of_month,
    month_of_year: pattern.month_of_year,
  };
}

/**
 * Check if a date falls on a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Get the day of week number (1 = Monday, 7 = Sunday)
 */
export function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}
