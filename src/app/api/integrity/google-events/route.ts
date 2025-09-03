import { googleEventIntegrityService } from '@/services/googleEventIntegrityService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request schemas
const integrityCheckSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  autoCleanup: z.boolean().optional().default(false),
});

const cleanupSchema = z.object({
  operations: z.array(z.object({
    type: z.enum(['remove_orphaned', 'remove_duplicate', 'remove_invalid_format', 'remove_invalid_staff']),
    appointmentId: z.string().uuid(),
    staffId: z.string().uuid().optional(),
    eventId: z.string().optional(),
    reason: z.string(),
  })),
});

const validateAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
});

/**
 * GET /api/integrity/google-events
 * Perform integrity check on google_event_ids
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const autoCleanup = searchParams.get('autoCleanup') === 'true';

    // Validate query parameters
    const validation = integrityCheckSchema.safeParse({
      appointmentId: appointmentId || undefined,
      autoCleanup,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { appointmentId: validatedAppointmentId, autoCleanup: validatedAutoCleanup } = validation.data;

    let result;
    if (validatedAppointmentId) {
      result = await googleEventIntegrityService.checkAppointmentIntegrity(validatedAppointmentId);
    } else {
      result = await googleEventIntegrityService.performIntegrityCheck();
    }

    // Perform auto-cleanup if requested
    if (validatedAutoCleanup && !result.isValid) {
      const cleanupResult = await googleEventIntegrityService.autoCleanup();
      return NextResponse.json({
        success: true,
        integrityCheck: result,
        cleanup: cleanupResult,
      });
    }

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error) {
    console.error('Integrity check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Integrity check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrity/google-events
 * Perform cleanup operations on invalid event IDs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = cleanupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { operations } = validation.data;

    const result = await googleEventIntegrityService.cleanupInvalidEventIds(operations);

    return NextResponse.json({
      success: result.success,
      result,
    });

  } catch (error) {
    console.error('Cleanup operation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrity/google-events
 * Validate and fix a specific appointment
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateAppointmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { appointmentId } = validation.data;

    const result = await googleEventIntegrityService.validateAndFixAppointment(appointmentId);

    return NextResponse.json({
      success: result.success,
      result,
    });

  } catch (error) {
    console.error('Appointment validation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Appointment validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrity/google-events
 * Perform auto-cleanup of all invalid event IDs
 */
export async function DELETE(request: NextRequest) {
  try {
    const result = await googleEventIntegrityService.autoCleanup();

    return NextResponse.json({
      success: result.success,
      result,
    });

  } catch (error) {
    console.error('Auto-cleanup failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Auto-cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
