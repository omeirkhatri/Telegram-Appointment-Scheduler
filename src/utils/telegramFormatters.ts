import type { Appointment, Patient, Staff } from '@/types';

export type StaffType = 'doctor' | 'nurse' | 'physiotherapist' | 'caregiver' | 'driver' | 'lab_technician';
export type NotificationType = 'same_day_created' | 'rescheduled' | 'one_hour_reminder' | 'cancelled';
export type ChangeType = 'created' | 'updated' | 'cancelled';

export interface AppointmentWithDetails extends Appointment {
  patient?: Patient;
  staff_assignments?: Array<{
    staff_id: string;
    role: 'primary' | 'assistant' | 'driver';
    is_primary: boolean;
    staff?: Staff;
  }>;
}

export interface MessageFormatterOptions {
  appointment: AppointmentWithDetails;
  staff: Staff;
  changeType: ChangeType;
  patient: Patient;
  notificationType?: NotificationType;
}

/**
 * Staff-specific message formatter for Telegram notifications
 * Implements the PRD requirements for different staff types and notification types
 */
export class TelegramMessageFormatter {
  private readonly timezone = 'Asia/Dubai';
  private readonly dateFormat = 'dd/MM/yyyy';
  private readonly timeFormat = 'HH:mm';

  /**
   * Format message based on staff type and notification type
   */
  formatMessage(options: MessageFormatterOptions): string {
    const { appointment, staff, changeType, patient, notificationType } = options;

    switch (staff.staff_type) {
      case 'doctor':
        return this.formatDoctorMessage(options);
      case 'nurse':
        return this.formatNurseMessage(options);
      case 'caregiver':
        return this.formatCaregiverMessage(options);
      case 'driver':
        return this.formatDriverMessage(options);
      case 'physiotherapist':
        return this.formatPhysiotherapistMessage(options);
      case 'lab_technician':
        return this.formatLabTechnicianMessage(options);
      default:
        return this.formatGenericMessage(options);
    }
  }

  /**
   * Format message for doctors
   * Includes patient history, full notes, and comprehensive details
   */
  private formatDoctorMessage(options: MessageFormatterOptions): string {
    const { appointment, staff, changeType, patient, notificationType } = options;

    const emoji = this.getNotificationEmoji(changeType, notificationType);
    const action = this.getNotificationAction(changeType, notificationType);

    let message = `${emoji} <b>${action}</b>\n\n`;

    // Add same-day warning for created appointments
    if (changeType === 'created' && this.isSameDay(appointment.appointment_date)) {
      message += `🚨 <b>SAME-DAY APPOINTMENT</b>\n\n`;
    }

    // Basic appointment info
    message += this.formatBasicAppointmentInfo(appointment, patient);

    // Staff assignment info
    message += this.formatStaffAssignmentInfo(appointment, staff);

    // Notes section - doctors get both mini and full notes
    message += this.formatNotesForDoctor(appointment);

    // Transportation details
    message += this.formatTransportationDetails(appointment);

    // Google Maps link
    if (patient.google_maps_link) {
      message += `\n🗺️ <a href="${patient.google_maps_link}">Open in Google Maps</a>`;
    }

    return message;
  }

  /**
   * Format message for nurses
   * Includes lab/IV details and preparation requirements
   */
  private formatNurseMessage(options: MessageFormatterOptions): string {
    const { appointment, staff, changeType, patient, notificationType } = options;

    const emoji = this.getNotificationEmoji(changeType, notificationType);
    const action = this.getNotificationAction(changeType, notificationType);

    let message = `${emoji} <b>${action}</b>\n\n`;

    if (changeType === 'created' && this.isSameDay(appointment.appointment_date)) {
      message += `🚨 <b>SAME-DAY APPOINTMENT</b>\n\n`;
    }

    message += this.formatBasicAppointmentInfo(appointment, patient);
    message += this.formatStaffAssignmentInfo(appointment, staff);
    message += this.formatNotesForNurse(appointment);
    message += this.formatTransportationDetails(appointment);

    if (patient.google_maps_link) {
      message += `\n🗺️ <a href="${patient.google_maps_link}">Open in Google Maps</a>`;
    }

    return message;
  }

