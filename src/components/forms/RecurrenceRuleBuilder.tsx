'use client';

import { RecurringRule } from '@/types/appointment';
import { Calendar } from 'lucide-react';
import { useState } from 'react';

interface RecurrenceRuleBuilderProps {
  value?: RecurringRule;
  onChange: (rule: RecurringRule | undefined) => void;
  baseDate: string;
  disabled?: boolean;
}

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Every weekday (Monday to Friday)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' },
];

export function RecurrenceRuleBuilder({
  value,
  onChange,
  baseDate,
  disabled = false,
}: RecurrenceRuleBuilderProps) {
  // Simple state - no complex effects
  const [recurrenceType, setRecurrenceType] = useState<string>(() => {
    if (!value) return 'none';

    // Simple pattern matching
    if (value.frequency === 'daily' && value.interval === 1) return 'daily';
    if (value.frequency === 'weekly' && value.interval === 1) {
      if (value.days_of_week?.length === 5 &&
          value.days_of_week.includes(1) && value.days_of_week.includes(2) &&
          value.days_of_week.includes(3) && value.days_of_week.includes(4) &&
          value.days_of_week.includes(5)) {
        return 'weekdays';
      }
      return 'weekly';
    }
    if (value.frequency === 'weekly' && value.interval === 2) return 'biweekly';
    if (value.frequency === 'monthly' && value.interval === 1) return 'monthly';
    if (value.frequency === 'yearly' && value.interval === 1) return 'yearly';

    return 'none';
  });

  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    if (value?.days_of_week) return value.days_of_week;
    return [1]; // Default to Monday
  });

  const [dayOfMonth, setDayOfMonth] = useState<number>(() => {
    return value?.day_of_month || 1;
  });

  const [monthOfYear, setMonthOfYear] = useState<number>(() => {
    return value?.month_of_year || 1;
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return value?.end_date || '';
  });

  const [endOccurrences, setEndOccurrences] = useState<number>(() => {
    return value?.end_occurrences || 0;
  });

  const [endType, setEndType] = useState<'never' | 'date' | 'occurrences'>(() => {
    if (value?.end_date) return 'date';
    if (value?.end_occurrences) return 'occurrences';
    return 'never';
  });

  // Simple function to build rule - no useCallback, no complex dependencies
  const buildRule = (): RecurringRule | undefined => {
    if (recurrenceType === 'none') return undefined;

    const rule: RecurringRule = {
      frequency: 'daily',
      interval: 1,
    };

    switch (recurrenceType) {
      case 'daily':
        rule.frequency = 'daily';
        rule.interval = 1;
        break;
      case 'weekdays':
        rule.frequency = 'weekly';
        rule.interval = 1;
        rule.days_of_week = [1, 2, 3, 4, 5];
        break;
      case 'weekly':
        rule.frequency = 'weekly';
        rule.interval = 1;
        rule.days_of_week = selectedDays;
        break;
      case 'biweekly':
        rule.frequency = 'weekly';
        rule.interval = 2;
        rule.days_of_week = selectedDays;
        break;
      case 'monthly':
        rule.frequency = 'monthly';
        rule.interval = 1;
        rule.day_of_month = dayOfMonth;
        break;
      case 'yearly':
        rule.frequency = 'yearly';
        rule.interval = 1;
        rule.day_of_month = dayOfMonth;
        rule.month_of_year = monthOfYear;
        break;
    }

    // Add end conditions
    if (endType === 'date' && endDate) {
      rule.end_date = endDate;
    } else if (endType === 'occurrences' && endOccurrences > 0) {
      rule.end_occurrences = endOccurrences;
    }

    return rule;
  };

  // Simple handler - no complex effects
  const handleRecurrenceChange = (type: string) => {
    setRecurrenceType(type);

    // Immediately update the parent
    if (type === 'none') {
      onChange(undefined);
    } else {
      // Build rule with current state
      const rule = buildRule();
      onChange(rule);
    }
  };

  const handleDayToggle = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day].sort();

    setSelectedDays(newDays);

    // Update parent immediately
    if (recurrenceType === 'weekly' || recurrenceType === 'biweekly') {
      const rule = buildRule();
      rule.days_of_week = newDays;
      onChange(rule);
    }
  };

  const handleDayOfMonthChange = (day: number) => {
    setDayOfMonth(day);

    // Update parent immediately
    if (recurrenceType === 'monthly' || recurrenceType === 'yearly') {
      const rule = buildRule();
      rule.day_of_month = day;
      onChange(rule);
    }
  };

  const handleMonthChange = (month: number) => {
    setMonthOfYear(month);

    // Update parent immediately
    if (recurrenceType === 'yearly') {
      const rule = buildRule();
      rule.month_of_year = month;
      onChange(rule);
    }
  };

  const handleEndTypeChange = (type: 'never' | 'date' | 'occurrences') => {
    setEndType(type);

    // Update parent immediately
    const rule = buildRule();
    if (type === 'date' && endDate) {
      rule.end_date = endDate;
    } else if (type === 'occurrences' && endOccurrences > 0) {
      rule.end_occurrences = endOccurrences;
    }
    onChange(rule);
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);

    // Update parent immediately
    if (endType === 'date') {
      const rule = buildRule();
      rule.end_date = date;
      onChange(rule);
    }
  };

  const handleEndOccurrencesChange = (count: number) => {
    setEndOccurrences(count);

    // Update parent immediately
    if (endType === 'occurrences') {
      const rule = buildRule();
      rule.end_occurrences = count;
      onChange(rule);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="space-y-4">
        {/* Simple Recurrence Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recurrence
          </label>
          <select
            value={recurrenceType}
            onChange={(e) => handleRecurrenceChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Days of Week Selection (for weekly patterns) */}
        {(recurrenceType === 'weekly' || recurrenceType === 'biweekly') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Days of the Week
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  disabled={disabled}
                  className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                    selectedDays.includes(day.value)
                      ? 'border-blue-500 bg-blue-100 text-blue-900'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {day.short}
                </button>
              ))}
            </div>
            {selectedDays.length === 0 && (
              <p className="text-sm text-red-600 mt-1">Please select at least one day</p>
            )}
          </div>
        )}

        {/* Day of Month (for monthly/yearly patterns) */}
        {(recurrenceType === 'monthly' || recurrenceType === 'yearly') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day of Month
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={(e) => handleDayOfMonthChange(parseInt(e.target.value) || 1)}
              disabled={disabled}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Month of Year (for yearly patterns) */}
        {recurrenceType === 'yearly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={monthOfYear}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December',
              ].map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* End Conditions - only show for recurring appointments */}
        {recurrenceType !== 'none' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              End Condition
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="never"
                  checked={endType === 'never'}
                  onChange={(e) => handleEndTypeChange(e.target.value as any)}
                  disabled={disabled}
                  className="mr-2"
                />
                <span>Never end</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="date"
                  checked={endType === 'date'}
                  onChange={(e) => handleEndTypeChange(e.target.value as any)}
                  disabled={disabled}
                  className="mr-2"
                />
                <span>End on date:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  disabled={disabled || endType !== 'date'}
                  className="ml-2 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="occurrences"
                  checked={endType === 'occurrences'}
                  onChange={(e) => handleEndTypeChange(e.target.value as any)}
                  disabled={disabled}
                  className="mr-2"
                />
                <span>End after:</span>
                <input
                  type="number"
                  min="1"
                  value={endOccurrences}
                  onChange={(e) => handleEndOccurrencesChange(parseInt(e.target.value) || 0)}
                  disabled={disabled || endType !== 'occurrences'}
                  className="ml-2 w-20 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-1">occurrences</span>
              </label>
            </div>
          </div>
        )}

        {/* Simple Preview */}
        {recurrenceType !== 'none' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">Recurring Appointment</h4>
            </div>
            <p className="text-sm text-blue-700">
              {recurrenceType === 'daily' && 'Repeats every day'}
              {recurrenceType === 'weekdays' && 'Repeats every weekday (Monday to Friday)'}
              {recurrenceType === 'weekly' && `Repeats every week on ${selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short).join(', ')}`}
              {recurrenceType === 'biweekly' && `Repeats every 2 weeks on ${selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short).join(', ')}`}
              {recurrenceType === 'monthly' && `Repeats every month on the ${dayOfMonth}${dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'}`}
              {recurrenceType === 'yearly' && `Repeats every year on ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][monthOfYear - 1]} ${dayOfMonth}${dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'}`}
              {endType === 'date' && endDate && ` until ${new Date(endDate).toLocaleDateString()}`}
              {endType === 'occurrences' && endOccurrences > 0 && ` for ${endOccurrences} occurrence${endOccurrences > 1 ? 's' : ''}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
