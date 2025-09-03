import type { Appointment } from '@/types/appointment';
import { getAppointmentTypeDisplayName } from '@/types/appointment';
import type { Patient } from '@/types/patient';
import { getPatientFullAddress } from '@/types/patient';
import type { Staff, StaffType } from '@/types/staff';
import { getStaffFullName } from '@/types/staff';
import { formatDate } from '@/utils/timezone';

// Google Calendar Event Formatter
export class CalendarEventFormatter {
  private static readonly TIMEZONE = 'Asia/Dubai';
  private static readonly DATE_FORMAT = 'dd/MM/yyyy';
  private static readonly TIME_FORMAT = 'HH:mm';

  /**
   * Format appointment title for Google Calendar
   */
  static formatEventTitle(
    appointment: Appointment,
    patient: Patient,
    staff?: Staff,
  ): string {
    const appointmentType = getAppointmentTypeDisplayName(appointment.appointment_type);
    const patientName = patient.name;

    if (staff) {
      const staffName = getStaffFullName(staff);
      return `${appointmentType} - ${patientName} (${staffName})`;
    }

    return `${appointmentType} - ${patientName}`;
  }

  /**
   * Format appointment description for Google Calendar
   */
  static formatEventDescription(
    appointment: Appointment,
    patient: Patient,
    staff?: Staff,
    assignedStaff?: Staff[],
  ): string {
    const lines: string[] = [];

    // Basic appointment information
    lines.push('📅 **Appointment Details**');
    lines.push(`Type: ${getAppointmentTypeDisplayName(appointment.appointment_type)}`);
    lines.push(`Date: ${this.formatDate(appointment.appointment_date)}`);
    lines.push(`Time: ${appointment.start_time} - ${this.getEndTime(appointment.start_time, appointment.duration_minutes)}`);
    lines.push(`Duration: ${appointment.duration_minutes} minutes`);
    lines.push(`Status: ${appointment.status}`);

    // Patient information
    lines.push('');
    lines.push('👤 **Patient Information**');
    lines.push(`Name: ${patient.name}`);
    lines.push(`Phone: ${patient.phone}`);
    lines.push(`Address: ${getPatientFullAddress(patient)}`);

    if (patient.medical_notes) {
      lines.push(`Medical Notes: ${patient.medical_notes}`);
    }

    if (patient.emergency_contact) {
      lines.push(`Emergency Contact: ${patient.emergency_contact}`);
    }

    // Staff assignment information
    if (assignedStaff && assignedStaff.length > 0) {
      lines.push('');
      lines.push('👨‍⚕️ **Assigned Staff**');
      assignedStaff.forEach(staffMember => {
        const staffType = this.getStaffTypeDisplayName(staffMember.staff_type);
        const staffName = getStaffFullName(staffMember);
        lines.push(`• ${staffType}: ${staffName} (${staffMember.phone})`);
      });
    }

    // Transportation information
    if (appointment.transportation_type) {
      lines.push('');
      lines.push('🚗 **Transportation**');
      lines.push(`Type: ${this.getTransportationTypeDisplayName(appointment.transportation_type)}`);

      if (appointment.transportation_type === 'driver' && appointment.driver_id) {
        const driver = assignedStaff?.find(s => s.id === appointment.driver_id);
        if (driver) {
          lines.push(`Driver: ${getStaffFullName(driver)} (${driver.phone})`);
        }
      }

      if (appointment.transportation_type === 'self_transport' && appointment.transportation_method) {
        lines.push(`Method: ${appointment.transportation_method}`);
      }
    }

    // Custom fields based on appointment type
    const customFieldsDescription = this.formatCustomFields(appointment);
    if (customFieldsDescription) {
      lines.push('');
      lines.push('📋 **Additional Details**');
      lines.push(customFieldsDescription);
    }

    // Notes
    if (appointment.notes) {
      lines.push('');
      lines.push('📝 **Notes**');
      lines.push(appointment.notes);
    }

    // Recurring information
    if (appointment.recurring_rule) {
      lines.push('');
      lines.push('🔄 **Recurring Appointment**');
      lines.push(this.formatRecurringRule(appointment.recurring_rule));
    }

    return lines.join('\n');
  }

