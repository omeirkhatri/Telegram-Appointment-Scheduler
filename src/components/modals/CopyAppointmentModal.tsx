'use client';

import { AppointmentForm } from '@/components/forms';
import { ErrorMessage, LoadingOverlay } from '@/components/ui';
import type { Appointment, Patient, Staff, AppointmentStaffWithDetails } from '@/types';
import { X, Users, UserPlus, UserMinus } from 'lucide-react';
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
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [sourceStaffAssignments, setSourceStaffAssignments] = useState<AppointmentStaffWithDetails[]>([]);
  const [isLoadingStaffAssignments, setIsLoadingStaffAssignments] = useState(false);
  const [showStaffReassignment, setShowStaffReassignment] = useState(false);

  // Fetch source appointment staff assignments when modal opens
  useEffect(() => {
    if (isOpen && sourceAppointment) {
      fetchSourceStaffAssignments();
      setSubmitError(null);
      setConflicts([]);
      setShowConflictResolution(false);
      setOverrideConflicts(false);
    }
  }, [isOpen, sourceAppointment]);

  const fetchSourceStaffAssignments = async () => {
    if (!sourceAppointment) return;
    
    setIsLoadingStaffAssignments(true);
    try {
      const response = await fetch(`/api/appointments/${sourceAppointment.id}/staff`);
      const result = await response.json();
      
      if (result.success) {
        setSourceStaffAssignments(result.data.staff_assignments || []);
      } else {
        console.error('Failed to fetch staff assignments:', result.error);
      }
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
    } finally {
      setIsLoadingStaffAssignments(false);
    }
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/appointments/${sourceAppointment.id}/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          overrideConflicts: overrideConflicts,
          staff_assignments: sourceStaffAssignments.map(assignment => ({
            staff_id: assignment.staff_id,
            role: assignment.role,
            is_primary: assignment.is_primary,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle conflict response (409)
        if (response.status === 409 && result.conflicts) {
          setConflicts(result.conflicts);
          setShowConflictResolution(true);
          setIsSubmitting(false);
          return;
        }

        throw new Error(result.error || 'Failed to copy appointment');
      }

      if (!result.success) {
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

          {/* Conflict resolution */}
          {showConflictResolution && conflicts.length > 0 && (
            <div className="mb-6 p-4 bg-[--warning]/10 border border-[--warning]/20 rounded-lg">
              <h3 className="text-lg font-semibold text-[--warning] mb-3">
                ⚠️ Conflicts Detected
              </h3>
              <div className="space-y-2 mb-4">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="text-sm text-[--foreground]">
                    <span className="font-medium">
                      {conflict.severity === 'critical' ? '🔴' :
                       conflict.severity === 'high' ? '🟠' :
                       conflict.severity === 'medium' ? '🟡' : '🟢'}
                    </span>
                    {' '}
                    {conflict.description}
                    {conflict.staffName && (
                      <span className="text-[--muted-foreground] ml-2">
                        (Staff: {conflict.staffName})
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={overrideConflicts}
                      onChange={(e) => setOverrideConflicts(e.target.checked)}
                      className="rounded border-[--border]"
                    />
                    <span className="text-sm text-[--foreground]">
                      Override conflicts and proceed
                    </span>
                  </label>
                </div>
                
                {/* Staff reassignment options for conflicts */}
                {conflicts.some(c => c.type === 'staff_unavailable') && (
                  <div className="p-3 bg-[--accent]/20 border border-[--accent] rounded-lg">
                    <h4 className="text-sm font-medium text-[--foreground] mb-2">
                      Staff Reassignment Options
                    </h4>
                    <p className="text-xs text-[--muted-foreground] mb-2">
                      Some staff members are unavailable. You can reassign them or remove them from the appointment.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowStaffReassignment(true)}
                      className="text-sm text-[--primary] hover:text-[--primary]/80 transition-colors"
                    >
                      Modify Staff Assignments
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setOverrideConflicts(true);
                    // Re-submit the form with override
                    const form = document.querySelector('form');
                    if (form) {
                      const formData = new FormData(form);
                      const data = Object.fromEntries(formData.entries());
                      handleSubmit(data);
                    }
                  }}
                  className="px-4 py-2 bg-[--warning] text-white rounded-lg hover:bg-[--warning]/90 transition-colors"
                >
                  Override & Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConflictResolution(false);
                    setConflicts([]);
                  }}
                  className="px-4 py-2 bg-[--muted] text-[--foreground] rounded-lg hover:bg-[--accent] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Staff Reassignment Section */}
          {sourceStaffAssignments.length > 0 && (
            <div className="mb-6 p-4 bg-[--muted]/30 border border-[--border] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[--foreground] flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Staff Assignments
                </h3>
                <button
                  type="button"
                  onClick={() => setShowStaffReassignment(!showStaffReassignment)}
                  className="text-sm text-[--primary] hover:text-[--primary]/80 transition-colors"
                >
                  {showStaffReassignment ? 'Hide' : 'Modify'} Assignments
                </button>
              </div>
              
              {isLoadingStaffAssignments ? (
                <div className="text-sm text-[--muted-foreground]">Loading staff assignments...</div>
              ) : (
                <div className="space-y-2">
                  {sourceStaffAssignments.map((assignment, index) => (
                    <div key={assignment.id} className="flex items-center justify-between p-2 bg-[--background] rounded border">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            assignment.role === 'primary' ? 'bg-[--primary] text-white' :
                            assignment.role === 'assistant' ? 'bg-[--secondary] text-[--secondary-foreground]' :
                            'bg-[--muted] text-[--muted-foreground]'
                          }`}>
                            {assignment.role}
                          </span>
                          {assignment.is_primary && (
                            <span className="px-2 py-1 text-xs bg-[--warning] text-white rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-[--foreground]">
                            {assignment.staff?.first_name} {assignment.staff?.last_name}
                          </div>
                          <div className="text-sm text-[--muted-foreground]">
                            {assignment.staff?.staff_type} • {assignment.staff?.specialization}
                          </div>
                        </div>
                      </div>
                      {showStaffReassignment && (
                        <div className="flex items-center space-x-2">
                          <select
                            className="text-sm border border-[--border] rounded px-2 py-1 bg-[--background]"
                            defaultValue={assignment.staff_id}
                            onChange={(e) => {
                              // Handle staff reassignment
                              const newAssignments = [...sourceStaffAssignments];
                              newAssignments[index] = {
                                ...newAssignments[index],
                                staff_id: e.target.value,
                                staff: staff.find(s => s.id === e.target.value) || newAssignments[index].staff
                              };
                              setSourceStaffAssignments(newAssignments);
                            }}
                          >
                            <option value={assignment.staff_id}>
                              Keep: {assignment.staff?.first_name} {assignment.staff?.last_name}
                            </option>
                            {staff
                              .filter(s => s.staff_type === assignment.staff?.staff_type && s.id !== assignment.staff_id)
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.first_name} {s.last_name}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const newAssignments = sourceStaffAssignments.filter((_, i) => i !== index);
                              setSourceStaffAssignments(newAssignments);
                            }}
                            className="p-1 text-[--destructive] hover:bg-[--destructive]/10 rounded transition-colors"
                            title="Remove staff assignment"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {showStaffReassignment && (
                    <div className="pt-2 border-t border-[--border]">
                      <button
                        type="button"
                        onClick={() => {
                          // Add new staff assignment
                          const newAssignment: AppointmentStaffWithDetails = {
                            id: `temp-${Date.now()}`,
                            appointment_id: sourceAppointment.id,
                            staff_id: '',
                            role: 'assistant',
                            is_primary: false,
                            google_event_id: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            appointment: sourceAppointment,
                            staff: null
                          };
                          setSourceStaffAssignments([...sourceStaffAssignments, newAssignment]);
                        }}
                        className="flex items-center space-x-2 text-sm text-[--primary] hover:text-[--primary]/80 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Add Staff Member</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
