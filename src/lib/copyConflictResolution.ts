/**
 * Conflict resolution utilities for appointment copying
 * Handles conflicts when copying appointments to new dates/times
 */

import type { Appointment, Staff, StaffAssignment } from '@/types';

export interface CopyConflictInfo {
  type: 'staff_unavailable' | 'time_slot_occupied' | 'staff_double_booked' | 'invalid_time';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  staffId?: string;
  staffName?: string;
  conflictingAppointmentId?: string;
  conflictingAppointmentDetails?: string;
}

export interface CopyConflictResolution {
  hasConflicts: boolean;
  conflicts: CopyConflictInfo[];
  canProceed: boolean;
  requiresOverride: boolean;
  overrideOptions: {
    forceCreate: boolean;
    rescheduleConflicting: boolean;
    skipConflictingStaff: boolean;
  };
}

/**
 * Check for conflicts when copying an appointment to a new date/time
 */
export async function checkCopyConflicts(
  sourceAppointment: Appointment,
  newAppointmentData: {
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
    staff_assignments?: StaffAssignment[];
  },
  existingAppointments: Appointment[],
  staffMembers: Staff[],
): Promise<CopyConflictResolution> {
  const conflicts: CopyConflictInfo[] = [];

  // Calculate new appointment time range
  const newStart = new Date(`${newAppointmentData.appointment_date}T${newAppointmentData.start_time}:00Z`);
  const newEnd = new Date(newStart.getTime() + newAppointmentData.duration_minutes * 60000);

  // Check for invalid time (past dates, invalid times, etc.)
  if (newStart < new Date()) {
    conflicts.push({
      type: 'invalid_time',
      severity: 'high',
      description: 'Cannot schedule appointment in the past',
    });
  }

  // Check for staff availability conflicts
  const staffAssignments = newAppointmentData.staff_assignments || [];
  for (const assignment of staffAssignments) {
    const staff = staffMembers.find(s => s.id === assignment.staff_id);
    if (!staff) continue;

    // Check if staff is available during the new time slot
    const staffConflicts = await checkStaffAvailability(
      staff,
      newStart,
      newEnd,
      existingAppointments,
      sourceAppointment.id, // Exclude the source appointment from conflicts
    );

    conflicts.push(...staffConflicts);
  }

  // Check for time slot conflicts (multiple appointments at same time)
  const timeSlotConflicts = checkTimeSlotConflicts(
    newStart,
    newEnd,
    existingAppointments,
    sourceAppointment.id,
  );

  conflicts.push(...timeSlotConflicts);

  // Determine if we can proceed and what override options are available
  const hasConflicts = conflicts.length > 0;
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const highConflicts = conflicts.filter(c => c.severity === 'high');

  const canProceed = criticalConflicts.length === 0;
  const requiresOverride = hasConflicts && canProceed;

  return {
    hasConflicts,
    conflicts,
    canProceed,
    requiresOverride,
    overrideOptions: {
      forceCreate: canProceed,
      rescheduleConflicting: false, // Not implemented in this version
      skipConflictingStaff: canProceed && highConflicts.length > 0,
    },
  };
}

/**
 * Check if a staff member is available during a specific time range
 */
async function checkStaffAvailability(
  staff: Staff,
  startTime: Date,
  endTime: Date,
  existingAppointments: Appointment[],
  excludeAppointmentId?: string,
): Promise<CopyConflictInfo[]> {
  const conflicts: CopyConflictInfo[] = [];

  // Find appointments where this staff member is assigned
  const staffAppointments = existingAppointments.filter(appointment => {
    const assignments = (appointment as unknown as { staff_assignments?: StaffAssignment[] }).staff_assignments;
    const hasStaffAssignment = Array.isArray(assignments)
      ? assignments.some(assignment => assignment.staff_id === staff.id)
      : false;

    return hasStaffAssignment && appointment.id !== excludeAppointmentId;
  });

  // Check for time overlaps
  for (const appointment of staffAppointments) {
    const appointmentStart = new Date(`${appointment.appointment_date}T${appointment.start_time}:00Z`);
    const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration_minutes * 60000);

    // Check if there's an overlap
    if (startTime < appointmentEnd && endTime > appointmentStart) {
      const overlapMinutes = Math.min(endTime.getTime(), appointmentEnd.getTime()) -
                            Math.max(startTime.getTime(), appointmentStart.getTime());
      const overlapDuration = Math.round(overlapMinutes / 60000);

      conflicts.push({
        type: 'staff_unavailable',
        severity: 'high',
        description: `${staff.first_name} ${staff.last_name} is already scheduled during this time`,
        staffId: staff.id,
        staffName: `${staff.first_name} ${staff.last_name}`,
        conflictingAppointmentId: appointment.id,
        conflictingAppointmentDetails: `${appointment.appointment_type} on ${appointment.appointment_date} at ${appointment.start_time}`,
      });
    }
  }

  return conflicts;
}

/**
 * Check for time slot conflicts (multiple appointments at same time)
 */
function checkTimeSlotConflicts(
  startTime: Date,
  endTime: Date,
  existingAppointments: Appointment[],
  excludeAppointmentId?: string,
): CopyConflictInfo[] {
  const conflicts: CopyConflictInfo[] = [];

  const conflictingAppointments = existingAppointments.filter(appointment => {
    if (appointment.id === excludeAppointmentId) return false;

    const appointmentStart = new Date(`${appointment.appointment_date}T${appointment.start_time}:00Z`);
    const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration_minutes * 60000);

    // Check for overlap
    return startTime < appointmentEnd && endTime > appointmentStart;
  });

  if (conflictingAppointments.length > 0) {
    conflicts.push({
      type: 'time_slot_occupied',
      severity: 'medium',
      description: `Time slot conflicts with ${conflictingAppointments.length} existing appointment(s)`,
      conflictingAppointmentDetails: conflictingAppointments
        .map(a => `${a.appointment_type} on ${a.appointment_date} at ${a.start_time}`)
        .join(', '),
    });
  }

  return conflicts;
}

/**
 * Get conflict resolution strategy for copy conflicts
 */
export function getCopyConflictStrategy(conflicts: CopyConflictInfo[]): {
  strategy: 'automatic' | 'manual' | 'blocked';
  canOverride: boolean;
  recommendedAction: string;
} {
  if (conflicts.length === 0) {
    return {
      strategy: 'automatic',
      canOverride: false,
      recommendedAction: 'Proceed with copy',
    };
  }

  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const highConflicts = conflicts.filter(c => c.severity === 'high');
  const mediumConflicts = conflicts.filter(c => c.severity === 'medium');

  if (criticalConflicts.length > 0) {
    return {
      strategy: 'blocked',
      canOverride: false,
      recommendedAction: 'Cannot proceed - critical conflicts must be resolved',
    };
  }

  if (highConflicts.length > 0) {
    return {
      strategy: 'manual',
      canOverride: true,
      recommendedAction: 'Review conflicts and choose override option',
    };
  }

  if (mediumConflicts.length > 0) {
    return {
      strategy: 'manual',
      canOverride: true,
      recommendedAction: 'Review conflicts - can proceed with override',
    };
  }

  return {
    strategy: 'automatic',
    canOverride: false,
    recommendedAction: 'Proceed with copy',
  };
}
