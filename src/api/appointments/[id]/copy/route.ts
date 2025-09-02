import { checkCopyConflicts } from '@/lib/copyConflictResolution';
import { validateAppointmentData } from '@/lib/validations/appointment';
import { appointmentService, auditTrailService, staffService } from '@/services';
import type { CreateAppointment, StaffAssignment } from '@/types';
import { deepClone } from '@/utils/deepClone';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/appointments/[id]/copy - Copy an existing appointment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let auditTrailId: string | null = null;

  try {
    const appointmentId = params.id;
    const body = await request.json();

    // Get the source appointment
    const sourceAppointment = await appointmentService.getAppointment(appointmentId);
    if (!sourceAppointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source appointment not found'
        },
        { status: 404 }
      );
    }

    // Start audit trail logging
    auditTrailId = await auditTrailService.logCopyOperationStart('single_copy', appointmentId, {
      user_id: body.user_id,
      staff_assignments: body.staff_assignments,
      override_conflicts: body.overrideConflicts,
      metadata: {
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      },
      notes: body.notes,
    });

    // Use deep clone utility for JSONB fields

    // Create appointment data for the copy with proper deep cloning
    const appointmentData: CreateAppointment = {
      patient_id: body.patient_id || sourceAppointment.patient_id,
      appointment_type: body.appointment_type || sourceAppointment.appointment_type,
      appointment_date: body.appointment_date, // This should be provided by the form
      start_time: body.start_time || sourceAppointment.start_time,
      duration_minutes: body.duration_minutes || sourceAppointment.duration_minutes,
      status: body.status || 'scheduled', // Reset to scheduled for new appointment
      custom_fields: body.custom_fields || deepClone(sourceAppointment.custom_fields || {}),
      transportation_type: body.transportation_type || sourceAppointment.transportation_type,
      transportation_method: body.transportation_method || sourceAppointment.transportation_method,
      driver_id: body.driver_id || sourceAppointment.driver_id,
      notes: body.notes || sourceAppointment.notes,
      recurring_rule: body.recurring_rule || undefined, // Don't copy recurring rules by default
      google_event_ids: {}, // Clear Google event IDs for new appointment
    };

    // Check for conflicts before creating the appointment
    const staffAssignments: StaffAssignment[] = body.staff_assignments || [];
    const allStaff = await staffService.getStaff();
    const existingAppointments = await appointmentService.getAppointments();

    const conflictCheck = await checkCopyConflicts(
      sourceAppointment,
      {
        appointment_date: appointmentData.appointment_date,
        start_time: appointmentData.start_time,
        duration_minutes: appointmentData.duration_minutes,
        staff_assignments: staffAssignments,
      },
      existingAppointments,
      allStaff
    );

    // If there are conflicts and no override is provided, return conflict information
    if (conflictCheck.hasConflicts && !body.overrideConflicts) {
      return NextResponse.json({
        success: false,
        error: 'Conflicts detected',
        conflicts: conflictCheck.conflicts,
        canProceed: conflictCheck.canProceed,
        requiresOverride: conflictCheck.requiresOverride,
        overrideOptions: conflictCheck.overrideOptions,
      }, { status: 409 }); // 409 Conflict
    }

    // Validate the appointment data
    const validationErrors = validateAppointmentData(appointmentData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    // Create the copied appointment
    const newAppointment = await appointmentService.createAppointment(appointmentData);

    // Handle staff assignments if provided
    const staffAssignments: StaffAssignment[] = body.staff_assignments || [];
    let assignedStaff = [];

    if (staffAssignments.length > 0) {
      // Assign staff to the new appointment
      for (const assignment of staffAssignments) {
        try {
          const assigned = await appointmentService.assignStaffToAppointment(
            newAppointment.id,
            assignment.staff_id,
            assignment.role,
            assignment.is_primary
          );
          assignedStaff.push(assigned);
        } catch (error) {
          console.error(`Failed to assign staff ${assignment.staff_id}:`, error);
          // Continue with other assignments even if one fails
        }
      }
    } else {
      // If no staff assignments provided, copy from source appointment
      const sourceStaff = await appointmentService.getAppointmentStaff(appointmentId);
      for (const staffMember of sourceStaff) {
        try {
          const assigned = await appointmentService.assignStaffToAppointment(
            newAppointment.id,
            staffMember.staff_id,
            staffMember.role,
            staffMember.is_primary
          );
          assignedStaff.push(assigned);
        } catch (error) {
          console.error(`Failed to copy staff assignment ${staffMember.staff_id}:`, error);
          // Continue with other assignments even if one fails
        }
      }
    }

    // Log successful copy operation
    if (auditTrailId) {
      await auditTrailService.logCopyOperationComplete(auditTrailId, {
        total_requested: 1,
        total_created: 1,
        total_conflicts: 0,
        total_errors: 0,
        created_appointment_ids: [newAppointment.id],
        conflict_details: [],
        error_details: [],
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        appointment: newAppointment,
        assignedStaff,
        audit_trail_id: auditTrailId,
      },
      message: 'Appointment copied successfully'
    });

  } catch (error) {
    console.error('Error copying appointment:', error);

    // Log failed copy operation
    if (auditTrailId) {
      try {
        await auditTrailService.logCopyOperationComplete(auditTrailId, {
          total_requested: 1,
          total_created: 0,
          total_conflicts: 0,
          total_errors: 1,
          created_appointment_ids: [],
          conflict_details: [],
          error_details: [{
            date: body.appointment_date || 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          }],
          notes: 'Copy operation failed',
        });
      } catch (auditError) {
        console.error('Error logging audit trail:', auditError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to copy appointment',
        details: error instanceof Error ? error.message : 'Unknown error',
        audit_trail_id: auditTrailId,
      },
      { status: 500 }
    );
  }
}