  /**
   * Format message for caregivers
   * Includes duration, backup caregiver, and Google Maps link
   */
  private formatCaregiverMessage(options: MessageFormatterOptions): string {
    const { appointment, staff, changeType, patient, notificationType } = options;

    const emoji = this.getNotificationEmoji(changeType, notificationType);
    const action = this.getNotificationAction(changeType, notificationType);

    let message = `${emoji} <b>${action}</b>\n\n`;

    if (changeType === 'created' && this.isSameDay(appointment.appointment_date)) {
      message += `🚨 <b>SAME-DAY APPOINTMENT</b>\n\n`;
    }

    message += this.formatBasicAppointmentInfo(appointment, patient);
    message += this.formatStaffAssignmentInfo(appointment, staff);
    message += this.formatNotesForCaregiver(appointment);
    message += this.formatTransportationDetails(appointment);

    if (patient.google_maps_link) {
      message += `\n🗺️ <a href="${patient.google_maps_link}">Open in Google Maps</a>`;
    }

    return message;
  }

  /**
   * Format message for drivers
   * Focuses on pickup instructions and location details
   */
  private formatDriverMessage(options: MessageFormatterOptions): string {
    const { appointment, staff, changeType, patient, notificationType } = options;

    // Handle 1-hour reminder specifically for drivers
    if (notificationType === 'one_hour_reminder') {
      return this.formatDriverOneHourReminder(options);
    }

    const emoji = changeType === 'created' ? '🚗' : changeType === 'updated' ? '✏️' : '❌';
    const action = changeType === 'created' ? 'Pickup Assignment' :
                   changeType === 'updated' ? 'Pickup Updated' : 'Pickup Cancelled';

    let message = `${emoji} <b>${action}</b>\n\n`;

    if (changeType === 'created' && this.isSameDay(appointment.appointment_date)) {
      message += `🚨 <b>SAME-DAY PICKUP</b>\n\n`;
    }

    // Driver-specific info
    message += `👤 <b>Patient:</b> ${patient.name}\n`;
    message += `📍 <b>Address:</b> ${patient.address || 'TBD'}\n`;
    message += `⏰ <b>Time:</b> ${appointment.start_time} - ${this.getAppointmentEndTime(appointment.start_time, appointment.duration_minutes)}\n`;
    message += `📅 <b>Date:</b> ${this.formatDate(appointment.appointment_date)}\n`;
    message += `👨‍⚕️ <b>Driver:</b> ${staff.first_name} ${staff.last_name}\n`;

    // Medical staff info
    const medicalStaff = this.getMedicalStaff(appointment);
    if (medicalStaff.length > 0) {
      message += `👨‍⚕️ <b>Medical Staff:</b> ${medicalStaff.join(', ')}\n`;
    }

    // Pickup instructions (most important for drivers)
    if (appointment.pickup_instructions) {
      message += `\n📋 <b>Pickup Instructions:</b>\n${appointment.pickup_instructions}\n`;
    }

    // Brief notes
    if (appointment.mini_notes) {
      message += `\n📝 <b>Brief:</b> ${appointment.mini_notes}`;
    }

    if (patient.google_maps_link) {
      message += `\n\n🗺️ <a href="${patient.google_maps_link}">Open in Google Maps</a>`;
    }

    return message;
  }

