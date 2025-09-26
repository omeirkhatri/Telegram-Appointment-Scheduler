import { apiErrorHandler, generateRequestId, ValidationError } from '@/lib/apiErrorHandler';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const UpdateStaffAssignmentRequestSchema = z.object({
  google_event_id: z.string().optional(),
  role: z.string().optional(),
  is_primary: z.boolean().optional(),
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * PUT /api/appointments/[id]/staff/[staffId] - Update staff assignment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  const requestId = generateRequestId();

  try {
    const { id: appointmentId, staffId } = params;
    const body = await request.json();
    const validationResult = UpdateStaffAssignmentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const updateData = validationResult.data;

    // Update the staff assignment
    const result = await appointmentStaffService.updateStaffAssignment(
      appointmentId,
      staffId,
      updateData
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Staff assignment updated successfully',
      timestamp: new Date().toISOString(),
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Update Staff Assignment');
  }
}

