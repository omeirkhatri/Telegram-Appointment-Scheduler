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
      latitude: '25.2048',
      longitude: '55.2708',
      medicalNotes: 'Patient has diabetes and requires regular monitoring',
      emergencyContact: '+971509876543',
      preferredTransport: 'Driver',
    },
    valid2: {
      name: 'Sarah Johnson',
      phone: '+971502345678',
      flatVillaNo: 'Apt 456',
      buildingStreet: 'Sheikh Zayed Road',
      area: 'Downtown',
      city: 'Dubai',
      latitude: '25.2048',
      longitude: '55.2708',
    },
    valid3: {
      name: 'Mohammed Hassan',
      phone: '+971503456789',
      flatVillaNo: 'Villa 789',
      buildingStreet: 'Jumeirah Beach Road',
      area: 'Jumeirah',
      city: 'Dubai',
      latitude: '25.2048',
      longitude: '55.2808',
    },
    minimal: {
      name: 'Fatima Al-Zahra',
      phone: '+971504567890',
      flatVillaNo: 'Apt 101',
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
    driverOnCall: {
      appointmentType: 'Driver on Call',
      appointmentDate: '2024-12-23',
      startTime: '08:00',
      durationMinutes: 30,
      status: 'scheduled',
      transportationType: 'driver',
      transportationMethod: 'Driver',
      notes: 'Transportation service',
    },
    nurseOnCall: {
      appointmentType: 'Nurse on Call',
      appointmentDate: '2024-12-24',
      startTime: '11:00',
      durationMinutes: 45,
      status: 'scheduled',
      transportationType: 'driver',
      transportationMethod: 'Driver',
      notes: 'Nursing care at home',
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
    latitude: '[data-testid="patient-latitude"]',
    longitude: '[data-testid="patient-longitude"]',
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

  // Map view
  mapView: {
    container: '[data-testid="appointment-map-view"]',
    marker: '[data-testid="map-marker"]',
    cluster: '[data-testid="map-cluster"]',
    infoWindow: '[data-testid="map-info-window"]',
    error: '[data-testid="map-error"]',
    errorMessage: '[data-testid="map-error-message"]',
    retryButton: '[data-testid="map-retry-button"]',
    emptyState: '[data-testid="map-empty-state"]',
    emptyMessage: '[data-testid="map-empty-message"]',
    zoomControls: '[data-testid="map-zoom-controls"]',
    zoomIn: '[data-testid="zoom-in-button"]',
    zoomOut: '[data-testid="zoom-out-button"]',
    dateNavigation: '[data-testid="map-date-navigation"]',
    nextDay: '[data-testid="next-day-button"]',
    previousDay: '[data-testid="previous-day-button"]',
    today: '[data-testid="today-button"]',
    satelliteView: '[data-testid="satellite-view-button"]',
    streetView: '[data-testid="street-view-button"]',
    mobileControls: '[data-testid="mobile-map-controls"]',
  },

  // View switcher
  viewSwitcher: {
    container: '[data-testid="view-switcher"]',
    calendar: '[data-testid="calendar-view-option"]',
    table: '[data-testid="table-view-option"]',
    map: '[data-testid="map-view-option"]',
  },

  // Filters
  filters: {
    appointmentType: '[data-testid="appointment-type-filter"]',
    search: '[data-testid="appointment-search"]',
    doctorOnCall: '[data-testid="filter-doctor-on-call"]',
    driverOnCall: '[data-testid="filter-driver-on-call"]',
    nurseOnCall: '[data-testid="filter-nurse-on-call"]',
  },

  // Common
  common: {
    loadingSpinner: '[data-testid="loading-spinner"]',
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]',
    toast: '[data-testid="toast"]',
  },
};
