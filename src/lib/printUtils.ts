import type { Appointment, Patient, Staff } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { buildTimezoneArtifacts, type TimezoneArtifacts } from '@/lib/timezoneArtifacts';
import { formatInResolvedTimezone, type TimezoneContext } from '@/utils/timezone';

/**
 * Print utility functions for generating print-friendly content
 */

export const PRINT_DATE_FORMAT = 'dd/MM/yyyy';
export const PRINT_TIME_FORMAT = 'HH:mm';

// Legacy constants for backward compatibility
export const PRINT_TIMEZONE = 'Asia/Dubai';

/**
 * Format date for print display (DD/MM/YYYY)
 * @param date - Date to format
 * @param timezoneContext - Optional timezone context, defaults to legacy Dubai behavior
 */
export function formatPrintDate(date: string | Date, timezoneContext?: TimezoneContext): string {
  const dateObj = normalizePrintDateInput(date);

  if (!dateObj) {
    return 'Invalid date';
  }

  if (timezoneContext) {
    return formatInResolvedTimezone(dateObj, PRINT_DATE_FORMAT, timezoneContext);
  }

  // Legacy behavior for backward compatibility
  return formatInTimeZone(dateObj, PRINT_TIMEZONE, PRINT_DATE_FORMAT);
}

function normalizePrintDateInput(date: string | Date): Date | null {
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }

  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

/**
 * Format time for print display (HH:mm)
 */
export function formatPrintTime(time: string): string {
  // Handle both "HH:mm" and "HH:mm:ss" formats
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
}

/**
 * Format time for print display with timezone context
 * @param time - Time string to format
 * @param timezoneContext - Optional timezone context for timezone metadata
 */
export function formatPrintTimeWithTimezone(time: string, timezoneContext?: TimezoneContext): string {
  const formattedTime = formatPrintTime(time);
  
  if (timezoneContext) {
    const artifacts = buildTimezoneArtifacts(timezoneContext);
    return `${formattedTime} (${artifacts.resolution.abbreviation})`;
  }
  
  return formattedTime;
}

/**
 * Calculate end time for print display
 */
export function getPrintEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':');
  const startDate = new Date();
  startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return format(endDate, PRINT_TIME_FORMAT);
}

/**
 * Format appointment type for print display
 */
