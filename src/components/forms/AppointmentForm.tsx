'use client';

import { appointmentFormSchema, type AppointmentFormData } from '@/lib/validations/appointment';
import type { Appointment, Patient, Staff } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

interface AppointmentFormProps {
  appointment?: Appointment;
  patients?: Patient[];
  staff?: Staff[];
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
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

const RECURRING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export function AppointmentForm({
  appointment,
  patients = [],
  staff = [],
  onSubmit,
  onCancel,
  isLoading = false
}: AppointmentFormProps) {
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: appointment?.patient_id || '',
      appointment_type: appointment?.appointment_type || 'doctor_on_call',
      appointment_date: appointment?.appointment_date || '',
      start_time: appointment?.start_time || '',
      duration_minutes: appointment?.duration_minutes || 60,
      status: appointment?.status || 'scheduled',
      transportation_type: appointment?.transportation_type || undefined,
      transportation_method: appointment?.transportation_method || '',
      driver_id: appointment?.driver_id || '',
      notes: appointment?.notes || '',
      custom_fields: appointment?.custom_fields || {},
      recurring_rule: appointment?.recurring_rule || undefined,
      staff_assignments: appointment ? [] : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'staff_assignments',
  });

  const watchedAppointmentType = watch('appointment_type');
  const watchedTransportationType = watch('transportation_type');
  const watchedRecurringRule = watch('recurring_rule');

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
    try {
      await onSubmit(data);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="patient_id" className="block text-sm font-medium text-gray-700 mb-1">
              Patient *
            </label>
            <select
              {...register('patient_id')}
              id="patient_id"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.patient_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} - {patient.phone}
                </option>
              ))}
            </select>
            {errors.patient_id && (
              <p className="mt-1 text-sm text-red-600">{errors.patient_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="appointment_type" className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Type *
            </label>
            <select
              {...register('appointment_type')}
              id="appointment_type"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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

          <div>
            <label htmlFor="appointment_date" className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Date *
            </label>
            <input
              {...register('appointment_date')}
              type="date"
              id="appointment_date"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.appointment_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.appointment_date && (
              <p className="mt-1 text-sm text-red-600">{errors.appointment_date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
              Start Time *
            </label>
            <input
              {...register('start_time')}
              type="time"
              id="start_time"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.start_time ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.start_time && (
              <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <input
              {...register('duration_minutes', { valueAsNumber: true })}
              type="number"
              id="duration_minutes"
              min="1"
              max="1440"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.duration_minutes ? 'border-red-500' : 'border-gray-300'
              }`}
            />
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={showRecurringOptions}
            onChange={(e) => setShowRecurringOptions(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label className="text-lg font-semibold text-gray-900">Recurring Appointment</label>
        </div>

        {showRecurringOptions && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency *
                </label>
                <select
                  {...register('recurring_rule.frequency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RECURRING_FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval *
                </label>
                <input
                  {...register('recurring_rule.interval', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Every X days/weeks/months"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  {...register('recurring_rule.end_date')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Occurrences
                </label>
                <input
                  {...register('recurring_rule.end_occurrences', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 10"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Appointment Notes
          </label>
          <textarea
            {...register('notes')}
            id="notes"
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.notes ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter any additional notes or special instructions..."
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
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
