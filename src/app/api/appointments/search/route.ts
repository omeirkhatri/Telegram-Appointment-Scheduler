import { appointmentService } from '@/services/appointmentService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/appointments/search - Search appointments with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const patientId = searchParams.get('patient_id') || '';
    const appointmentType = searchParams.get('appointment_type') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const driverId = searchParams.get('driver_id') || '';
    const hasRecurringRule = searchParams.get('has_recurring_rule');

    let appointments;

    if (patientId) {
      // Get appointments by patient
      appointments = await appointmentService.getAppointmentsByPatient(patientId);
    } else if (appointmentType) {
      // Get appointments by type
      appointments = await appointmentService.getAppointmentsByType(appointmentType);
    } else if (status) {
      // Get appointments by status
      appointments = await appointmentService.getAppointmentsByStatus(status);
    } else if (dateFrom && dateTo) {
      // Get appointments by date range
      appointments = await appointmentService.getAppointmentsByDateRange(dateFrom, dateTo);
    } else if (driverId) {
      // Get appointments by driver
      appointments = await appointmentService.getAppointmentsByDriver(driverId);
    } else if (hasRecurringRule === 'true') {
      // Get recurring appointments
      appointments = await appointmentService.getRecurringAppointments();
    } else {
      // Use general filtering
      const filters: any = {};
      if (hasRecurringRule !== null) {
        filters.has_recurring_rule = hasRecurringRule === 'true';
      }
      if (status) {
        filters.status = status;
      }
      if (appointmentType) {
        filters.appointment_type = appointmentType;
      }
      if (dateFrom) {
        filters.date_from = dateFrom;
      }
      if (dateTo) {
        filters.date_to = dateTo;
      }
      appointments = await appointmentService.getAppointments(filters);
    }

    return NextResponse.json({
      success: true,
      data: appointments,
      count: appointments.length,
    });
  } catch (error) {
    console.error('Error searching appointments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search appointments',
      },
      { status: 500 },
    );
  }
}