  /**
   * Format custom fields based on appointment type
   */
  private static formatCustomFields(appointment: Appointment): string {
    const customFields = appointment.custom_fields;
    if (!customFields || Object.keys(customFields).length === 0) {
      return '';
    }

    const lines: string[] = [];

    switch (appointment.appointment_type) {
      case 'doctor_on_call':
        if (customFields.chief_complaint) {
          lines.push(`Chief Complaint: ${customFields.chief_complaint}`);
        }
        if (customFields.primary_doctor_id) {
          lines.push(`Primary Doctor ID: ${customFields.primary_doctor_id}`);
        }
        if (customFields.assisting_nurse_id) {
          lines.push(`Assisting Nurse ID: ${customFields.assisting_nurse_id}`);
        }
        break;

      case 'lab_test':
        if (customFields.test_list) {
          lines.push(`Tests: ${customFields.test_list}`);
        }
        if (customFields.lab_name) {
          lines.push(`Lab: ${customFields.lab_name}`);
        }
        if (customFields.sample_types) {
          lines.push(`Sample Types: ${Array.isArray(customFields.sample_types) ? customFields.sample_types.join(', ') : customFields.sample_types}`);
        }
        if (customFields.nurse_id) {
          lines.push(`Nurse ID: ${customFields.nurse_id}`);
        }
        if (customFields.fasting_required) {
          lines.push(`Fasting Required: ${customFields.fasting_required ? 'Yes' : 'No'}`);
        }
        break;

      case 'teleconsultation':
        if (customFields.platform) {
          lines.push(`Platform: ${customFields.platform}`);
        }
        if (customFields.doctor_id) {
          lines.push(`Doctor ID: ${customFields.doctor_id}`);
        }
        if (customFields.consultation_type) {
          lines.push(`Consultation Type: ${customFields.consultation_type}`);
        }
        break;

      case 'physiotherapy':
        if (customFields.physiotherapist_id) {
          lines.push(`Physiotherapist ID: ${customFields.physiotherapist_id}`);
        }
        if (customFields.condition_injury) {
          lines.push(`Condition/Injury: ${customFields.condition_injury}`);
        }
        if (customFields.session_type) {
          lines.push(`Session Type: ${customFields.session_type}`);
        }
        break;

      case 'caregiver':
        if (customFields.primary_caregiver_id) {
          lines.push(`Primary Caregiver ID: ${customFields.primary_caregiver_id}`);
        }
        if (customFields.backup_caregiver_id) {
          lines.push(`Backup Caregiver ID: ${customFields.backup_caregiver_id}`);
        }
        break;

      case 'iv_therapy':
        if (customFields.nurse_id) {
          lines.push(`Nurse ID: ${customFields.nurse_id}`);
        }
        if (customFields.doctor_id) {
          lines.push(`Doctor ID: ${customFields.doctor_id}`);
        }
        if (customFields.iv_type) {
          lines.push(`IV Type: ${customFields.iv_type}`);
        }
        if (customFields.iv_company) {
          lines.push(`IV Company: ${customFields.iv_company}`);
        }
        break;
    }

    return lines.join('\n');
  }

  /**
   * Format recurring rule for display
   */
  private static formatRecurringRule(recurringRule: any): string {
    const frequency = recurringRule.frequency;
    const interval = recurringRule.interval;

    let description = `Repeats every ${interval} `;

    switch (frequency) {
      case 'daily':
        description += interval === 1 ? 'day' : 'days';
        break;
      case 'weekly':
        description += interval === 1 ? 'week' : 'weeks';
        if (recurringRule.days_of_week && recurringRule.days_of_week.length > 0) {
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const days = recurringRule.days_of_week.map((day: number) => dayNames[day - 1]).join(', ');
          description += ` on ${days}`;
        }
        break;
      case 'monthly':
        description += interval === 1 ? 'month' : 'months';
        if (recurringRule.day_of_month) {
          description += ` on day ${recurringRule.day_of_month}`;
        }
        break;
      case 'yearly':
        description += interval === 1 ? 'year' : 'years';
        if (recurringRule.month_of_year) {
          const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
          ];
          description += ` in ${monthNames[recurringRule.month_of_year - 1]}`;
        }
        break;
    }

