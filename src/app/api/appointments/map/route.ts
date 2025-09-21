import { appointmentService } from '@/services/appointmentService';
import type { AppointmentFilters } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/appointments/map - Get appointments for map view (now includes all recurring appointments as individual rows)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query parameters
    const filters: AppointmentFilters = {};

    if (searchParams.has('patient_id')) {
      filters.patient_id = searchParams.get('patient_id')!;
    }

    if (searchParams.has('appointment_type')) {
      filters.appointment_type = searchParams.get('appointment_type') as any;
    }

    if (searchParams.has('status')) {
      filters.status = searchParams.get('status') as any;
    }

    if (searchParams.has('appointment_date')) {
      filters.appointment_date = searchParams.get('appointment_date')!;
    }

    if (searchParams.has('date_from')) {
      filters.date_from = searchParams.get('date_from')!;
    }

    if (searchParams.has('date_to')) {
      filters.date_to = searchParams.get('date_to')!;
    }

    if (searchParams.has('driver_id')) {
      filters.driver_id = searchParams.get('driver_id')!;
    }

    if (searchParams.has('transportation_type')) {
      filters.transportation_type = searchParams.get('transportation_type') as any;
    }

    if (searchParams.has('has_recurring_rule')) {
      filters.has_recurring_rule = searchParams.get('has_recurring_rule') === 'true';
    }

    // Use the regular appointments method - now includes all recurring appointments as individual rows
    const appointments = await appointmentService.getAppointments(filters);

    return NextResponse.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error('Error fetching appointments for map view:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch appointments for map view',
      },
      { status: 500 },
    );
  }
}
