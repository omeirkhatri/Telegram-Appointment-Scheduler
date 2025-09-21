import { PrintableAppointmentSheet } from '@/components/features/appointments/print/PrintableAppointmentSheet';
import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { patientService } from '@/services/patientService';
import { staffService } from '@/services/staffService';
import { formatInTimeZone } from 'date-fns-tz';
import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';
import { formatInResolvedTimezone, type TimezoneContext } from '@/utils/timezone';
import { notFound } from 'next/navigation';

interface PrintAppointmentPageProps {
  params: {
    id: string;
  };
}

export default async function PrintAppointmentPage({ params }: PrintAppointmentPageProps) {
  try {
    // Get appointment
    const appointment = await appointmentService.getAppointment(params.id);
    if (!appointment) {
      notFound();
    }

    // Get patient
    const patient = await patientService.getPatient(appointment.patient_id);
    if (!patient) {
      notFound();
    }

    // Get staff assignments
    const staffAssignments = await appointmentStaffService.getStaffForAppointment(params.id);

    // Get all staff members
    const staff = await Promise.all(
      staffAssignments.map(async (assignment) => {
        const staffMember = await staffService.getStaff(assignment.staff_id);
        return staffMember;
      })
    );

    // Filter out null staff members
    const validStaff = staff.filter(Boolean) as any[];

    // Find driver if any
    const driver = validStaff.find(s => s.staff_type === 'driver');

    return (
      <div className="print-page">
        <PrintableAppointmentSheet
          appointment={appointment}
          patient={patient}
          staff={validStaff}
          driver={driver}
        />
      </div>
    );
  } catch (error) {
    console.error('Error generating print appointment:', error);
    notFound();
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: PrintAppointmentPageProps) {
  try {
    const appointment = await appointmentService.getAppointment(params.id);

    if (!appointment) {
      return {
        title: 'Appointment Not Found',
      };
    }

    // Build timezone context for timezone-aware formatting
    const timezoneContext: TimezoneContext = {
      // TODO: In the future, this could be derived from appointment location or organization settings
      fallbackTimezone: 'Asia/Dubai',
      preferLegacyFallback: true,
    };

    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = formatInResolvedTimezone(appointmentDate, 'dd/MM/yyyy', timezoneContext);
    const appointmentType = appointment.appointment_type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    return {
      title: `Appointment - ${appointmentType} - ${formattedDate}`,
      description: `${appointmentType} appointment on ${formattedDate}`,
    };
  } catch (error) {
    return {
      title: 'Appointment Not Found',
    };
  }
}
