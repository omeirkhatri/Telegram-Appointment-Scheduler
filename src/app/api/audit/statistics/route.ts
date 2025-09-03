import { auditTrailService } from '@/services';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/audit/statistics - Get audit trail statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const operationType = searchParams.get('operation_type') as 'single_copy' | 'bulk_copy' | null;

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'start_date and end_date are required',
        },
        { status: 400 },
      );
    }

    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
        },
        { status: 400 },
      );
    }

    if (startDateObj > endDateObj) {
      return NextResponse.json(
        {
          success: false,
          error: 'start_date must be before or equal to end_date',
        },
        { status: 400 },
      );
    }

    // Validate operation type if provided
    if (operationType && !['single_copy', 'bulk_copy'].includes(operationType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'operation_type must be either "single_copy" or "bulk_copy"',
        },
        { status: 400 },
      );
    }

    // Get audit statistics
    const result = await auditTrailService.getAuditStatistics({
      start_date: startDate,
      end_date: endDate,
      operation_type: operationType || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to retrieve audit statistics',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Audit statistics retrieved successfully',
    });

  } catch (error) {
    console.error('Error retrieving audit statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve audit statistics',
      },
      { status: 500 },
    );
  }
}
