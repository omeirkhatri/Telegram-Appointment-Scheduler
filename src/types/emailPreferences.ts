// Global email preferences for the system
export interface GlobalEmailPreferences {
  // General email settings
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  appointmentRemindersEnabled: boolean;
  
  // Email timing settings
  reminderTimeBeforeAppointment: number; // minutes before appointment
  dailyAgendaTime: string; // HH:mm format (default: 06:00)
  timezone: string; // default: Asia/Dubai
  
  // Email content settings
  includeAppointmentDetails: boolean;
  includePatientContactInfo: boolean;
  includeGoogleMapsLink: boolean;
  includeStaffContactInfo: boolean;
  
  // Notification types
  newAppointmentNotifications: boolean;
  appointmentCancellationNotifications: boolean;
  appointmentRescheduleNotifications: boolean;
  dailyAgendaNotifications: boolean;
  weeklySummaryNotifications: boolean;
  
  // Email delivery settings
  retryFailedEmails: boolean;
  maxRetryAttempts: number;
  retryDelayMinutes: number;
  
  // SMTP settings (for admin configuration)
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  fromEmail?: string;
  fromName?: string;
}

// Default email preferences
export const DEFAULT_EMAIL_PREFERENCES: GlobalEmailPreferences = {
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  appointmentRemindersEnabled: true,
  reminderTimeBeforeAppointment: 30, // 30 minutes before
  dailyAgendaTime: '06:00',
  timezone: 'Asia/Dubai',
  includeAppointmentDetails: true,
  includePatientContactInfo: true,
  includeGoogleMapsLink: true,
  includeStaffContactInfo: true,
  newAppointmentNotifications: true,
  appointmentCancellationNotifications: true,
  appointmentRescheduleNotifications: true,
  dailyAgendaNotifications: true,
  weeklySummaryNotifications: false,
  retryFailedEmails: true,
  maxRetryAttempts: 3,
  retryDelayMinutes: 5,
  fromEmail: 'noreply@medicare-scheduler.com',
  fromName: 'MediCare Scheduler',
};

// Email preference categories for UI organization
export interface EmailPreferenceCategory {
  id: string;
  title: string;
  description: string;
  fields: EmailPreferenceField[];
}