  /**
   * Format 1-hour reminder message for drivers
   * Specialized format focusing on pickup details
   */
  private formatDriverOneHourReminder(options: MessageFormatterOptions): string {
    const { appointment, staff, patient } = options;

    let message = `⏰ <b>Pickup Reminder - 1 Hour</b>\n\n`;

    // Driver-specific info
    message += `👤 <b>Patient:</b> ${patient.name}\n`;
    message += `📍 <b>Address:</b> ${patient.address || 'TBD'}\n`;
    message += `⏰ <b>Time:</b> ${appointment.start_time} - ${this.getAppointmentEndTime(appointment.start_time, appointment.duration_minutes)}\n`;

    // Medical staff info
    const medicalStaff = this.getMedicalStaff(appointment);
    if (medicalStaff.length > 0) {
      message += `👨‍⚕️ <b>Medical Staff:</b> ${medicalStaff.join(', ')}\n`;
    }

    // Brief notes
    if (appointment.mini_notes) {
      message += `\n📝 <b>Brief:</b> ${appointment.mini_notes}`;
    }

    // Pickup instructions (most important for drivers)
    if (appointment.pickup_instructions) {
      message += `\n\n📋 <b>Pickup Instructions:</b>\n${appointment.pickup_instructions}`;
    }

    // Google Maps link
    if (patient.google_maps_link) {
      message += `\n\n🗺️ <a href="${patient.google_maps_link}">Open in Google Maps</a>`;
    }

    return message;
  }

  /**
   * Format message for physiotherapists
   * Includes condition/injury details and session type
   */
  private formatPhysiotherapistMessage(options: MessageFormatterOptions): string {
    const { appointment, staff, changeType, patient, notificationType } = options;

    const emoji = this.getNotificationEmoji(changeType, notificationType);
    const action = this.getNotificationAction(changeType, notificationType);

    let message = `${emoji} <b>${action}</b>\n\n`;

    if (changeType === 'created' && this.isSameDay(appointment.appointment_date)) {
      message += `🚨 <b>SAME-DAY APPOINTMENT</b>\n\n`;
    }

    message += this.formatBasicAppointmentInfo(appointment, patient);
    message += this.formatStaffAssignmentInfo(appointment, staff);
    message += this.formatNotesForPhysiotherapist(appointment);
    message += this.formatTransportationDetails(appointment);

    if (patient.google_maps_link) {
      message += `\n🗺️ <a href="${patient.google_maps_link}">Open in Google Maps</a>`;
    }

    return message;
  }

  /**
   * Format message for lab technicians
   * Includes test details and sample requirements
   */
  private formatLabTechnicianMessage(options: MessageFormatterOptions): string {
    const { appointment, staff, changeType, patient, notificationType } = options;

    const emoji = this.getNotificationEmoji(changeType, notificationType);
    const action = this.getNotificationAction(changeType, notificationType);

    let message = `${emoji} <b>${action}</b>\n\n`;

    if (changeType === 'created' && this.isSameDay(appointment.appointment_date)) {
      message += `🚨 <b>SAME-DAY APPOINTMENT</b>\n\n`;
    }

    message += this.formatBasicAppointmentInfo(appointment, patient);
    message += this.formatStaffAssignmentInfo(appointment, staff);
    message += this.formatNotesForLabTechnician(appointment);
    message += this.formatTransportationDetails(appointment);

    if (patient.google_maps_link) {
      message += `\n🗺️ <a href="${patient.google_maps_link}">Open in Google Maps</a>`;
    }

    return message;
  }

  /**
   * Generic message formatter for unknown staff types
   */
  private formatGenericMessage(options: MessageFormatterOptions): string {
    const { appointment, staff, changeType, patient, notificationType } = options;

    const emoji = this.getNotificationEmoji(changeType, notificationType);
    const action = this.getNotificationAction(changeType, notificationType);

    let message = `${emoji} <b>${action}</b>\n\n`;

    if (changeType === 'created' && this.isSameDay(appointment.appointment_date)) {
      message += `🚨 <b>SAME-DAY APPOINTMENT</b>\n\n`;
    }

    message += this.formatBasicAppointmentInfo(appointment, patient);
    message += this.formatStaffAssignmentInfo(appointment, staff);

    if (appointment.notes) {
      message += `\n📝 <b>Notes:</b> ${appointment.notes}`;
    }

    if (patient.google_maps_link) {
      message += `\n\n🗺️ <a href="${patient.google_maps_link}">Open in Google Maps</a>`;
    }

    return message;
  }

  // Helper methods