    if (recurringRule.end_date) {
      description += ` until ${this.formatDate(recurringRule.end_date)}`;
    } else if (recurringRule.end_occurrences) {
      description += ` for ${recurringRule.end_occurrences} occurrences`;
    }

    return description;
  }

  /**
   * Get staff type display name
   */
  private static getStaffTypeDisplayName(staffType: StaffType): string {
    const displayNames: Record<StaffType, string> = {
      doctor: 'Doctor',
      nurse: 'Nurse',
      physiotherapist: 'Physiotherapist',
      caregiver: 'Caregiver',
      driver: 'Driver',
      lab_technician: 'Lab Technician',
    };
    return displayNames[staffType];
  }

  /**
   * Get transportation type display name
   */
  private static getTransportationTypeDisplayName(transportationType: string): string {
    const displayNames: Record<string, string> = {
      driver: 'Driver',
      self_transport: 'Self Transport',
    };
    return displayNames[transportationType] || transportationType;
  }

  /**
   * Format date according to project standards (DD/MM/YYYY) in Asia/Dubai timezone
   */
  private static formatDate(dateString: string): string {
    return formatDate(dateString);
  }

  /**
   * Get appointment end time
   */
  private static getEndTime(startTime: string, durationMinutes: number): string {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end.toTimeString().slice(0, 5); // HH:MM format
  }

  /**
   * Create Google Calendar event data
   */
  static createEventData(
    appointment: Appointment,
    patient: Patient,
    staff?: Staff,
    assignedStaff?: Staff[],
  ): {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: string;
    attendees?: { email: string }[];
  } {
    const summary = this.formatEventTitle(appointment, patient, staff);
    const description = this.formatEventDescription(appointment, patient, staff, assignedStaff);

    // Format datetime with timezone
    const startDateTime = formatForGoogleCalendar(appointment.appointment_date, appointment.start_time);
    const endDateTime = formatForGoogleCalendar(
      appointment.appointment_date,
      this.getEndTime(appointment.start_time, appointment.duration_minutes),
    );

    const eventData: any = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: this.TIMEZONE,
      },
      end: {
        dateTime: endDateTime,
        timeZone: this.TIMEZONE,
      },
    };

    // Add location if patient has Google Maps link
    if (patient.google_maps_link) {
      eventData.location = patient.google_maps_link;
    }

    // Add attendees (staff members with email addresses)
    if (assignedStaff && assignedStaff.length > 0) {
      const attendees = assignedStaff
        .filter(staffMember => staffMember.email)
        .map(staffMember => ({ email: staffMember.email }));

      if (attendees.length > 0) {
        eventData.attendees = attendees;
      }
    }

    return eventData;
  }

  /**
   * Create driver-specific event description
   */
  static createDriverEventDescription(
    appointment: Appointment,
    patient: Patient,
    driver: Staff,
  ): string {
    return new DriverEventDescriptionBuilder(appointment, patient, driver).build();
  }

  /**
   * Create medical staff event description
   */
  static createMedicalStaffEventDescription(
    appointment: Appointment,
    patient: Patient,
    medicalStaff: Staff,
  ): string {
    return new MedicalStaffEventDescriptionBuilder(appointment, patient, medicalStaff).build();
  }
}

/**
 * Driver Event Description Builder
 * Creates specialized event descriptions for driver assignments
 */
class DriverEventDescriptionBuilder {
  private appointment: Appointment;
  private patient: Patient;
  private driver: Staff;
  private lines: string[] = [];

  constructor(appointment: Appointment, patient: Patient, driver: Staff) {
    this.appointment = appointment;
    this.patient = patient;
    this.driver = driver;
  }

  build(): string {
    this.addDriverHeader();
    this.addPickupDetails();
    this.addAppointmentDetails();
    this.addPatientInstructions();
    this.addTransportationNotes();
    this.addGeneralNotes();

    return this.lines.join('\n');
  }