export function formatAppointmentTypeForPrint(appointmentType: string): string {
  return appointmentType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get appointment type color for print (using CSS classes)
 */
export function getAppointmentTypePrintClass(appointmentType: string): string {
  const typeMap: Record<string, string> = {
    'doctor_on_call': 'print-type-doctor',
    'lab_test': 'print-type-lab',
    'teleconsultation': 'print-type-tele',
    'physiotherapy': 'print-type-physio',
    'caregiver': 'print-type-caregiver',
    'iv_therapy': 'print-type-iv',
  };

  return typeMap[appointmentType] || 'print-type-default';
}

/**
 * Format patient full address for print
 */
export function formatPatientAddressForPrint(patient: Patient): string {
  const parts = [
    patient.flat_villa_no,
    patient.building_street,
    patient.area,
    patient.city,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Format staff full name for print
 */
export function formatStaffNameForPrint(staff: Staff): string {
  return `${staff.first_name} ${staff.last_name}`;
}

/**
 * Format staff type for print display
 */
export function formatStaffTypeForPrint(staffType: string): string {
  return staffType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format transportation information for print
 */
export function formatTransportationForPrint(
  appointment: Appointment,
  driver?: Staff
): string {
  if (appointment.transportation_type === 'driver' && driver) {
    return `Driver: ${formatStaffNameForPrint(driver)}`;
  } else if (appointment.transportation_type === 'self_transport' && appointment.transportation_method) {
    return `Self-transport: ${appointment.transportation_method}`;
  }

  return 'Transportation not specified';
}

/**
 * Format custom fields for print display
 */
export function formatCustomFieldsForPrint(customFields: any): Array<{ label: string; value: string }> {
  if (!customFields || typeof customFields !== 'object') {
    return [];
  }

  const formattedFields: Array<{ label: string; value: string }> = [];

  // Doctor on Call fields
  if (customFields.chiefComplaint) {
    formattedFields.push({ label: 'Chief Complaint', value: customFields.chiefComplaint });
  }

  // Lab Test fields
  if (customFields.testList) {
    formattedFields.push({ label: 'Tests', value: customFields.testList });
  }
  if (customFields.labName) {
    formattedFields.push({ label: 'Lab', value: customFields.labName });
  }
  if (customFields.sampleTypes) {
    const samples = Array.isArray(customFields.sampleTypes)
      ? customFields.sampleTypes.join(', ')
      : customFields.sampleTypes;
    formattedFields.push({ label: 'Sample Types', value: samples });
  }
  if (customFields.fastingRequired !== undefined) {
    formattedFields.push({ label: 'Fasting Required', value: customFields.fastingRequired ? 'Yes' : 'No' });
  }

  // Teleconsultation fields
  if (customFields.platform) {
    formattedFields.push({ label: 'Platform', value: customFields.platform });
  }
  if (customFields.consultationType) {
    formattedFields.push({ label: 'Consultation Type', value: customFields.consultationType });
  }

  // Physiotherapy fields
  if (customFields.condition) {
    formattedFields.push({ label: 'Condition/Injury', value: customFields.condition });
  }
  if (customFields.sessionType) {
    formattedFields.push({ label: 'Session Type', value: customFields.sessionType });
  }

  // IV Therapy fields
  if (customFields.ivType) {
    formattedFields.push({ label: 'IV Type', value: customFields.ivType });
  }
  if (customFields.ivCompany) {
    formattedFields.push({ label: 'IV Company', value: customFields.ivCompany });
  }

  return formattedFields;
}

/**
 * Generate print-friendly appointment summary
 * @param appointment - Appointment data
 * @param patient - Patient data
 * @param staff - Assigned staff members
 * @param driver - Optional driver
 * @param timezoneContext - Optional timezone context for timezone-aware formatting
 */
export function generateAppointmentPrintSummary(
  appointment: Appointment,
  patient: Patient,
  staff: Staff[],
  driver?: Staff,
  timezoneContext?: TimezoneContext
): {
  id: string;
  date: string;
  time: string;
  endTime: string;
  duration: string;
  type: string;
  typeClass: string;
  patient: {
    name: string;
    phone: string;
    address: string;
  };
  staff: Array<{
    name: string;
    type: string;
    phone: string;
  }>;
  transportation: string;
  customFields: Array<{ label: string; value: string }>;
  notes?: string;
} {
  return {
    id: appointment.id,
    date: formatPrintDate(appointment.appointment_date, timezoneContext),
    time: formatPrintTimeWithTimezone(appointment.start_time, timezoneContext),
    endTime: getPrintEndTime(appointment.start_time, appointment.duration_minutes),
    duration: `${appointment.duration_minutes} minutes`,
    type: formatAppointmentTypeForPrint(appointment.appointment_type),
    typeClass: getAppointmentTypePrintClass(appointment.appointment_type),
    patient: {
      name: patient.name,
      phone: patient.phone,
      address: formatPatientAddressForPrint(patient),
    },
    staff: staff.map(s => ({
      name: formatStaffNameForPrint(s),
      type: formatStaffTypeForPrint(s.staff_type),
      phone: s.phone,
    })),
    transportation: formatTransportationForPrint(appointment, driver),
    customFields: formatCustomFieldsForPrint(appointment.custom_fields),
    notes: appointment.notes || undefined,
  };
}

/**
 * Generate print-friendly agenda data
 * @param staff - Staff member for the agenda
 * @param appointments - Array of appointment data
 * @param date - Date for the agenda
 * @param timezoneContext - Optional timezone context for timezone-aware formatting
 */
export function generateAgendaPrintData(
  staff: Staff,
  appointments: Array<{
    appointment: Appointment;
    patient: Patient;
    staff: Staff[];
    driver?: Staff;
  }>,
  date: Date,
  timezoneContext?: TimezoneContext
): {
  staff: {
    name: string;
    type: string;
    phone: string;
    email: string;
  };
  date: string;
  appointments: Array<ReturnType<typeof generateAppointmentPrintSummary>>;
  totalAppointments: number;
} {
  return {
    staff: {
      name: formatStaffNameForPrint(staff),
      type: formatStaffTypeForPrint(staff.staff_type),
      phone: staff.phone,
      email: staff.email,
    },
    date: formatPrintDate(date, timezoneContext),
    appointments: appointments.map(({ appointment, patient, staff: assignedStaff, driver }) =>
      generateAppointmentPrintSummary(appointment, patient, assignedStaff, driver, timezoneContext)
    ),
    totalAppointments: appointments.length,
  };
}

/**
 * Generate timezone metadata for print outputs
 * @param timezoneContext - Timezone context for metadata
 */
export function generatePrintTimezoneMetadata(timezoneContext?: TimezoneContext): {
  timezone: string;
  abbreviation: string;
  source: string;
  offsetMinutes: number;
} | null {
  if (!timezoneContext) {
    return null;
  }
  
  const artifacts = buildTimezoneArtifacts(timezoneContext);
  
  return {
    timezone: artifacts.resolution.timezone,
    abbreviation: artifacts.resolution.abbreviation,
    source: artifacts.resolution.source,
    offsetMinutes: artifacts.resolution.offsetMinutes,
  };
}

/**
 * Print utility functions
 */
export const printUtils = {
  /**
   * Open print dialog for current page
   */
  printPage: () => {
    window.print();
  },

  /**
   * Open print dialog for specific element
   */
  printElement: (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id "${elementId}" not found`);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Could not open print window');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  },

  /**
   * Generate print-friendly URL for agenda
   */
  getAgendaPrintUrl: (staffId: string, date: string) => {
    return `/print/agenda/${staffId}/${date}`;
  },

  /**
   * Generate print-friendly URL for appointment
   */
  getAppointmentPrintUrl: (appointmentId: string) => {
    return `/print/appointment/${appointmentId}`;
  },
};
