import { staffService } from '@/services/staffService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/staff/filters - Get available filter options
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('type'); // 'staff_types' or 'statuses'

    let data;

    if (filterType === 'staff_types') {
      data = await staffService.getStaffTypes();
    } else {
      // Return both staff types and statuses
      const staffTypes = await staffService.getStaffTypes();

      data = {
        staff_types: staffTypes,
        statuses: ['active', 'inactive']
      };
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch filter options'
      },
      { status: 500 }
    );
  }
}
