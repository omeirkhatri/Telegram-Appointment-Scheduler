'use client';

import { PatientCombobox } from '@/components/ui/PatientCombobox';
import { TimePicker } from '@/components/ui/TimePicker';
import { appointmentFormSchema, type AppointmentFormData } from '@/lib/validations/appointment';
import type { Appointment, Patient, Staff, StaffAssignment } from '@/types';
import { formatTimeToHHMM } from '@/utils/timezone';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { RecurrenceRuleBuilder } from './RecurrenceRuleBuilder';

interface AppointmentFormProps {
  appointment?: Appointment;
  patients?: Patient[];
  staff?: Staff[];
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  staffAssignments?: StaffAssignment[];
}

const APPOINTMENT_TYPES = [
  { value: 'doctor_on_call', label: 'Doctor on Call' },
  { value: 'lab_test', label: 'Lab Test' },
  { value: 'teleconsultation', label: 'Teleconsultation' },
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'iv_therapy', label: 'IV Therapy' },
] as const;

const TRANSPORTATION_TYPES = [
  { value: 'driver', label: 'Driver' },
  { value: 'self_transport', label: 'Self Transport' },
] as const;

const TRANSPORTATION_METHODS = [
  "Won't work",
  'Family member',
  'Taxi',
  'Public transport',
  'Walking',
] as const;

const STAFF_ROLES = [
  { value: 'primary', label: 'Primary' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'driver', label: 'Driver' },
] as const;


