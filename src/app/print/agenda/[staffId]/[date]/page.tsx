import { PrintableAgenda } from '@/components/print/PrintableAgenda';
import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { patientService } from '@/services/patientService';
import { staffService } from '@/services/staffService';
import { formatInTimeZone } from 'date-fns-tz';
import { notFound } from 'next/navigation';

interface PrintAgendaPageProps {
  params: {
    staffId: string;
    date: string;
  };
}

export default async function PrintAgendaPage({ params }: PrintAgendaPageProps) {
  try {
    // Parse the date parameter (expected format: YYYY-MM-DD)
    const agendaDate = new Date(params.date);
    if (isNaN(agendaDate.getTime())) {
      notFound();
    }

    // Get staff member
    const staff = await staffService.getStaff(params.staffId);
    if (!staff) {
      notFound();
    }

    // Get appointments for the staff member on the given date
    const appointments = await appointmentService.getAppointments({
      date_from: params.date,
      date_to: params.date,
    });

    // Filter appointments for this staff member
    const staffAppointments = [];
    for (const appointment of appointments) {
      const staffAssignments = await appointmentStaffService.getStaffForAppointment(appointment.id);
      const isAssignedToStaff = staffAssignments.some(assignment => assignment.staff_id === params.staffId);

      if (isAssignedToStaff) {
        // Get patient
        const patient = await patientService.getPatient(appointment.patient_id);
        if (!patient) continue;

        // Get all staff assignments for this appointment
        const allStaff = await Promise.all(
          staffAssignments.map(async (assignment) => {
            const staffMember = await staffService.getStaff(assignment.staff_id);
            return staffMember;
          })
        );

        // Filter out null staff members
        const validStaff = allStaff.filter(Boolean) as any[];

        // Find driver if any
        const driver = validStaff.find(s => s.staff_type === 'driver');

        staffAppointments.push({
          appointment,
          patient,
          staff: validStaff,
          driver,
        });
      }
    }

    // Sort appointments by start time
    staffAppointments.sort((a, b) =>
      a.appointment.start_time.localeCompare(b.appointment.start_time)
    );

    return (
      <div className="print-page">
        <PrintableAgenda
          staff={staff}
          appointments={staffAppointments}
          date={agendaDate}
        />
      </div>
    );
  } catch (error) {
    console.error('Error generating print agenda:', error);
    notFound();
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: PrintAgendaPageProps) {
  try {
    const staff = await staffService.getStaff(params.staffId);
    const agendaDate = new Date(params.date);

    if (!staff || isNaN(agendaDate.getTime())) {
      return {
        title: 'Agenda Not Found',
      };
    }

    const formattedDate = formatInTimeZone(agendaDate, 'Asia/Dubai', 'dd/MM/yyyy');
    const staffName = `${staff.first_name} ${staff.last_name}`;

    return {
      title: `Agenda - ${staffName} - ${formattedDate}`,
      description: `Daily appointment agenda for ${staffName} on ${formattedDate}`,
    };
  } catch (error) {
    return {
      title: 'Agenda Not Found',
    };
  }
}