  private getNotificationEmoji(changeType: ChangeType, notificationType?: NotificationType): string {
    if (notificationType === 'one_hour_reminder') {
      return '⏰';
    }

    switch (changeType) {
      case 'created': return '🆕';
      case 'updated': return '✏️';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  }

  private getNotificationAction(changeType: ChangeType, notificationType?: NotificationType): string {
    if (notificationType === 'one_hour_reminder') {
      return 'Appointment Reminder - 1 Hour';
    }

    switch (changeType) {
      case 'created': return 'New Appointment Created';
      case 'updated': return 'Appointment Rescheduled';
      case 'cancelled': return 'Appointment Cancelled';
      default: return 'Appointment Notification';
    }
  }

  private formatBasicAppointmentInfo(appointment: AppointmentWithDetails, patient: Patient): string {
    const appointmentDate = this.formatDate(appointment.appointment_date);
    const startTime = appointment.start_time;
    const endTime = this.getAppointmentEndTime(startTime, appointment.duration_minutes);
    const appointmentType = this.formatAppointmentType(appointment.appointment_type);

    return `📅 <b>Date:</b> ${appointmentDate}\n` +
           `⏰ <b>Time:</b> ${startTime} - ${endTime}\n` +
           `🏥 <b>Type:</b> ${appointmentType}\n` +
           `👤 <b>Patient:</b> ${patient.name}\n` +
           `📞 <b>Phone:</b> ${patient.phone}\n` +
           `📍 <b>Address:</b> ${patient.address || 'TBD'}\n`;
  }

  private formatStaffAssignmentInfo(appointment: AppointmentWithDetails, currentStaff: Staff): string {
    const assignments = appointment.staff_assignments || [];
    const primaryStaff = assignments.find(a => a.is_primary && a.staff);
    const assistantStaff = assignments.filter(a => !a.is_primary && a.staff);

    let staffInfo = `👨‍⚕️ <b>Staff:</b> ${currentStaff.first_name} ${currentStaff.last_name} (${this.formatStaffRole(currentStaff.staff_type)})`;

    if (primaryStaff && primaryStaff.staff?.id !== currentStaff.id) {
      staffInfo += `\n👨‍⚕️ <b>Primary:</b> ${primaryStaff.staff.first_name} ${primaryStaff.staff.last_name}`;
    }

    if (assistantStaff.length > 0) {
      const assistantNames = assistantStaff.map(a => `${a.staff?.first_name} ${a.staff?.last_name}`).join(', ');
      staffInfo += `\n👨‍⚕️ <b>Assistant:</b> ${assistantNames}`;
    }

    return staffInfo + '\n';
  }

  private formatNotesForDoctor(appointment: AppointmentWithDetails): string {
    let notes = '';

    if (appointment.mini_notes) {
      notes += `\n📝 <b>Brief:</b> ${appointment.mini_notes}`;
    }

    if (appointment.full_notes) {
      notes += `\n\n📋 <b>Full Notes:</b>\n${appointment.full_notes}`;
    }

    if (appointment.notes && !appointment.mini_notes && !appointment.full_notes) {
      notes += `\n📝 <b>Notes:</b> ${appointment.notes}`;
    }

    return notes;
  }

  private formatNotesForNurse(appointment: AppointmentWithDetails): string {
    let notes = '';

    if (appointment.mini_notes) {
      notes += `\n📝 <b>Brief:</b> ${appointment.mini_notes}`;
    }

    if (appointment.full_notes) {
      notes += `\n\n📋 <b>Full Notes:</b>\n${appointment.full_notes}`;
    }

    // Add special equipment requirements for nurses
    if (appointment.appointment_type === 'iv_therapy' || appointment.appointment_type === 'lab_test') {
      notes += `\n🔬 <b>Equipment:</b> Check notes for special requirements`;
    }

    if (appointment.notes && !appointment.mini_notes && !appointment.full_notes) {
      notes += `\n📝 <b>Notes:</b> ${appointment.notes}`;
    }

    return notes;
  }

  private formatNotesForCaregiver(appointment: AppointmentWithDetails): string {
    let notes = '';

    if (appointment.mini_notes) {
      notes += `\n📝 <b>Brief:</b> ${appointment.mini_notes}`;
    }

    if (appointment.full_notes) {
      notes += `\n\n📋 <b>Full Notes:</b>\n${appointment.full_notes}`;
    }

    // Add duration info for caregivers
    const durationHours = Math.floor(appointment.duration_minutes / 60);
    const durationMinutes = appointment.duration_minutes % 60;
    const durationText = durationHours > 0 ? `${durationHours}h ${durationMinutes}m` : `${durationMinutes}m`;
    notes += `\n⏱️ <b>Duration:</b> ${durationText}`;

    if (appointment.notes && !appointment.mini_notes && !appointment.full_notes) {
      notes += `\n📝 <b>Notes:</b> ${appointment.notes}`;
    }

    return notes;
  }

  private formatNotesForPhysiotherapist(appointment: AppointmentWithDetails): string {
    let notes = '';

    if (appointment.mini_notes) {
      notes += `\n📝 <b>Brief:</b> ${appointment.mini_notes}`;
    }

    if (appointment.full_notes) {
      notes += `\n\n📋 <b>Full Notes:</b>\n${appointment.full_notes}`;
    }

    if (appointment.notes && !appointment.mini_notes && !appointment.full_notes) {
      notes += `\n📝 <b>Notes:</b> ${appointment.notes}`;
    }

    return notes;
  }

  private formatNotesForLabTechnician(appointment: AppointmentWithDetails): string {
    let notes = '';

    if (appointment.mini_notes) {
      notes += `\n📝 <b>Brief:</b> ${appointment.mini_notes}`;
    }

    if (appointment.full_notes) {
      notes += `\n\n📋 <b>Full Notes:</b>\n${appointment.full_notes}`;
    }

    // Add fasting requirements for lab tests
    if (appointment.appointment_type === 'lab_test') {
      notes += `\n🍽️ <b>Fasting:</b> Check notes for fasting requirements`;
    }

    if (appointment.notes && !appointment.mini_notes && !appointment.full_notes) {
      notes += `\n📝 <b>Notes:</b> ${appointment.notes}`;
    }

    return notes;
  }

  private formatTransportationDetails(appointment: AppointmentWithDetails): string {
    if (!appointment.transportation_type) {
      return '';
    }

    let transport = `\n🚗 <b>Transportation:</b> `;

    if (appointment.transportation_type === 'driver') {
      const driverAssignment = appointment.staff_assignments?.find(a => a.role === 'driver' && a.staff);
      if (driverAssignment?.staff) {
        transport += `Driver ${driverAssignment.staff.first_name} ${driverAssignment.staff.last_name}`;
      } else {
        transport += 'Driver assigned';
      }
    } else if (appointment.transportation_type === 'self_transport') {
      transport += `Self transport (${appointment.transportation_method || 'TBD'})`;
    }

    return transport;
  }

  private getMedicalStaff(appointment: AppointmentWithDetails): string[] {
    const assignments = appointment.staff_assignments || [];
    return assignments
      .filter(a => a.staff && a.staff.staff_type !== 'driver')
      .map(a => `${a.staff?.first_name} ${a.staff?.last_name}`)
      .filter(Boolean);
  }

  private isSameDay(dateString: string): boolean {
    const appointmentDate = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointmentDate.toDateString() === today.toDateString();
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      timeZone: this.timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private getAppointmentEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end.toTimeString().slice(0, 5); // HH:MM format
  }

  private formatAppointmentType(type: string): string {
    const typeMap: Record<string, string> = {
      'doctor_on_call': 'Doctor on Call',
      'lab_test': 'Lab Test',
      'teleconsultation': 'Teleconsultation',
      'physiotherapy': 'Physiotherapy',
      'caregiver': 'Caregiver',
      'iv_therapy': 'IV Therapy',
    };
    return typeMap[type] || type;
  }

  private formatStaffRole(role: string): string {
    const roleMap: Record<string, string> = {
      'doctor': 'Doctor',
      'nurse': 'Nurse',
      'physiotherapist': 'Physiotherapist',
      'caregiver': 'Caregiver',
      'driver': 'Driver',
      'lab_technician': 'Lab Technician',
    };
    return roleMap[role] || role;
  }
}

// Export singleton instance
export const telegramMessageFormatter = new TelegramMessageFormatter();