  private addDriverHeader(): void {
    this.lines.push('🚗 **Driver Assignment**');
    this.lines.push(`Driver: ${getStaffFullName(this.driver)}`);
    this.lines.push(`Phone: ${this.driver.phone}`);
    this.lines.push(`Vehicle: ${this.driver.specialization || 'Company Vehicle'}`);
    this.lines.push('');
  }

  private addPickupDetails(): void {
    this.lines.push('📍 **Pickup Details**');
    this.lines.push(`Patient: ${this.patient.name}`);
    this.lines.push(`Phone: ${this.patient.phone}`);
    this.lines.push(`Pickup Address: ${getPatientFullAddress(this.patient)}`);

    if (this.patient.google_maps_link) {
      this.lines.push(`Maps Link: ${this.patient.google_maps_link}`);
    }

    this.lines.push(`Pickup Time: ${this.appointment.start_time}`);
    this.lines.push('');
  }

  private addAppointmentDetails(): void {
    this.lines.push('🏥 **Appointment Details**');
    this.lines.push(`Appointment Time: ${this.appointment.start_time} - ${CalendarEventFormatter['getEndTime'](this.appointment.start_time, this.appointment.duration_minutes)}`);
    this.lines.push(`Appointment Type: ${getAppointmentTypeDisplayName(this.appointment.appointment_type)}`);
    this.lines.push(`Duration: ${this.appointment.duration_minutes} minutes`);
    this.lines.push(`Date: ${CalendarEventFormatter['formatDate'](this.appointment.appointment_date)}`);
    this.lines.push('');
  }

  private addPatientInstructions(): void {
    this.lines.push('📋 **Patient Instructions**');

    if (this.patient.medical_notes) {
      this.lines.push(`Medical Notes: ${this.patient.medical_notes}`);
    }

    if (this.patient.emergency_contact) {
      this.lines.push(`Emergency Contact: ${this.patient.emergency_contact}`);
    }

    // Add appointment-specific instructions
    const instructions = this.getAppointmentSpecificInstructions();
    if (instructions) {
      this.lines.push(instructions);
    }

    this.lines.push('');
  }

  private addTransportationNotes(): void {
    if (this.appointment.transportation_type === 'driver') {
      this.lines.push('🚐 **Transportation Notes**');
      this.lines.push('• Ensure patient is comfortable during transport');
      this.lines.push('• Assist with entering/exiting vehicle if needed');
      this.lines.push('• Wait for appointment completion if required');
      this.lines.push('• Return patient to pickup location after appointment');
      this.lines.push('');
    }
  }

  private addGeneralNotes(): void {
    if (this.appointment.notes) {
      this.lines.push('📝 **Additional Notes**');
      this.lines.push(this.appointment.notes);
      this.lines.push('');
    }
  }

  private getAppointmentSpecificInstructions(): string | null {
    const customFields = this.appointment.custom_fields;
    if (!customFields) return null;

    switch (this.appointment.appointment_type) {
      case 'lab_test':
        if (customFields.fasting_required) {
          return '⚠️ Patient may need to fast for lab tests - confirm with patient';
        }
        break;
      case 'doctor_on_call':
        if (customFields.chief_complaint) {
          return `Chief Complaint: ${customFields.chief_complaint}`;
        }
        break;
      case 'physiotherapy':
        if (customFields.condition_injury) {
          return `Condition: ${customFields.condition_injury} - may need assistance with mobility`;
        }
        break;
    }

    return null;
  }
}

/**
 * Medical Staff Event Description Builder
 * Creates specialized event descriptions for medical staff appointments
 */
class MedicalStaffEventDescriptionBuilder {
  private appointment: Appointment;
  private patient: Patient;
  private medicalStaff: Staff;
  private lines: string[] = [];

  constructor(appointment: Appointment, patient: Patient, medicalStaff: Staff) {
    this.appointment = appointment;
    this.patient = patient;
    this.medicalStaff = medicalStaff;
  }

  build(): string {
    this.addMedicalHeader();
    this.addPatientInformation();
    this.addAppointmentDetails();
    this.addMedicalContext();
    this.addCustomFields();
    this.addPreparationNotes();
    this.addGeneralNotes();

    return this.lines.join('\n');
  }

