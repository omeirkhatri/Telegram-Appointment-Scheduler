import { generateBulkCopyDates, validateBulkCopyConfig } from '@/lib/bulkCopyUtils';
import { checkCopyConflicts } from '@/lib/copyConflictResolution';
import { appointmentService, appointmentStaffService, auditTrailService, staffService } from '@/services';
import type { CreateAppointment, StaffAssignment } from '@/types';
import { validateAppointmentData } from '@/types/appointment';
import type { BulkCopyRequest, BulkCopyResult } from '@/types/bulkCopy';
import { deepClone } from '@/utils/deepClone';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/appointments/[id]/bulk-copy - Bulk copy an appointment with patterns
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  let auditTrailId: string | null = null;

  try {
    const appointmentId = params.id;
    const body: BulkCopyRequest = await request.json();

    // Validate bulk copy configuration
    const configErrors = validateBulkCopyConfig(body.config);
    if (configErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid bulk copy configuration',
          details: configErrors,
        },
        { status: 400 },
      );
    }

    // Get the source appointment
    const sourceAppointment = await appointmentService.getAppointment(appointmentId);
    if (!sourceAppointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source appointment not found',
        },
        { status: 404 },
      );
    }

    // Start audit trail logging
    auditTrailId = await auditTrailService.logCopyOperationStart('bulk_copy', appointmentId, {
      user_id: body.user_id,
      copy_config: body.config,
      staff_assignments: body.staffAssignments,
      override_conflicts: body.overrideConflicts,
      metadata: {
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      },
      notes: body.notes,
    });

    // Generate dates for bulk copy
    const targetDates = generateBulkCopyDates(body.config);
    if (targetDates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid dates generated for bulk copy',
        },
        { status: 400 },
      );
    }

    // Get all staff and existing appointments for conflict checking
    const allStaff = await staffService.getStaff();
    const existingAppointments = await appointmentService.getAppointments();

    // Prepare result tracking
    const result: BulkCopyResult = {
      success: true,
      createdAppointments: [],
      conflicts: [],
      errors: [],
      totalRequested: targetDates.length,
      totalCreated: 0,
      totalConflicts: 0,
      totalErrors: 0,
    };

    // Process each date
    for (const targetDate of targetDates) {
      try {
        // Create appointment data for this copy
        const appointmentData: CreateAppointment = {
          patient_id: sourceAppointment.patient_id,
          appointment_type: sourceAppointment.appointment_type,
          appointment_date: targetDate,
          start_time: sourceAppointment.start_time,
          duration_minutes: sourceAppointment.duration_minutes,
          status: 'scheduled',
          custom_fields: deepClone(sourceAppointment.custom_fields || {}),
          transportation_type: sourceAppointment.transportation_type,
          transportation_method: sourceAppointment.transportation_method,
          driver_id: sourceAppointment.driver_id,
          notes: sourceAppointment.notes,
          recurring_rule: undefined, // Don't copy recurring rules
          google_event_ids: {},
        };

        // Check for conflicts
        const staffAssignments: StaffAssignment[] = body.staffAssignments || [];
        const conflictCheck = await checkCopyConflicts(
          sourceAppointment,
          {
            appointment_date: appointmentData.appointment_date,
            start_time: appointmentData.start_time,
            duration_minutes: appointmentData.duration_minutes,
            staff_assignments: staffAssignments,
          },
          existingAppointments,
          allStaff,
        );

        // Handle conflicts
        if (conflictCheck.hasConflicts && !body.overrideConflicts) {
          result.conflicts.push({
            date: targetDate,
            conflicts: conflictCheck.conflicts,
          });
          result.totalConflicts++;
          continue;
        }

        // Validate appointment data
        const validationErrors = validateAppointmentData(appointmentData);
        if (validationErrors.length > 0) {
          result.errors.push({
            date: targetDate,
            error: `Validation failed: ${validationErrors.join(', ')}`,
          });
          result.totalErrors++;
          continue;
        }

        // Create the appointment
        const newAppointment = await appointmentService.createAppointment(appointmentData);

        // Handle staff assignments
        if (staffAssignments.length > 0) {
          try {
            await appointmentStaffService.assignStaffToAppointment(
              newAppointment.id,
              staffAssignments,
            );
          } catch (error) {
            console.error(`Failed to assign staff to appointment ${newAppointment.id}:`, error);
          }
        }

        // Add to successful results
        result.createdAppointments.push({
          id: newAppointment.id,
          appointment_date: newAppointment.appointment_date,
          start_time: newAppointment.start_time,
        });
        result.totalCreated++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          date: targetDate,
          error: errorMessage,
        });
        result.totalErrors++;
      }
    }

    // Determine overall success
    result.success = result.totalCreated > 0;

    // Log bulk copy operation completion
    if (auditTrailId) {
      await auditTrailService.logCopyOperationComplete(auditTrailId, {
        total_requested: result.totalRequested,
        total_created: result.totalCreated,
        total_conflicts: result.totalConflicts,
        total_errors: result.totalErrors,
        created_appointment_ids: result.createdAppointments.map(apt => apt.id),
        conflict_details: result.conflicts,
        error_details: result.errors,
      });
    }

    // Return appropriate status code
    const statusCode = result.success ? 200 : 400;

    return NextResponse.json({
      success: result.success,
      data: {
        ...result,
        audit_trail_id: auditTrailId,
      },
      message: `Bulk copy completed: ${result.totalCreated}/${result.totalRequested} appointments created`,
    }, { status: statusCode });

  } catch (error) {
    console.error('Bulk copy error:', error);

    // Log failed bulk copy operation
    if (auditTrailId) {
      try {
        await auditTrailService.logCopyOperationComplete(auditTrailId, {
          total_requested: 0,
          total_created: 0,
          total_conflicts: 0,
          total_errors: 1,
          created_appointment_ids: [],
          conflict_details: [],
          error_details: [{
            date: 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          }],
          notes: 'Bulk copy operation failed with exception',
        });
      } catch (auditError) {
        console.error('Error logging audit trail:', auditError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform bulk copy',
        audit_trail_id: auditTrailId,
      },
      { status: 500 },
    );
  }
}
