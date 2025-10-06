'use client';

import { ErrorMessage, LoadingOverlay } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import { AppointmentForm } from './AppointmentForm';
// Remove direct service import - we'll use API calls instead
import type { Appointment, Patient, Staff, StaffAssignment } from '@/types';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updateData?: any) => void;
  initialAppointment?: Partial<Appointment>;
  patients?: Patient[];
  staff?: Staff[];
  isLoadingPatients?: boolean;
  isLoadingStaff?: boolean;
  patientsError?: string | null;
  staffError?: string | null;
}

export function AppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  initialAppointment,
  patients = [],
  staff = [],
  isLoadingPatients = false,
  isLoadingStaff = false,
  patientsError = null,
  staffError = null,
}: AppointmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [isLoadingStaffAssignments, setIsLoadingStaffAssignments] = useState(false);
  const { showToast } = useToastContext();

  // Reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
    }
  }, [isOpen]);

  // Fetch staff assignments when editing an appointment
  useEffect(() => {
    const fetchStaffAssignments = async () => {
      if (isOpen && initialAppointment?.id) {
        setIsLoadingStaffAssignments(true);
        try {
          // Extract base appointment ID if this is a recurring occurrence
          let appointmentId = initialAppointment.id;
          if (appointmentId.includes('_occurrence_')) {
            appointmentId = appointmentId.split('_occurrence_')[0];
          }

          const response = await fetch(`/api/appointments/${appointmentId}/staff`);
          const result = await response.json();

          if (result.success) {
            setStaffAssignments(result.data.staff_assignments.map((staff: any) => ({
              staff_id: staff.staff_id,
              role: staff.role,
              is_primary: staff.is_primary,
            })));
          } else {
            console.error('Failed to fetch staff assignments:', result.error);
            setStaffAssignments([]);
          }
        } catch (error) {
          console.error('Failed to fetch staff assignments:', error);
          setStaffAssignments([]);
        } finally {
          setIsLoadingStaffAssignments(false);
        }
      } else {
        setStaffAssignments([]);
      }
    };

    fetchStaffAssignments();
  }, [isOpen, initialAppointment?.id]);

  const handleSubmit = async (data: any) => {
    console.log('Modal handleSubmit called with data:', data);
    console.log('Initial appointment:', initialAppointment);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const isUpdate = !!initialAppointment?.id;

      // Extract base appointment ID if this is a recurring occurrence
      let appointmentId = initialAppointment?.id;
      if (appointmentId && appointmentId.includes('_occurrence_')) {
        appointmentId = appointmentId.split('_occurrence_')[0];
      }

      const url = isUpdate ? `/api/appointments/${appointmentId}` : '/api/appointments';
      const method = isUpdate ? 'PUT' : 'POST';

      console.log('Making request:', { url, method, isUpdate });

      // Include staff assignments in the request and clean up empty UUID fields
      const cleanedStaffAssignments = (data.staff_assignments || []).map(assignment => ({
        ...assignment,
        staff_id: assignment.staff_id && assignment.staff_id.trim() !== '' ? assignment.staff_id : null,
      })).filter(assignment => assignment.staff_id !== null); // Remove assignments with no staff_id

      const requestData = {
        ...data,
        staff_assignments: cleanedStaffAssignments,
        // Convert empty strings to null for UUID fields
        driver_id: data.driver_id && data.driver_id.trim() !== '' ? data.driver_id : null,
      };

      console.log('Request data:', requestData);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      console.log('Response:', { status: response.status, result });

      if (!response.ok || !result.success) {
        console.error('API Error details:', result);
        throw new Error(result.error || `Failed to ${isUpdate ? 'update' : 'create'} appointment`);
      }

      console.log('Success! Closing modal...');
      // Close modal and trigger success callback with update data
      onClose();
      onSuccess(data);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : `Failed to ${initialAppointment?.id ? 'update' : 'create'} appointment`;
      setSubmitError(errorMessage);
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSubmitError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[98vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {initialAppointment?.id ? 'Edit Appointment' : 'New Appointment'}
              </h2>
              <p className="text-gray-600 mt-2 text-lg">
                {initialAppointment?.id
                  ? 'Update appointment details and staff assignments'
                  : 'Create a new appointment with patient and staff details'
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(98vh-180px)] bg-gray-50">
          {/* Loading overlay for data fetching */}
          {(isLoadingPatients || isLoadingStaff || isLoadingStaffAssignments) && (
            <LoadingOverlay message="Loading appointment data..." isLoading={true} />
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
          {!isLoadingPatients && !isLoadingStaff && !isLoadingStaffAssignments && (
            <AppointmentForm
              appointment={initialAppointment as Appointment}
              patients={patients}
              staff={staff}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isSubmitting}
              staffAssignments={staffAssignments}
            />
          )}
        </div>
      </div>
    </div>
  );
}