export interface EmailPreferenceField {
  id: keyof GlobalEmailPreferences;
  type: 'boolean' | 'number' | 'string' | 'select' | 'time';
  label: string;
  description?: string;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

export const EMAIL_PREFERENCE_CATEGORIES: EmailPreferenceCategory[] = [
  {
    id: 'general',
    title: 'General Settings',
    description: 'Basic email notification preferences',
    fields: [
      {
        id: 'emailNotificationsEnabled',
        type: 'boolean',
        label: 'Email Notifications',
        description: 'Enable or disable all email notifications',
      },
      {
        id: 'smsNotificationsEnabled',
        type: 'boolean',
        label: 'SMS Notifications',
        description: 'Enable or disable SMS notifications (requires SMS service)',
      },
      {
        id: 'appointmentRemindersEnabled',
        type: 'boolean',
        label: 'Appointment Reminders',
        description: 'Send automatic appointment reminders',
      },
    ],
  },
  {
    id: 'timing',
    title: 'Timing Settings',
    description: 'Configure when notifications are sent',
    fields: [
      {
        id: 'reminderTimeBeforeAppointment',
        type: 'number',
        label: 'Reminder Time (minutes)',
        description: 'How many minutes before appointment to send reminder',
        min: 5,
        max: 1440, // 24 hours
        step: 5,
      },
      {
        id: 'dailyAgendaTime',
        type: 'time',
        label: 'Daily Agenda Time',
        description: 'Time to send daily agenda emails',
      },
      {
        id: 'timezone',
        type: 'select',
        label: 'Timezone',
        description: 'Timezone for email scheduling',
        options: [
          { value: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)' },
          { value: 'UTC', label: 'UTC (GMT+0)' },
          { value: 'America/New_York', label: 'America/New_York (GMT-5)' },
          { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
        ],
      },
    ],
  },
  {
    id: 'content',
    title: 'Email Content',
    description: 'Configure what information to include in emails',
    fields: [
      {
        id: 'includeAppointmentDetails',
        type: 'boolean',
        label: 'Appointment Details',
        description: 'Include appointment type, duration, and notes',
      },
      {
        id: 'includePatientContactInfo',
        type: 'boolean',
        label: 'Patient Contact Info',
        description: 'Include patient phone number and address',
      },
      {
        id: 'includeGoogleMapsLink',
        type: 'boolean',
        label: 'Google Maps Link',
        description: 'Include Google Maps link to patient location',
      },
      {
        id: 'includeStaffContactInfo',
        type: 'boolean',
        label: 'Staff Contact Info',
        description: 'Include staff member contact information',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notification Types',
    description: 'Choose which events trigger notifications',
    fields: [
      {
        id: 'newAppointmentNotifications',
        type: 'boolean',
        label: 'New Appointments',
        description: 'Notify when new appointments are created',
      },
      {
        id: 'appointmentCancellationNotifications',
        type: 'boolean',
        label: 'Appointment Cancellations',
        description: 'Notify when appointments are cancelled',
      },
      {
        id: 'appointmentRescheduleNotifications',
        type: 'boolean',
        label: 'Appointment Reschedules',
        description: 'Notify when appointments are rescheduled',
      },
      {
        id: 'dailyAgendaNotifications',
        type: 'boolean',
        label: 'Daily Agendas',
        description: 'Send daily agenda emails to staff',
      },
      {
        id: 'weeklySummaryNotifications',
        type: 'boolean',
        label: 'Weekly Summaries',
        description: 'Send weekly summary emails',
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery Settings',
    description: 'Configure email delivery and retry behavior',
    fields: [
      {
        id: 'retryFailedEmails',
        type: 'boolean',
        label: 'Retry Failed Emails',
        description: 'Automatically retry failed email deliveries',
      },
      {
        id: 'maxRetryAttempts',
        type: 'number',
        label: 'Max Retry Attempts',
        description: 'Maximum number of retry attempts for failed emails',
        min: 1,
        max: 10,
        step: 1,
      },
      {
        id: 'retryDelayMinutes',
        type: 'number',
        label: 'Retry Delay (minutes)',
        description: 'Minutes to wait between retry attempts',
        min: 1,
        max: 60,
        step: 1,
      },
    ],
  },
  {
    id: 'smtp',
    title: 'SMTP Configuration',
    description: 'Configure email server settings (admin only)',
    fields: [
      {
        id: 'smtpHost',
        type: 'string',
        label: 'SMTP Host',
        description: 'SMTP server hostname',
        required: true,
      },
      {
        id: 'smtpPort',
        type: 'number',
        label: 'SMTP Port',
        description: 'SMTP server port (usually 587 or 465)',
        min: 1,
        max: 65535,
        required: true,
      },
      {
        id: 'smtpSecure',
        type: 'boolean',
        label: 'Use SSL/TLS',
        description: 'Use secure connection (SSL/TLS)',
      },
      {
        id: 'smtpUsername',
        type: 'string',
        label: 'SMTP Username',
        description: 'Username for SMTP authentication',
      },
      {
        id: 'fromEmail',
        type: 'string',
        label: 'From Email',
        description: 'Email address to send from',
        required: true,
      },
      {
        id: 'fromName',
        type: 'string',
        label: 'From Name',
        description: 'Display name for sent emails',
      },
    ],
  },
];

// Validation schema for email preferences
export interface EmailPreferencesValidation {
  isValid: boolean;
  errors: Record<string, string[]>;
}

// Helper function to validate email preferences
export function validateEmailPreferences(preferences: Partial<GlobalEmailPreferences>): EmailPreferencesValidation {
  const errors: Record<string, string[]> = {};

  // Validate required fields
  if (preferences.reminderTimeBeforeAppointment !== undefined) {
    if (preferences.reminderTimeBeforeAppointment < 5 || preferences.reminderTimeBeforeAppointment > 1440) {
      errors.reminderTimeBeforeAppointment = ['Reminder time must be between 5 and 1440 minutes'];
    }
  }

  if (preferences.maxRetryAttempts !== undefined) {
    if (preferences.maxRetryAttempts < 1 || preferences.maxRetryAttempts > 10) {
      errors.maxRetryAttempts = ['Max retry attempts must be between 1 and 10'];
    }
  }

  if (preferences.retryDelayMinutes !== undefined) {
    if (preferences.retryDelayMinutes < 1 || preferences.retryDelayMinutes > 60) {
      errors.retryDelayMinutes = ['Retry delay must be between 1 and 60 minutes'];
    }
  }

  if (preferences.smtpPort !== undefined) {
    if (preferences.smtpPort < 1 || preferences.smtpPort > 65535) {
      errors.smtpPort = ['SMTP port must be between 1 and 65535'];
    }
  }

  if (preferences.fromEmail !== undefined && preferences.fromEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(preferences.fromEmail)) {
      errors.fromEmail = ['Invalid email address format'];
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