export function AppointmentForm({
  appointment,
  patients = [],
  staff = [],
  onSubmit,
  onCancel,
  isLoading = false,
  staffAssignments = [],
}: AppointmentFormProps) {
  const [showCustomFields, setShowCustomFields] = useState(false);


  // Helper function to calculate end time from start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return '';

    const [hours, minutes] = startTime.split(':').map(Number);
    const startTotalMinutes = hours * 60 + minutes;
    const endTotalMinutes = startTotalMinutes + durationMinutes;

    // Handle overflow to next day
    const endHours = Math.floor((endTotalMinutes % (24 * 60)) / 60);
    const endMins = endTotalMinutes % 60;

    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  // Helper function to calculate duration from start and end times
  const calculateDuration = () => {
    const startTime = watch('start_time');
    const endTime = watch('end_time');

    if (startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes;

      const duration = endTimeInMinutes - startTimeInMinutes;

      if (duration > 0) {
        setValue('duration_minutes', duration);
      }
    }
  };

  // Helper function to update end time when duration changes
  const updateEndTimeFromDuration = (duration: number) => {
    const startTime = watch('start_time');
    if (startTime && duration > 0) {
      const endTime = calculateEndTime(startTime, duration);
      setValue('end_time', endTime, { shouldValidate: true });
    }
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    trigger,
    reset,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: appointment?.patient_id || '',
      appointment_type: appointment?.appointment_type || 'doctor_on_call',
      appointment_date: appointment?.appointment_date || '',
      start_time: appointment?.start_time ? formatTimeToHHMM(appointment.start_time) : '09:00',
      end_time: appointment?.end_time ? formatTimeToHHMM(appointment.end_time) : calculateEndTime(appointment?.start_time ? formatTimeToHHMM(appointment.start_time) : '09:00', appointment?.duration_minutes || 60),
      duration_minutes: appointment?.duration_minutes || 60,
      status: appointment?.status || 'scheduled',
      transportation_type: appointment?.transportation_type || undefined,
      transportation_method: appointment?.transportation_method || '',
      driver_id: appointment?.driver_id || '',
      notes: appointment?.notes || '',
      mini_notes: appointment?.mini_notes || '',
      full_notes: appointment?.full_notes || '',
      pickup_instructions: appointment?.pickup_instructions || '',
      custom_fields: appointment?.custom_fields || {},
      recurring_rule: appointment?.recurring_rule || undefined,
      staff_assignments: staffAssignments && staffAssignments.length > 0 ? staffAssignments : undefined,
    },
    mode: 'onSubmit', // Only validate on submit to avoid premature validation
  });

  // Debug form state
  console.log('Form errors:', errors);
  console.log('Form isSubmitting:', isSubmitting);
  console.log('Appointment data:', appointment);

  // Ensure form is properly initialized when editing
  useEffect(() => {
    if (appointment) {
      // Set the time values explicitly to ensure they're in the correct format
      // Use a small delay to ensure the form is fully initialized
      setTimeout(() => {
        if (appointment.start_time) {
          setValue('start_time', formatTimeToHHMM(appointment.start_time), { shouldValidate: false });
        }
        if (appointment.end_time) {
          setValue('end_time', formatTimeToHHMM(appointment.end_time), { shouldValidate: false });
        }
      }, 100);
    }
  }, [appointment, setValue]);


  const { fields, append, remove } = useFieldArray({
    control,
    name: 'staff_assignments',
  });

  const watchedAppointmentType = watch('appointment_type');
  const watchedTransportationType = watch('transportation_type');
  const watchedRecurringRule = watch('recurring_rule');

  // Stabilize the recurring rule value to prevent infinite re-renders
  const stableRecurringRule = useMemo(() => watchedRecurringRule, [
    watchedRecurringRule?.frequency,
    watchedRecurringRule?.interval,
    watchedRecurringRule?.days_of_week,
    watchedRecurringRule?.day_of_month,
    watchedRecurringRule?.month_of_year,
    watchedRecurringRule?.end_date,
    watchedRecurringRule?.end_occurrences,
  ]);


  // Filter staff by appointment type
  const filteredStaff = staff.filter(s => {
    switch (watchedAppointmentType) {
      case 'doctor_on_call':
        return s.staff_type === 'doctor';
      case 'lab_test':
        return s.staff_type === 'nurse' || s.staff_type === 'lab_technician';
      case 'teleconsultation':
        return s.staff_type === 'doctor';
      case 'physiotherapy':
        return s.staff_type === 'physiotherapist';
      case 'caregiver':
        return s.staff_type === 'caregiver';
      case 'iv_therapy':
        return s.staff_type === 'nurse';
      default:
        return true;
    }
  });

  // Filter drivers for transportation
  const drivers = staff.filter(s => s.staff_type === 'driver' && s.status === 'active');

  const handleFormSubmit = async (data: AppointmentFormData) => {
    console.log('Form submitted with data:', data);

    try {
      await onSubmit(data);
      console.log('Form submission successful');
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const addStaffAssignment = () => {
    append({
      staff_id: '',
      role: 'primary',
      is_primary: false,
    });
  };

  const removeStaffAssignment = (index: number) => {
    remove(index);
  };

  const handleStaffRoleChange = (index: number, role: string) => {
    const newAssignments = [...watch('staff_assignments')];
    newAssignments[index].role = role as any;

    // If this is primary, unset others
    if (role === 'primary') {
      newAssignments.forEach((assignment, i) => {
        if (i !== index) {
          assignment.is_primary = false;
        }
      });
      newAssignments[index].is_primary = true;
    }

    setValue('staff_assignments', newAssignments);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Appointment Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>

        {/* Patient and Appointment Type Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="patient_id" className="block text-sm font-medium text-gray-700 mb-1">
              Patient *
            </label>
            <PatientCombobox
              patients={patients}
              selectedPatient={patients.find(p => p.id === watch('patient_id')) || null}
              onPatientSelect={(patient) => {
                setValue('patient_id', patient?.id || '');
                trigger('patient_id');
              }}
              placeholder="Search patients by name..."
              error={errors.patient_id?.message}
            />
          </div>

          <div>
            <label htmlFor="appointment_type" className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Type *
            </label>
            <select
              {...register('appointment_type')}
              id="appointment_type"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.appointment_type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {APPOINTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.appointment_type && (
              <p className="mt-1 text-sm text-red-600">{errors.appointment_type.message}</p>
            )}
          </div>
        </div>

        {/* Appointment Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="appointment_date" className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Date *
            </label>
            <input
              {...register('appointment_date')}
              type="date"
              id="appointment_date"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.appointment_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.appointment_date && (
              <p className="mt-1 text-sm text-red-600">{errors.appointment_date.message}</p>
            )}
          </div>
        </div>

        {/* Start Time and End Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <label htmlFor="start_time" className="block text-sm font-medium text-blue-800 mb-2">
              Start Time *
            </label>
            <TimePicker
              value={watch('start_time') || '09:00'}
              onChange={(time) => {
                setValue('start_time', time, { shouldValidate: true });
                calculateDuration();
              }}
              disabled={isSubmitting}
              className={errors.start_time ? 'border-red-500' : ''}
            />
            {errors.start_time && (
              <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <label htmlFor="end_time" className="block text-sm font-medium text-green-800 mb-2">
              End Time *
            </label>
            <TimePicker
              value={watch('end_time') || '10:00'}
              onChange={(time) => {
                setValue('end_time', time, { shouldValidate: true });
                calculateDuration();
              }}
              disabled={isSubmitting}
              className={errors.end_time ? 'border-red-500' : ''}
            />
            {errors.end_time && (
              <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
            )}
          </div>
        </div>

        {/* Duration and Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <input
              {...register('duration_minutes', {
                valueAsNumber: true,
                onChange: (e) => {
                  const duration = parseInt(e.target.value) || 0;
                  // Round to nearest 15-minute interval
                  const roundedDuration = Math.round(duration / 15) * 15;
                  if (roundedDuration !== duration) {
                    e.target.value = roundedDuration.toString();
                  }
                  updateEndTimeFromDuration(roundedDuration);
                }
              })}
              type="number"
              id="duration_minutes"
              min="15"
              max="1440"
              step="15"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.duration_minutes ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">Editable in 15-minute intervals. Changes end time.</p>
            {errors.duration_minutes && (
              <p className="mt-1 text-sm text-red-600">{errors.duration_minutes.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              {...register('status')}
              id="status"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.status ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Transportation */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transportation</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="transportation_type" className="block text-sm font-medium text-gray-700 mb-1">
              Transportation Type
            </label>
            <select
              {...register('transportation_type')}
              id="transportation_type"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.transportation_type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select transportation type</option>
              {TRANSPORTATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.transportation_type && (
              <p className="mt-1 text-sm text-red-600">{errors.transportation_type.message}</p>
            )}
          </div>

          {watchedTransportationType === 'driver' && (
            <div>
              <label htmlFor="driver_id" className="block text-sm font-medium text-gray-700 mb-1">
                Driver *
              </label>
              <select
                {...register('driver_id')}
                id="driver_id"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.driver_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a driver</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name} - {driver.phone}
                  </option>
                ))}
              </select>
              {errors.driver_id && (
                <p className="mt-1 text-sm text-red-600">{errors.driver_id.message}</p>
              )}
            </div>
          )}

          {watchedTransportationType === 'self_transport' && (
            <div>
              <label htmlFor="transportation_method" className="block text-sm font-medium text-gray-700 mb-1">
                Transportation Method *
              </label>
              <select
                {...register('transportation_method')}
                id="transportation_method"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.transportation_method ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select transportation method</option>
                {TRANSPORTATION_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              {errors.transportation_method && (
                <p className="mt-1 text-sm text-red-600">{errors.transportation_method.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Staff Assignments */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Staff Assignments</h3>
          <button
            type="button"
            onClick={addStaffAssignment}
            className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            Add Staff
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="text-gray-500 text-sm">No staff assigned yet. Click "Add Staff" to assign staff members.</p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Staff Member *
                    </label>
                    <select
                      {...register(`staff_assignments.${index}.staff_id`)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.staff_assignments?.[index]?.staff_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select staff member</option>
                      {filteredStaff.map((staffMember) => (
                        <option key={staffMember.id} value={staffMember.id}>
                          {staffMember.first_name} {staffMember.last_name} ({staffMember.staff_type})
                        </option>
                      ))}
                    </select>
                    {errors.staff_assignments?.[index]?.staff_id && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.staff_assignments[index]?.staff_id?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      {...register(`staff_assignments.${index}.role`)}
                      onChange={(e) => handleStaffRoleChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {STAFF_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        {...register(`staff_assignments.${index}.is_primary`)}
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Primary</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeStaffAssignment(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recurring Options */}
      <RecurrenceRuleBuilder
        value={stableRecurringRule}
        onChange={(rule) => setValue('recurring_rule', rule)}
        baseDate={watch('appointment_date') || new Date().toISOString().split('T')[0]}
        disabled={isLoading}
      />

      {/* Notes and Instructions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes and Instructions</h3>

        <div className="space-y-6">
          {/* Mini Notes */}
          <div>
            <label htmlFor="mini_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Brief Notes <span className="text-gray-500">(for schedule views)</span>
            </label>
            <textarea
              {...register('mini_notes')}
              id="mini_notes"
              rows={2}
              maxLength={500}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.mini_notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Brief summary for quick reference (e.g., 'Mounjaro 2.5mg', 'Blood work - fasting required')"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.mini_notes && (
                <p className="text-sm text-red-600">{errors.mini_notes.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('mini_notes')?.length || 0}/500 characters
              </p>
            </div>
          </div>

          {/* Full Notes */}
          <div>
            <label htmlFor="full_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Detailed Notes <span className="text-gray-500">(for 1-hour reminders)</span>
            </label>
            <textarea
              {...register('full_notes')}
              id="full_notes"
              rows={4}
              maxLength={2000}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.full_notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Detailed notes for comprehensive reminders (e.g., 'Patient requires special attention due to diabetes. Check blood sugar levels before treatment. Bring insulin supplies.')"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.full_notes && (
                <p className="text-sm text-red-600">{errors.full_notes.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('full_notes')?.length || 0}/2000 characters
              </p>
            </div>
          </div>

          {/* Pickup Instructions */}
          <div>
            <label htmlFor="pickup_instructions" className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Instructions <span className="text-gray-500">(for drivers)</span>
            </label>
            <textarea
              {...register('pickup_instructions')}
              id="pickup_instructions"
              rows={3}
              maxLength={1000}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.pickup_instructions ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Special pickup instructions for drivers (e.g., 'Patient is wheelchair-bound. Use accessible vehicle. Ring doorbell twice. Patient's son will assist.')"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.pickup_instructions && (
                <p className="text-sm text-red-600">{errors.pickup_instructions.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('pickup_instructions')?.length || 0}/1000 characters
              </p>
            </div>
          </div>

          {/* Legacy Notes Field */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              General Notes <span className="text-gray-500">(legacy field)</span>
            </label>
            <textarea
              {...register('notes')}
              id="notes"
              rows={3}
              maxLength={1000}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="General appointment notes (use specific fields above when possible)..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.notes && (
                <p className="text-sm text-red-600">{errors.notes.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('notes')?.length || 0}/1000 characters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? 'Saving...' : appointment ? 'Update Appointment' : 'Create Appointment'}
        </button>
      </div>
    </form>
  );
}
