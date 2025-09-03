'use client';

import {
    DAYS_OF_WEEK,
    generateOccurrenceDates,
    getRecurrenceDescription,
    RECURRENCE_PATTERNS,
    validateRecurrenceRule,
} from '@/lib/recurrenceUtils';
import { RecurringRule } from '@/types/appointment';
import { AlertCircle, Calendar, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RecurrenceRuleBuilderProps {
  value?: RecurringRule;
  onChange: (rule: RecurringRule | undefined) => void;
  baseDate: string;
  disabled?: boolean;
}

export function RecurrenceRuleBuilder({
  value,
  onChange,
  baseDate,
  disabled = false,
}: RecurrenceRuleBuilderProps) {
  const [isEnabled, setIsEnabled] = useState(!!value);
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [customInterval, setCustomInterval] = useState<number>(1);
  const [customFrequency, setCustomFrequency] = useState<string>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [monthOfYear, setMonthOfYear] = useState<number>(1);
  const [endDate, setEndDate] = useState<string>('');
  const [endOccurrences, setEndOccurrences] = useState<number>(0);
  const [endType, setEndType] = useState<'never' | 'date' | 'occurrences'>('never');
  const [previewDates, setPreviewDates] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize form from existing value
  useEffect(() => {
    if (value) {
      setIsEnabled(true);

      // Find matching pattern
      const matchingPattern = RECURRENCE_PATTERNS.find(pattern =>
        pattern.frequency === value.frequency &&
        pattern.interval === value.interval &&
        JSON.stringify(pattern.days_of_week) === JSON.stringify(value.days_of_week) &&
        pattern.day_of_month === value.day_of_month &&
        pattern.month_of_year === value.month_of_year,
      );

      if (matchingPattern) {
        setSelectedPattern(matchingPattern.id);
      } else {
        // For weekly patterns with specific days, use the weekly pattern
        if (value.frequency === 'weekly' && value.days_of_week && value.days_of_week.length > 0) {
          setSelectedPattern('weekly');
          setSelectedDays(value.days_of_week);
        } else {
          setSelectedPattern('custom');
          setCustomInterval(value.interval);
          setCustomFrequency(value.frequency);
        }
      }

      // Set other fields only if not already set above
      if (!(value.frequency === 'weekly' && value.days_of_week && value.days_of_week.length > 0)) {
        setSelectedDays(value.days_of_week || []);
      }
      setDayOfMonth(value.day_of_month || 1);
      setMonthOfYear(value.month_of_year || 1);
      setEndDate(value.end_date || '');
      setEndOccurrences(value.end_occurrences || 0);
      setEndType(value.end_date ? 'date' : value.end_occurrences ? 'occurrences' : 'never');
    }
  }, [value]);

  // Update preview when rule changes
  useEffect(() => {
    if (isEnabled && selectedPattern) {
      updatePreview();
    }
  }, [isEnabled, selectedPattern, customInterval, customFrequency, selectedDays, dayOfMonth, monthOfYear, endDate, endOccurrences, endType, baseDate]);

  const updatePreview = () => {
    try {
      // Validate baseDate first
      if (!baseDate || isNaN(new Date(baseDate).getTime())) {
        setPreviewDates([]);
        setErrors(['Invalid base date']);
        onChange(undefined);
        return;
      }

      const rule = buildRecurrenceRule();
      if (rule) {
        const dates = generateOccurrenceDates(baseDate, rule, 8);
        setPreviewDates(dates);

        const validationErrors = validateRecurrenceRule(rule);
        setErrors(validationErrors);

        if (validationErrors.length === 0) {
          onChange(rule);
        } else {
          onChange(undefined);
        }
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      setPreviewDates([]);
      setErrors(['Error generating recurrence preview']);
      onChange(undefined);
    }
  };

  const buildRecurrenceRule = (): RecurringRule | undefined => {
    if (!selectedPattern) return undefined;

    const pattern = RECURRENCE_PATTERNS.find(p => p.id === selectedPattern);
    if (!pattern) return undefined;

    const rule: RecurringRule = {
      frequency: selectedPattern === 'custom' ? customFrequency as any : pattern.frequency,
      interval: selectedPattern === 'custom' ? customInterval : pattern.interval,
    };

    // Add pattern-specific fields
    if (pattern.frequency === 'weekly') {
      if (selectedPattern === 'weekly' && selectedDays.length > 0) {
        rule.days_of_week = selectedDays;
      } else if (pattern.days_of_week) {
        rule.days_of_week = pattern.days_of_week;
      }
    }

    if (pattern.frequency === 'monthly' && dayOfMonth) {
      rule.day_of_month = dayOfMonth;
    }

    if (pattern.frequency === 'yearly') {
      if (monthOfYear) {
        rule.month_of_year = monthOfYear;
      }
      if (dayOfMonth) {
        rule.day_of_month = dayOfMonth;
      }
    }

    // Add end conditions
    if (endType === 'date' && endDate) {
      rule.end_date = endDate;
    } else if (endType === 'occurrences' && endOccurrences > 0) {
      rule.end_occurrences = endOccurrences;
    }

    return rule;
  };

  const handlePatternChange = (patternId: string) => {
    setSelectedPattern(patternId);

    if (patternId !== 'custom') {
      const pattern = RECURRENCE_PATTERNS.find(p => p.id === patternId);
      if (pattern) {
        setCustomInterval(pattern.interval);
        setSelectedDays(pattern.days_of_week || []);
        setDayOfMonth(pattern.day_of_month || 1);
        setMonthOfYear(pattern.month_of_year || 1);
      }
    }
  };

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort(),
    );
  };

  const handleEnableToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      onChange(undefined);
      setPreviewDates([]);
      setErrors([]);
    }
  };

  if (!isEnabled) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={false}
            onChange={(e) => handleEnableToggle(e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label className="text-lg font-semibold text-gray-900">Recurring Appointment</label>
        </div>
        <p className="text-sm text-gray-500">
          Enable to create a recurring appointment with custom patterns
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center space-x-2 mb-6">
        <input
          type="checkbox"
          checked={true}
          onChange={(e) => handleEnableToggle(e.target.checked)}
          disabled={disabled}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label className="text-lg font-semibold text-gray-900">Recurring Appointment</label>
      </div>

      <div className="space-y-6">
        {/* Pattern Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Recurrence Pattern
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RECURRENCE_PATTERNS.map((pattern) => (
              <button
                key={pattern.id}
                type="button"
                onClick={() => handlePatternChange(pattern.id)}
                disabled={disabled}
                className={`p-3 text-left border rounded-lg transition-colors ${
                  selectedPattern === pattern.id
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="font-medium">{pattern.label}</div>
                <div className="text-sm text-gray-500">{pattern.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Interval */}
        {selectedPattern === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={customFrequency}
                onChange={(e) => setCustomFrequency(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repeat Every
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={customInterval}
                  onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)}
                  disabled={disabled}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {customFrequency === 'daily' ? 'days' :
                   customFrequency === 'weekly' ? 'weeks' :
                   customFrequency === 'monthly' ? 'months' : 'years'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Days of Week Selection (for weekly patterns) */}
        {selectedPattern === 'weekly' && (
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
        {(selectedPattern === 'monthly' || selectedPattern === 'yearly') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day of Month
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
              disabled={disabled}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Month of Year (for yearly patterns) */}
        {selectedPattern === 'yearly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={monthOfYear}
              onChange={(e) => setMonthOfYear(parseInt(e.target.value))}
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

        {/* End Conditions */}
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
                onChange={(e) => setEndType(e.target.value as any)}
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
                onChange={(e) => setEndType(e.target.value as any)}
                disabled={disabled}
                className="mr-2"
              />
              <span>End on date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
                onChange={(e) => setEndType(e.target.value as any)}
                disabled={disabled}
                className="mr-2"
              />
              <span>End after:</span>
              <input
                type="number"
                min="1"
                value={endOccurrences}
                onChange={(e) => setEndOccurrences(parseInt(e.target.value) || 0)}
                disabled={disabled || endType !== 'occurrences'}
                className="ml-2 w-20 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-1">occurrences</span>
            </label>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h4 className="font-medium text-red-900">Validation Errors</h4>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview */}
        {previewDates.length > 0 && errors.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900">Preview</h4>
            </div>
            <p className="text-sm text-green-700 mb-3">
              {getRecurrenceDescription(buildRecurrenceRule()!)}
            </p>
            <div className="text-sm text-green-700">
              <strong>Next occurrences:</strong>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {previewDates.slice(0, 8).map((date, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
