/**
 * Conflict resolution utilities for Google Calendar synchronization
 * Handles conflicts between appointments and Google Calendar events
 */

import type { Staff } from '@/types';
import type { Appointment } from '@/types/appointment';

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: string;
  attendees?: Array<{ email: string }>;
  updated: string;
  created: string;
}

export interface ConflictInfo {
  type: 'time_conflict' | 'data_mismatch' | 'missing_event' | 'duplicate_event';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  appointmentId?: string;
  eventId?: string;
  staffId?: string;
  resolution?: 'appointment_wins' | 'calendar_wins' | 'manual_resolution' | 'ignore';
}

export interface ConflictResolution {
  resolved: boolean;
  action: 'update_appointment' | 'update_calendar' | 'create_event' | 'delete_event' | 'manual_review';
  conflicts: ConflictInfo[];
  data?: any;
}

/**
 * Detect conflicts between appointment and calendar event
 */
export function detectConflicts(
  appointment: Appointment,
  calendarEvent: CalendarEvent | null,
  staff: Staff
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // No calendar event exists for this appointment
  if (!calendarEvent) {
    conflicts.push({
      type: 'missing_event',
      severity: 'high',
      description: `No Google Calendar event found for appointment ${appointment.id}`,
      appointmentId: appointment.id,
      staffId: staff.id,
    });
    return conflicts;
  }

  // Check for time conflicts
  const appointmentStart = new Date(`${appointment.appointment_date}T${appointment.start_time}:00Z`);
  const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration_minutes * 60000);
  const eventStart = new Date(calendarEvent.start.dateTime);
  const eventEnd = new Date(calendarEvent.end.dateTime);

  const timeDiff = Math.abs(appointmentStart.getTime() - eventStart.getTime());
  const durationDiff = Math.abs((appointmentEnd.getTime() - appointmentStart.getTime()) -
                               (eventEnd.getTime() - eventStart.getTime()));

  // Time conflict if start time differs by more than 5 minutes
  if (timeDiff > 5 * 60 * 1000) {
    conflicts.push({
      type: 'time_conflict',
      severity: 'medium',
      description: `Appointment start time differs from calendar event by ${Math.round(timeDiff / 60000)} minutes`,
      appointmentId: appointment.id,
      eventId: calendarEvent.id,
      staffId: staff.id,
    });
  }

  // Duration conflict if duration differs by more than 5 minutes
  if (durationDiff > 5 * 60 * 1000) {
    conflicts.push({
      type: 'time_conflict',
      severity: 'medium',
      description: `Appointment duration differs from calendar event by ${Math.round(durationDiff / 60000)} minutes`,
      appointmentId: appointment.id,
      eventId: calendarEvent.id,
      staffId: staff.id,
    });
  }

  // Check for data mismatches
  const expectedSummary = getExpectedEventSummary(appointment, staff);
  if (calendarEvent.summary !== expectedSummary) {
    conflicts.push({
      type: 'data_mismatch',
      severity: 'low',
      description: `Event summary mismatch: expected "${expectedSummary}", got "${calendarEvent.summary}"`,
      appointmentId: appointment.id,
      eventId: calendarEvent.id,
      staffId: staff.id,
    });
  }

  return conflicts;
}

/**
 * Get expected event summary based on appointment and staff type
 */
function getExpectedEventSummary(appointment: Appointment, staff: Staff): string {
  const patientName = appointment.patient_name || 'Unknown Patient';

  switch (staff.staff_type) {
    case 'driver':
      return `🚗 Driver Assignment - ${patientName}`;
    case 'doctor':
    case 'nurse':
    case 'physiotherapist':
    case 'caregiver':
    case 'lab_technician':
      return `👨‍⚕️ ${appointment.appointment_type} - ${patientName}`;
    default:
      return `${appointment.appointment_type} - ${patientName}`;
  }
}

/**
 * Resolve conflicts automatically based on rules
 */