  private addMedicalHeader(): void {
    this.lines.push('👨‍⚕️ **Medical Appointment**');
    this.lines.push(`Staff: ${getStaffFullName(this.medicalStaff)}`);
    this.lines.push(`Role: ${this.getStaffTypeDisplayName(this.medicalStaff.staff_type)}`);
    this.lines.push(`Phone: ${this.medicalStaff.phone}`);

    if (this.medicalStaff.specialization) {
      this.lines.push(`Specialization: ${this.medicalStaff.specialization}`);
    }

    this.lines.push('');
  }

  private addPatientInformation(): void {
    this.lines.push('👤 **Patient Information**');
    this.lines.push(`Name: ${this.patient.name}`);
    this.lines.push(`Phone: ${this.patient.phone}`);
    this.lines.push(`Address: ${getPatientFullAddress(this.patient)}`);

    if (this.patient.emergency_contact) {
      this.lines.push(`Emergency Contact: ${this.patient.emergency_contact}`);
    }

    this.lines.push('');
  }

  private addAppointmentDetails(): void {
    this.lines.push('📅 **Appointment Details**');
    this.lines.push(`Type: ${getAppointmentTypeDisplayName(this.appointment.appointment_type)}`);
    this.lines.push(`Date: ${CalendarEventFormatter['formatDate'](this.appointment.appointment_date)}`);
    this.lines.push(`Time: ${this.appointment.start_time} - ${CalendarEventFormatter['getEndTime'](this.appointment.start_time, this.appointment.duration_minutes)}`);
    this.lines.push(`Duration: ${this.appointment.duration_minutes} minutes`);
    this.lines.push(`Status: ${this.appointment.status}`);
    this.lines.push('');
  }

  private addMedicalContext(): void {
    if (this.patient.medical_notes) {
      this.lines.push('🏥 **Medical Context**');
      this.lines.push(`Medical Notes: ${this.patient.medical_notes}`);
      this.lines.push('');
    }
  }

  private addCustomFields(): void {
    const customFieldsDescription = CalendarEventFormatter['formatCustomFields'](this.appointment);
    if (customFieldsDescription) {
      this.lines.push('📋 **Appointment Specifics**');
      this.lines.push(customFieldsDescription);
      this.lines.push('');
    }
  }

  private addPreparationNotes(): void {
    const preparationNotes = this.getPreparationNotes();
    if (preparationNotes) {
      this.lines.push('🔧 **Preparation Required**');
      this.lines.push(preparationNotes);
      this.lines.push('');
    }
  }

  private addGeneralNotes(): void {
    if (this.appointment.notes) {
      this.lines.push('📝 **Notes**');
      this.lines.push(this.appointment.notes);
      this.lines.push('');
    }
  }

  private getStaffTypeDisplayName(staffType: StaffType): string {
    const displayNames: Record<StaffType, string> = {
      doctor: 'Doctor',
      nurse: 'Nurse',
      physiotherapist: 'Physiotherapist',
      caregiver: 'Caregiver',
      driver: 'Driver',
      lab_technician: 'Lab Technician',
    };
    return displayNames[staffType];
  }

  private getPreparationNotes(): string | null {
    const customFields = this.appointment.custom_fields;
    if (!customFields) return null;

    switch (this.appointment.appointment_type) {
      case 'lab_test':
        const notes: string[] = [];
        if (customFields.fasting_required) {
          notes.push('• Confirm fasting status with patient');
        }
        if (customFields.sample_types) {
          const sampleTypes = Array.isArray(customFields.sample_types)
            ? customFields.sample_types.join(', ')
            : customFields.sample_types;
          notes.push(`• Prepare for sample collection: ${sampleTypes}`);
        }
        return notes.join('\n');

      case 'teleconsultation':
        if (customFields.platform) {
          return `• Set up ${customFields.platform} meeting room`;
        }
        break;

      case 'physiotherapy':
        if (customFields.condition_injury) {
          return `• Review patient condition: ${customFields.condition_injury}`;
        }
        break;

      case 'iv_therapy':
        if (customFields.iv_type) {
          return `• Prepare IV equipment for: ${customFields.iv_type}`;
        }
        break;
    }

    return null;
  }
}

export default CalendarEventFormatter;
