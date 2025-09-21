import { staffService } from '@/services/staffService';
import type { UpdateStaff } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/staff/[id] - Get a single staff member by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const staff = await staffService.getStaffMember(id);

    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          error: 'Staff member not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error('Error fetching staff member:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch staff member',
      },
      { status: 500 },
    );
  }
}

// PUT /api/staff/[id] - Update an existing staff member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Extract staff data
    const updateData: Partial<UpdateStaff> = {
      first_name: body.first_name,
      last_name: body.last_name,
      staff_type: body.staff_type,
      specialization: body.specialization,
      phone: body.phone,
      email: body.email,
      telegram_user_id: body.telegram_user_id,
      available_days: body.available_days,
      working_hours_start: body.working_hours_start,
      working_hours_end: body.working_hours_end,
      status: body.status,
      telegram_verified: body.telegram_verified,
    };

    // Debug logging
    console.log('🔍 Staff update API received data:', {
      staffId: id,
      body: body,
      updateData: updateData,
      telegramUserId: body.telegram_user_id,
      telegramVerified: body.telegram_verified
    });

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateStaff] === undefined) {
        delete updateData[key as keyof UpdateStaff];
      }
    });

    // Validate required fields if they are being updated
    const validationErrors = validateStaffUpdateData(updateData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 },
      );
    }


    // Update staff member
    try {
      const updatedStaff = await staffService.updateStaff(id, updateData);

      return NextResponse.json({
        success: true,
        data: updatedStaff,
        message: 'Staff member updated successfully',
      });
    } catch (error) {
      console.error('Staff service error:', error);
      if (error instanceof Error && error.message === 'Staff member not found') {
        return NextResponse.json(
          {
            success: false,
            error: 'Staff member not found',
          },
          { status: 404 },
        );
      }
      throw error; // Re-throw other errors to be caught by the outer catch
    }
  } catch (error) {
    console.error('Error updating staff member:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update staff member',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/staff/[id] - Delete a staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check if staff member exists
    const staff = await staffService.getStaffMember(params.id);
    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          error: 'Staff member not found',
        },
        { status: 404 },
      );
    }

    // Delete staff member
    await staffService.deleteStaff(params.id);

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete staff member',
      },
      { status: 500 },
    );
  }
}

// Helper function to validate staff update data
function validateStaffUpdateData(data: Partial<UpdateStaff>): string[] {
  const errors: string[] = [];

  if (data.first_name !== undefined && !data.first_name?.trim()) {
    errors.push('First name cannot be empty');
  }

  if (data.last_name !== undefined && !data.last_name?.trim()) {
    errors.push('Last name cannot be empty');
  }

  if (data.phone !== undefined && !data.phone?.trim()) {
    errors.push('Phone number cannot be empty');
  }

  if (data.email !== undefined && !data.email?.trim()) {
    errors.push('Email cannot be empty');
  } else if (data.email !== undefined) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  }

  if (data.available_days !== undefined && !data.available_days.every(day => day >= 1 && day <= 7)) {
    errors.push('Invalid available days (must be 1-7)');
  }

  if (data.working_hours_start !== undefined && data.working_hours_end !== undefined) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.working_hours_start) || !timeRegex.test(data.working_hours_end)) {
      errors.push('Invalid working hours format (HH:MM)');
    } else {
      const startTime = new Date(`2000-01-01T${data.working_hours_start}:00`);
      const endTime = new Date(`2000-01-01T${data.working_hours_end}:00`);
      if (startTime >= endTime) {
        errors.push('Working hours start must be before end time');
      }
    }
  }

  return errors;
}
