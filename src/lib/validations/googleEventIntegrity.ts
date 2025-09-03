import { isValidGoogleEventId } from '@/types/appointmentStaff';
import { z } from 'zod';

// Schema for validating google_event_ids JSONB structure
export const googleEventIdsSchema = z.record(
  z.string().uuid(), // staff_id must be a valid UUID
  z.string().refine(isValidGoogleEventId, {
    message: 'Invalid Google Calendar event ID format'
  })
);

// Integrity check result types
export interface IntegrityCheckResult {
  isValid: boolean;
  errors: IntegrityError[];
  warnings: IntegrityWarning[];
  stats: IntegrityStats;
}

export interface IntegrityError {
  type: 'invalid_format' | 'orphaned_event' | 'duplicate_event' | 'invalid_staff_id' | 'missing_event';
  message: string;
  appointmentId?: string;
  staffId?: string;
  eventId?: string;
  severity: 'error' | 'warning';
}

export interface IntegrityWarning {
  type: 'potential_orphan' | 'unused_event_id' | 'sync_mismatch';
  message: string;
  appointmentId?: string;
  staffId?: string;
  eventId?: string;
}

export interface IntegrityStats {
  totalAppointments: number;
  appointmentsWithEventIds: number;
  totalEventIds: number;
  validEventIds: number;
  invalidEventIds: number;
  orphanedEventIds: number;
  duplicateEventIds: number;
}

// Validation functions
export function validateGoogleEventIdsStructure(eventIds: Record<string, string>): IntegrityError[] {
  const errors: IntegrityError[] = [];

  try {
    googleEventIdsSchema.parse(eventIds);
  } catch (error) {
    if (error instanceof z.ZodError && error.errors) {
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors.push({
          type: 'invalid_format',
          message: `Invalid format at ${path}: ${err.message}`,
          severity: 'error'
        });
      });
    } else {
      // Fallback for non-Zod errors
      errors.push({
        type: 'invalid_format',
        message: `Invalid google_event_ids structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  }

  return errors;
}

export function validateStaffIdExists(staffId: string, validStaffIds: Set<string>): boolean {
  return validStaffIds.has(staffId);
}

export function detectDuplicateEventIds(
  appointments: Array<{ id: string; google_event_ids: Record<string, string> }>
): IntegrityError[] {
  const errors: IntegrityError[] = [];
  const eventIdMap = new Map<string, { appointmentId: string; staffId: string }>();

  for (const appointment of appointments) {
    if (!appointment.google_event_ids) continue;

    for (const [staffId, eventId] of Object.entries(appointment.google_event_ids)) {
      if (eventIdMap.has(eventId)) {
        const existing = eventIdMap.get(eventId)!;
        errors.push({
          type: 'duplicate_event',
          message: `Event ID ${eventId} is used by multiple appointments`,
          appointmentId: appointment.id,
          staffId,
          eventId,
          severity: 'error'
        });
      } else {
        eventIdMap.set(eventId, { appointmentId: appointment.id, staffId });
      }
    }
  }

  return errors;
}

export function detectOrphanedEventIds(
  appointments: Array<{ id: string; google_event_ids: Record<string, string> }>,
  validEventIds: Set<string>
): IntegrityError[] {
  const errors: IntegrityError[] = [];

  for (const appointment of appointments) {
    if (!appointment.google_event_ids) continue;

    for (const [staffId, eventId] of Object.entries(appointment.google_event_ids)) {
      if (!validEventIds.has(eventId)) {
        errors.push({
          type: 'orphaned_event',
          message: `Event ID ${eventId} does not exist in Google Calendar`,
          appointmentId: appointment.id,
          staffId,
          eventId,
          severity: 'error'
        });
      }
    }
  }

  return errors;
}

export function detectMissingEventIds(
  appointments: Array<{ id: string; google_event_ids: Record<string, string> }>,
  expectedEventIds: Map<string, Set<string>> // appointmentId -> Set of expected eventIds
): IntegrityError[] {
  const errors: IntegrityError[] = [];

  for (const appointment of appointments) {
    const expected = expectedEventIds.get(appointment.id);
    if (!expected) continue;

    const actual = new Set(Object.values(appointment.google_event_ids || {}));

    for (const expectedEventId of expected) {
      if (!actual.has(expectedEventId)) {
        errors.push({
          type: 'missing_event',
          message: `Expected event ID ${expectedEventId} is missing from appointment`,
          appointmentId: appointment.id,
          eventId: expectedEventId,
          severity: 'warning'
        });
      }
    }
  }

  return errors;
}

// Cleanup operations
export interface CleanupOperation {
  type: 'remove_orphaned' | 'remove_duplicate' | 'remove_invalid_format' | 'remove_invalid_staff';
  appointmentId: string;
  staffId?: string;
  eventId?: string;
  reason: string;
}

export function generateCleanupOperations(errors: IntegrityError[]): CleanupOperation[] {
  const operations: CleanupOperation[] = [];

  for (const error of errors) {
    if (error.severity === 'error' && error.appointmentId) {
      operations.push({
        type: getCleanupType(error.type),
        appointmentId: error.appointmentId,
        staffId: error.staffId,
        eventId: error.eventId,
        reason: error.message
      });
    }
  }

  return operations;
}

function getCleanupType(errorType: IntegrityError['type']): CleanupOperation['type'] {
  switch (errorType) {
    case 'invalid_format':
      return 'remove_invalid_format';
    case 'orphaned_event':
      return 'remove_orphaned';
    case 'duplicate_event':
      return 'remove_duplicate';
    case 'invalid_staff_id':
      return 'remove_invalid_staff';
    default:
      return 'remove_orphaned';
  }
}
