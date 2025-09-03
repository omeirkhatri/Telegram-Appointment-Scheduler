import { googleCalendarService } from '@/services/googleCalendarService';
import { staffService } from '@/services/staffService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/staff/[id]/availability - Check staff availability
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(request.url);

    const time = searchParams.get('time'); // HH:MM format
    const day = searchParams.get('day'); // 1-7 (Monday-Sunday)
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const startTime = searchParams.get('start_time'); // HH:MM format
    const endTime = searchParams.get('end_time'); // HH:MM format

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

    const availability = {
      isAvailable: false,
      reason: '',
      workingHours: null as any,
      availableDays: staff.available_days,
      status: staff.status,
    };

    // Check if staff is active
    if (staff.status !== 'active') {
      availability.isAvailable = false;
      availability.reason = 'Staff member is not active';
      return NextResponse.json({
        success: true,
        data: availability,
      });
    }

    // Get working hours
    const workingHours = await staffService.getStaffWorkingHours(params.id);
    if (workingHours) {
      availability.workingHours = workingHours;
    }

    // Check availability for specific time and day
    if (time && day) {
      const dayNum = parseInt(day);
      const isAvailable = await staffService.isStaffAvailableAtTime(params.id, time, dayNum);
      availability.isAvailable = isAvailable;

      if (!isAvailable) {
        if (!staff.available_days.includes(dayNum)) {
          availability.reason = 'Staff member does not work on this day';
        } else {
          availability.reason = 'Time is outside working hours';
        }
      }
    }

    // Check availability for time slot (for appointments)
    if (startTime && endTime && date) {
      let isAvailable = true;
      let reason = '';

      // Check if staff works on the day of the week
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1-7 format

      if (!staff.available_days.includes(adjustedDay)) {
        isAvailable = false;
        reason = 'Staff member does not work on this day';
      } else {
        // Check working hours
        const startTimeDate = new Date(`2000-01-01T${startTime}:00`);
        const endTimeDate = new Date(`2000-01-01T${endTime}:00`);
        const workingStartDate = new Date(`2000-01-01T${staff.working_hours_start}:00`);
        const workingEndDate = new Date(`2000-01-01T${staff.working_hours_end}:00`);

        if (startTimeDate < workingStartDate || endTimeDate > workingEndDate) {
          isAvailable = false;
          reason = 'Time slot is outside working hours';
        } else {
          // Check Google Calendar availability if integrated
          if (staff.google_calendar_id) {
            try {
              const calendarAvailable = await googleCalendarService.checkStaffAvailability(
                staff,
                startTime,
                endTime,
                date,
              );

              if (!calendarAvailable) {
                isAvailable = false;
                reason = 'Staff member has conflicting appointments';
              }
            } catch (error) {
              console.error('Error checking calendar availability:', error);
              // If we can't check calendar, assume available but warn
              reason = 'Calendar availability could not be verified';
            }
          }
        }
      }

      availability.isAvailable = isAvailable;
      if (!isAvailable) {
        availability.reason = reason;
      }
    }

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('Error checking staff availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check staff availability',
      },
      { status: 500 },
    );
  }
}
