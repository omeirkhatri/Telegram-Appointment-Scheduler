/**
 * Test data for E2E tests
 * Centralized test data to ensure consistency across tests
 */

export const testData = {
  patients: {
    valid: {
      name: 'Ahmed Al-Rashid',
      phone: '+971501234567',
      flatVillaNo: 'Villa 123',
      buildingStreet: 'Al Wasl Road',
      area: 'Jumeirah',
      city: 'Dubai',
      googleMapsLink: 'https://maps.google.com/?q=25.2048,55.2708',
      medicalNotes: 'Patient has diabetes and requires regular monitoring',
      emergencyContact: '+971509876543',
      preferredTransport: 'Driver',
    },
    minimal: {
      name: 'Sarah Johnson',
      phone: '+971502345678',
      flatVillaNo: 'Apt 456',
      buildingStreet: 'Sheikh Zayed Road',
      area: 'Downtown',
      city: 'Dubai',
    },
  },

  staff: {
    doctor: {
      firstName: 'Dr. Mohammed',
      lastName: 'Al-Ahmad',
      staffType: 'doctor',
      specialization: 'Internal Medicine',
      phone: '+971503456789',
      email: 'dr.mohammed@medicare.ae',
      googleCalendarId: 'dr.mohammed@medicare.ae',
      availableDays: [1, 2, 3, 4, 5], // Monday to Friday
      workingHoursStart: '08:00',
      workingHoursEnd: '17:00',
      status: 'active',
      emailNotificationsEnabled: true,
    },
    nurse: {
      firstName: 'Fatima',
      lastName: 'Al-Zahra',
      staffType: 'nurse',
      specialization: 'General Nursing',
      phone: '+971504567890',
      email: 'fatima@medicare.ae',
      googleCalendarId: 'fatima@medicare.ae',
      availableDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      workingHoursStart: '07:00',
      workingHoursEnd: '19:00',
      status: 'active',
      emailNotificationsEnabled: true,
    },
    driver: {
      firstName: 'Hassan',
      lastName: 'Al-Mansouri',
      staffType: 'driver',
      specialization: 'Transportation',
      phone: '+971505678901',
      email: 'hassan@medicare.ae',
      googleCalendarId: 'hassan@medicare.ae',
      availableDays: [1, 2, 3, 4, 5, 6, 7], // All days
      workingHoursStart: '06:00',
      workingHoursEnd: '22:00',
      status: 'active',
      emailNotificationsEnabled: false,
    },
  },

  appointments: {
    doctorOnCall: {
      appointmentType: 'Doctor on Call',
      appointmentDate: '2024-12-20',
      startTime: '10:00',
      durationMinutes: 60,
      status: 'scheduled',
      transportationType: 'driver',
      transportationMethod: 'Driver',
      notes: 'Regular checkup for diabetes management',
      customFields: {
        chiefComplaint: 'Diabetes monitoring and medication review',
        primaryDoctor: 'Dr. Mohammed Al-Ahmad',
        assistingNurse: 'Fatima Al-Zahra',
      },
    },
    labTest: {
      appointmentType: 'Lab Test',
      appointmentDate: '2024-12-21',
      startTime: '09:00',
      durationMinutes: 30,
      status: 'scheduled',
      transportationType: 'driver',
      transportationMethod: 'Driver',
      notes: 'Blood work for diabetes monitoring',
      customFields: {
        testList: 'HbA1c, Fasting Glucose, Lipid Profile',
        labName: 'AVM',
        sampleTypes: ['Blood'],
        nurse: 'Fatima Al-Zahra',
        fastingRequired: true,
      },
    },
    teleconsultation: {
      appointmentType: 'Teleconsultation',
      appointmentDate: '2024-12-22',
      startTime: '14:00',
      durationMinutes: 30,
      status: 'scheduled',
      transportationType: 'self_transport',
      transportationMethod: 'Video Call',
      notes: 'Follow-up consultation',
      customFields: {
        platform: 'Zoom',
        doctor: 'Dr. Mohammed Al-Ahmad',
        consultationType: 'Follow-up',
      },
    },
  },
};

export const selectors = {
  // Navigation
  navigation: {
    patients: '[data-testid="nav-patients"]',
    staff: '[data-testid="nav-staff"]',
    appointments: '[data-testid="nav-appointments"]',
    dashboard: '[data-testid="nav-dashboard"]',
  },

  // Patient form
  patientForm: {
    name: '[data-testid="patient-name"]',
    phone: '[data-testid="patient-phone"]',
    flatVillaNo: '[data-testid="patient-flat-villa-no"]',
    buildingStreet: '[data-testid="patient-building-street"]',
    area: '[data-testid="patient-area"]',
    city: '[data-testid="patient-city"]',
    googleMapsLink: '[data-testid="patient-google-maps-link"]',
    medicalNotes: '[data-testid="patient-medical-notes"]',
    emergencyContact: '[data-testid="patient-emergency-contact"]',
    preferredTransport: '[data-testid="patient-preferred-transport"]',
    submitButton: '[data-testid="patient-submit"]',
    cancelButton: '[data-testid="patient-cancel"]',
  },

  // Staff form
  staffForm: {
    firstName: '[data-testid="staff-first-name"]',
    lastName: '[data-testid="staff-last-name"]',
    staffType: '[data-testid="staff-type"]',
    specialization: '[data-testid="staff-specialization"]',
    phone: '[data-testid="staff-phone"]',
    email: '[data-testid="staff-email"]',
    googleCalendarId: '[data-testid="staff-google-calendar-id"]',
    submitButton: '[data-testid="staff-submit"]',
    cancelButton: '[data-testid="staff-cancel"]',
  },

  // Appointment form
  appointmentForm: {
    patientSelect: '[data-testid="appointment-patient-select"]',
    appointmentType: '[data-testid="appointment-type"]',
    appointmentDate: '[data-testid="appointment-date"]',
    startTime: '[data-testid="appointment-start-time"]',
    duration: '[data-testid="appointment-duration"]',
    transportationType: '[data-testid="appointment-transportation-type"]',
    notes: '[data-testid="appointment-notes"]',
    submitButton: '[data-testid="appointment-submit"]',
    cancelButton: '[data-testid="appointment-cancel"]',
  },

  // Calendar
  calendar: {
    container: '[data-testid="appointment-calendar"]',
    event: '[data-testid="calendar-event"]',
    contextMenu: '[data-testid="calendar-context-menu"]',
    copyButton: '[data-testid="context-menu-copy"]',
    editButton: '[data-testid="context-menu-edit"]',
    deleteButton: '[data-testid="context-menu-delete"]',
  },

  // Modals
  modals: {
    patientModal: '[data-testid="patient-modal"]',
    staffModal: '[data-testid="staff-modal"]',
    appointmentModal: '[data-testid="appointment-modal"]',
    copyAppointmentModal: '[data-testid="copy-appointment-modal"]',
    closeButton: '[data-testid="modal-close"]',
  },

  // Common
  common: {
    loadingSpinner: '[data-testid="loading-spinner"]',
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]',
    toast: '[data-testid="toast"]',
  },
};