export function resolveConflicts(
  conflicts: ConflictInfo[],
  appointment: Appointment,
  calendarEvent: CalendarEvent | null,
  staff: Staff
): ConflictResolution {
  const resolution: ConflictResolution = {
    resolved: false,
    action: 'manual_review',
    conflicts: [],
  };

  // If no conflicts, everything is fine
  if (conflicts.length === 0) {
    resolution.resolved = true;
    resolution.action = 'update_calendar'; // Keep calendar in sync
    return resolution;
  }

  // Handle missing events
  const missingEventConflicts = conflicts.filter(c => c.type === 'missing_event');
  if (missingEventConflicts.length > 0) {
    resolution.resolved = true;
    resolution.action = 'create_event';
    resolution.conflicts = missingEventConflicts;
    return resolution;
  }

  // Handle time conflicts - appointment wins for small differences
  const timeConflicts = conflicts.filter(c => c.type === 'time_conflict');
  const dataMismatches = conflicts.filter(c => c.type === 'data_mismatch');

  // If only data mismatches (low severity), calendar wins
  if (timeConflicts.length === 0 && dataMismatches.length > 0) {
    resolution.resolved = true;
    resolution.action = 'update_appointment';
    resolution.conflicts = dataMismatches;
    return resolution;
  }

  // If time conflicts exist, require manual review
  if (timeConflicts.length > 0) {
    resolution.conflicts = conflicts;
    return resolution;
  }

  // Default to manual review for any other conflicts
  resolution.conflicts = conflicts;
  return resolution;
}

/**
 * Check for duplicate events in calendar
 */
export function detectDuplicateEvents(
  events: CalendarEvent[],
  appointment: Appointment,
  staff: Staff
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const appointmentStart = new Date(`${appointment.appointment_date}T${appointment.start_time}:00Z`);
  const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration_minutes * 60000);

  const duplicateEvents = events.filter(event => {
    const eventStart = new Date(event.start.dateTime);
    const eventEnd = new Date(event.end.dateTime);

    // Check for overlap
    return eventStart < appointmentEnd && eventEnd > appointmentStart;
  });

  if (duplicateEvents.length > 1) {
    conflicts.push({
      type: 'duplicate_event',
      severity: 'high',
      description: `Found ${duplicateEvents.length} overlapping events for appointment ${appointment.id}`,
      appointmentId: appointment.id,
      staffId: staff.id,
    });
  }

  return conflicts;
}

/**
 * Validate appointment data for calendar sync
 */
export function validateAppointmentForSync(appointment: Appointment, staff: Staff): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // Check required fields
  if (!appointment.appointment_date) {
    conflicts.push({
      type: 'data_mismatch',
      severity: 'critical',
      description: 'Appointment date is missing',
      appointmentId: appointment.id,
      staffId: staff.id,
    });
  }

  if (!appointment.start_time) {
    conflicts.push({
      type: 'data_mismatch',
      severity: 'critical',
      description: 'Appointment start time is missing',
      appointmentId: appointment.id,
      staffId: staff.id,
    });
  }

  if (!appointment.duration_minutes || appointment.duration_minutes <= 0) {
    conflicts.push({
      type: 'data_mismatch',
      severity: 'critical',
      description: 'Appointment duration is invalid',
      appointmentId: appointment.id,
      staffId: staff.id,
    });
  }

  // Check staff calendar configuration
  if (!staff.google_calendar_id) {
    conflicts.push({
      type: 'data_mismatch',
      severity: 'high',
      description: `Staff member ${staff.name} has no Google Calendar ID configured`,
      appointmentId: appointment.id,
      staffId: staff.id,
    });
  }

  return conflicts;
}

/**
 * Get conflict resolution strategy based on conflict type and severity
 */
export function getConflictResolutionStrategy(conflicts: ConflictInfo[]): {
  strategy: 'automatic' | 'manual' | 'ignore';
  priority: 'high' | 'medium' | 'low';
} {
  if (conflicts.length === 0) {
    return { strategy: 'automatic', priority: 'low' };
  }

  const hasCritical = conflicts.some(c => c.severity === 'critical');
  const hasHigh = conflicts.some(c => c.severity === 'high');
  const hasTimeConflicts = conflicts.some(c => c.type === 'time_conflict');

  if (hasCritical) {
    return { strategy: 'manual', priority: 'high' };
  }

  if (hasTimeConflicts || hasHigh) {
    return { strategy: 'manual', priority: 'medium' };
  }

  // Low severity data mismatches can be handled automatically
  return { strategy: 'automatic', priority: 'low' };
}
