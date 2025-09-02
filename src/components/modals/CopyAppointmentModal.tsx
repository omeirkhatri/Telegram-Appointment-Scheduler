'use client';

import { AppointmentForm } from '@/components/forms';
import { ErrorMessage, LoadingOverlay } from '@/components/ui';
import type { Appointment, Patient, Staff } from '@/types';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CopyAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sourceAppointment: Appointment;
  patients?: Patient[];
  staff?: Staff[];
  isLoadingPatients?: boolean;
  isLoadingStaff?: boolean;
  patientsError?: string | null;
  staffError?: string | null;
}

export function CopyAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  sourceAppointment,
  patients = [],
  staff = [],
  isLoadingPatients = false,
  isLoadingStaff = false,
  patientsError = null,
  staffError = null,
}: CopyAppointmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/appointments/${sourceAppointment.id}/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to copy appointment');
      }

      // Close modal and trigger success callback
      onClose();
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy appointment';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSubmitError(null);
    onClose();
  };

  // Create a copy of the source appointment with cleared date/time for editing
  const copyAppointmentData: Partial<Appointment> = {
    ...sourceAppointment,
    // Clear the date to make it mandatory for user to set
    appointment_date: '',
    // Keep other fields as defaults for editing
    status: 'scheduled', // Reset status to scheduled for new appointment
    google_event_ids: {}, // Clear Google event IDs
    // Keep all other fields as they were
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-[--card] border border-[--border] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[--border]">
          <div>
            <h2 className="text-2xl font-bold text-[--foreground]">
              Copy Appointment
            </h2>
            <p className="text-[--muted-foreground] mt-1">
              Create a copy of this appointment. Please set a new date and time.
            </p>
            <div className="mt-2 text-sm text-[--muted-foreground]">
              <span className="font-medium">Source:</span> {sourceAppointment.appointment_type.replace('_', ' ')} on {sourceAppointment.appointment_date}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Loading overlay for data fetching */}
          {(isLoadingPatients || isLoadingStaff) && (
            <LoadingOverlay message="Loading patients and staff data..." />
          )}

          {/* Error states */}
          {patientsError && (
            <ErrorMessage
              error={`Failed to load patients: ${patientsError}`}
              variant="inline"
            />
          )}

          {staffError && (
            <ErrorMessage
              error={`Failed to load staff: ${staffError}`}
              variant="inline"
            />
          )}

          {/* Submit error */}
          {submitError && (
            <ErrorMessage
              error={submitError}
              variant="inline"
            />
          )}

          {/* Form */}
          {!isLoadingPatients && !isLoadingStaff && (
            <AppointmentForm
              appointment={copyAppointmentData as Appointment}
              patients={patients}
              staff={staff}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
