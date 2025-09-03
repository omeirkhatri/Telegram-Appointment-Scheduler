import type { Appointment, Patient, Staff } from './index';

// Email template data types
export interface EmailTemplateData {
  subject: string;
  content: string;
  date: string;
  staffName?: string;
  staffEmail?: string;
}

// Agenda email specific data
export interface AgendaEmailData extends EmailTemplateData {
  appointments: AgendaAppointment[];
  totalAppointments: number;
  multipleAppointments: boolean;
}

// Individual appointment data for agenda emails
export interface AgendaAppointment {
  id: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  appointmentType: string;
  appointmentTypeDisplay: string;
  patientName: string;
  patientPhone: string;
  patientAddress: string;
  staffName?: string;
  driverName?: string;
  transportationMethod?: string;
  transportationInfo?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

// Email sending configuration
export interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

// Email sending result
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email template engine interface
export interface EmailTemplateEngine {
  renderAgendaTemplate(data: AgendaEmailData): string;
  renderBaseTemplate(data: EmailTemplateData): string;
}

// Staff agenda data for email generation
export interface StaffAgendaData {
  staff: Staff;
  appointments: AppointmentWithDetails[];
  date: string;
}

// Appointment with resolved patient and staff details
export interface AppointmentWithDetails extends Appointment {
  patient?: Patient;
  assignedStaff?: Staff[];
  driver?: Staff;
}

// Email preferences for staff
export interface StaffEmailPreferences {
  staffId: string;
  emailNotificationsEnabled: boolean;
  dailyAgendaEnabled: boolean;
  agendaTime: string; // HH:mm format (default: 06:00)
  timezone: string;   // default: Asia/Dubai
}

// Email delivery status
export interface EmailDeliveryStatus {
  emailId: string;
  staffId: string;
  date: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  retryCount: number;
}

// Comprehensive email delivery logging types
export interface EmailDeliveryLog {
  id: string;
  emailId: string;
  staffId?: string;
  jobExecutionId?: string;
  emailType: string;
  recipientEmail: string;
  subject: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  errorMessage?: string;
  errorCode?: string;
  smtpResponse?: string;
  deliveryAttempts: EmailDeliveryAttempt[];
  metadata: Record<string, any>;
  updatedAt: Date;
}

export interface EmailDeliveryAttempt {
  id: string;
  deliveryLogId: string;
  attemptNumber: number;
  attemptedAt: Date;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
  errorCode?: string;
  smtpResponse?: string;
  responseTimeMs?: number;
  retryAfterMs?: number;
  metadata: Record<string, any>;
}

export interface EmailDeliveryStatistics {
  id: string;
  date: string;
  emailType: string;
  totalEmails: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  successRate: number;
  averageDeliveryTimeMs: number;
  totalRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailDeliveryFilters {
  status?: string[];
  emailType?: string[];
  priority?: string[];
  staffId?: string;
  dateFrom?: string;
  dateTo?: string;
  hasErrors?: boolean;
  needsRetry?: boolean;
}

export interface EmailDeliveryRetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

export interface EmailDeliveryService {
  // Delivery logging
  logDeliveryAttempt(log: Omit<EmailDeliveryLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailDeliveryLog>;
  updateDeliveryStatus(logId: string, status: EmailDeliveryLog['status'], error?: string): Promise<EmailDeliveryLog>;
  addDeliveryAttempt(logId: string, attempt: Omit<EmailDeliveryAttempt, 'id' | 'deliveryLogId'>): Promise<EmailDeliveryAttempt>;

  // Retry management
  getFailedDeliveriesForRetry(): Promise<EmailDeliveryLog[]>;
  retryFailedDelivery(logId: string): Promise<EmailDeliveryLog>;
  retryAllFailedDeliveries(): Promise<{ success: number; failed: number }>;

  // Statistics and monitoring
  getDeliveryStatistics(filters?: EmailDeliveryFilters): Promise<EmailDeliveryStatistics[]>;
  getDeliveryLogs(filters?: EmailDeliveryFilters, limit?: number): Promise<EmailDeliveryLog[]>;
  getDeliveryLogById(logId: string): Promise<EmailDeliveryLog | null>;

  // Cleanup
  cleanupOldLogs(daysToKeep?: number): Promise<number>;
}

// Email template variables
export interface TemplateVariables {
  [key: string]: string | number | boolean | object | undefined;
}

// Email template rendering options
export interface TemplateRenderOptions {
  dateFormat?: string; // default: DD/MM/YYYY
  timeFormat?: string; // default: HH:mm
  timezone?: string;   // default: Asia/Dubai
  includeNotes?: boolean;
  includeCustomFields?: boolean;
  includeTransportation?: boolean;
}

// Email service interface
export interface EmailService {
  sendEmail(config: EmailConfig): Promise<EmailResult>;
  sendDailyAgenda(staffId: string, date: string): Promise<EmailResult>;
  sendTestEmail(to: string, template: string): Promise<EmailResult>;
  validateEmailConfig(): boolean;
}

// Email template validation
export interface EmailTemplateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Email client compatibility
export type EmailClient =
  | 'gmail'
  | 'outlook'
  | 'apple-mail'
  | 'yahoo'
  | 'thunderbird'
  | 'other';

// Email rendering context
export interface EmailRenderingContext {
  client: EmailClient;
  isDarkMode: boolean;
  isMobile: boolean;
  locale: string;
}

// Utility functions for email types
export function createAgendaAppointment(
  appointment: Appointment,
  patient?: Patient,
  staff?: Staff[],
  driver?: Staff,
): AgendaAppointment {
  const startTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const endTime = new Date(
    new Date(`${appointment.appointment_date}T${appointment.start_time}`).getTime() +
    appointment.duration_minutes * 60000,
  ).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const appointmentTypeDisplay = appointment.appointment_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  const patientName = patient ? patient.name : 'Unknown Patient';
  const patientPhone = patient ? patient.phone : 'N/A';
  const patientAddress = patient ?
    `${patient.flat_villa_no}, ${patient.building_street}, ${patient.area}, ${patient.city}` :
    'N/A';

  const staffName = staff && staff.length > 0 ?
    staff.map(s => `${s.first_name} ${s.last_name}`).join(', ') :
    undefined;

  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : undefined;

  let transportationInfo: string | undefined;
  if (appointment.transportation_type === 'driver' && driverName) {
    transportationInfo = `Driver: ${driverName}`;
  } else if (appointment.transportation_type === 'self_transport' && appointment.transportation_method) {
    transportationInfo = `Self-transport: ${appointment.transportation_method}`;
  }

  return {
    id: appointment.id,
    startTime,
    endTime,
    appointmentType: appointment.appointment_type,
    appointmentTypeDisplay,
    patientName,
    patientPhone,
    patientAddress,
    staffName,
    driverName,
    transportationMethod: appointment.transportation_method,
    transportationInfo,
    notes: appointment.notes,
    customFields: appointment.custom_fields,
  };
}

export function createAgendaEmailData(
  staff: Staff,
  appointments: AgendaAppointment[],
  date: string,
): AgendaEmailData {
  return {
    subject: `Your Schedule for ${date}`,
    content: '', // Will be filled by template engine
    date,
    staffName: `${staff.first_name} ${staff.last_name}`,
    staffEmail: staff.email,
    appointments,
    totalAppointments: appointments.length,
    multipleAppointments: appointments.length !== 1,
  };
}
