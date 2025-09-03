'use client';

import { staffFormSchema, type StaffFormData } from '@/lib/validations/staff';
import type { Staff } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface StaffFormProps {
  staff?: Staff;
  onSubmit: (data: StaffFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const STAFF_TYPES = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'physiotherapist', label: 'Physiotherapist' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'driver', label: 'Driver' },
  { value: 'lab_technician', label: 'Lab Technician' },
] as const;

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
] as const;

export function StaffForm({ staff, onSubmit, onCancel, isLoading = false }: StaffFormProps) {
  const [calendarValidationError, setCalendarValidationError] = useState<string | null>(null);
  const [isValidatingCalendar, setIsValidatingCalendar] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
    trigger,
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      first_name: staff?.first_name || '',
      last_name: staff?.last_name || '',
      staff_type: staff?.staff_type || 'doctor',
      specialization: staff?.specialization || '',
      phone: staff?.phone || '',
      email: staff?.email || '',
      google_calendar_id: staff?.google_calendar_id || '',
      available_days: staff?.available_days || [1, 2, 3, 4, 5],
      working_hours_start: staff?.working_hours_start || '09:00',
      working_hours_end: staff?.working_hours_end || '17:00',
      status: staff?.status || 'active',
      email_notifications_enabled: staff?.email_notifications_enabled ?? true,
    },
  });

  const watchedCalendarId = watch('google_calendar_id');

  const validateGoogleCalendar = async () => {
    if (!watchedCalendarId) {
      setCalendarValidationError(null);
      return;
    }

    setIsValidatingCalendar(true);
    setCalendarValidationError(null);

    try {
      const response = await fetch('/api/staff/validate-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendarId: watchedCalendarId }),
      });

      const data = await response.json();

      if (!data.success) {
        setCalendarValidationError(data.error);
      } else {
        setCalendarValidationError(null);
      }
    } catch (error) {
      setCalendarValidationError('Failed to validate calendar ID');
    } finally {
      setIsValidatingCalendar(false);
    }
  };

  const handleDayToggle = (day: number) => {
    const currentDays = watch('available_days');
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];

    setValue('available_days', newDays);
    trigger('available_days');
  };

  const handleFormSubmit = async (data: StaffFormData) => {
    try {
      await onSubmit(data);
      reset();
      setCalendarValidationError(null);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              {...register('first_name')}
              type="text"
              id="first_name"
              data-testid="staff-first-name"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.first_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter first name"
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600" data-testid="staff-first-name-error">{errors.first_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              {...register('last_name')}
              type="text"
              id="last_name"
              data-testid="staff-last-name"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.last_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter last name"
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600" data-testid="staff-last-name-error">{errors.last_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="staff_type" className="block text-sm font-medium text-gray-700 mb-1">
              Staff Type *
            </label>
            <select
              {...register('staff_type')}
              id="staff_type"
              data-testid="staff-type"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.staff_type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {STAFF_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.staff_type && (
              <p className="mt-1 text-sm text-red-600" data-testid="staff-type-error">{errors.staff_type.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
              Specialization
            </label>
            <input
              {...register('specialization')}
              type="text"
              id="specialization"
              data-testid="staff-specialization"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.specialization ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Cardiology, Pediatrics"
            />
            {errors.specialization && (
              <p className="mt-1 text-sm text-red-600">{errors.specialization.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              {...register('phone')}
              type="tel"
              id="phone"
              data-testid="staff-phone"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+971 50 123 4567"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600" data-testid="staff-phone-error">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              data-testid="staff-email"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="staff@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600" data-testid="staff-email-error">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="google_calendar_id" className="block text-sm font-medium text-gray-700 mb-1">
            Google Calendar ID
          </label>
          <div className="flex space-x-2">
            <input
              {...register('google_calendar_id')}
              type="email"
              id="google_calendar_id"
              data-testid="staff-google-calendar-id"
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.google_calendar_id || calendarValidationError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="staff@example.com"
            />
            <button
              type="button"
              onClick={validateGoogleCalendar}
              disabled={!watchedCalendarId || isValidatingCalendar}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidatingCalendar ? 'Validating...' : 'Validate'}
            </button>
          </div>
          {errors.google_calendar_id && (
            <p className="mt-1 text-sm text-red-600">{errors.google_calendar_id.message}</p>
          )}
          {calendarValidationError && (
            <p className="mt-1 text-sm text-red-600">{calendarValidationError}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Enter the email address associated with the Google Calendar
          </p>
        </div>
      </div>

      {/* Working Schedule */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Schedule</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Days *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <label key={day.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={watch('available_days').includes(day.value)}
                    onChange={() => handleDayToggle(day.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{day.label}</span>
                </label>
              ))}
            </div>
            {errors.available_days && (
              <p className="mt-1 text-sm text-red-600">{errors.available_days.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="working_hours_start" className="block text-sm font-medium text-gray-700 mb-1">
                Working Hours Start *
              </label>
              <input
                {...register('working_hours_start')}
                type="time"
                id="working_hours_start"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.working_hours_start ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.working_hours_start && (
                <p className="mt-1 text-sm text-red-600">{errors.working_hours_start.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="working_hours_end" className="block text-sm font-medium text-gray-700 mb-1">
                Working Hours End *
              </label>
              <input
                {...register('working_hours_end')}
                type="time"
                id="working_hours_end"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.working_hours_end ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.working_hours_end && (
                <p className="mt-1 text-sm text-red-600">{errors.working_hours_end.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status and Preferences */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status and Preferences</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              {...register('status')}
              id="status"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.status ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                {...register('email_notifications_enabled')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Enable Email Notifications
              </span>
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Receive email notifications for appointments and schedule changes
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          data-testid="staff-cancel"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="staff-submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? 'Saving...' : staff ? 'Update Staff' : 'Create Staff'}
        </button>
      </div>
    </form>
  );
}
