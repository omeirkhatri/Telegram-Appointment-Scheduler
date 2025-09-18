// Application routes
export const ROUTES = {
  // Main pages
  HOME: '/',
  DASHBOARD: '/dashboard',

  // Patient management
  PATIENTS: '/patients',
  PATIENT_DETAILS: (id: string) => `/patients/${id}`,
  PATIENT_EDIT: (id: string) => `/patients/${id}/edit`,
  PATIENT_NEW: '/patients/new',

  // Staff management
  STAFF: '/staff',
  STAFF_DETAILS: (id: string) => `/staff/${id}`,
  STAFF_EDIT: (id: string) => `/staff/${id}/edit`,
  STAFF_NEW: '/staff/new',

  // Appointment management
  APPOINTMENTS: '/appointments',
  APPOINTMENT_DETAILS: (id: string) => `/appointments/${id}`,
  APPOINTMENT_EDIT: (id: string) => `/appointments/${id}/edit`,
  APPOINTMENT_NEW: '/appointments/new',

  // Payments
  PAYMENTS_CLIENTS: '/payments/clients',
  PAYMENTS_CAREGIVERS: '/payments/caregivers',

  // Authentication
  SIGNIN: '/signin',
  SIGNOUT: '/signout',

  // API routes
  API: {
    PATIENTS: '/api/patients',
    STAFF: '/api/staff',
    APPOINTMENTS: '/api/appointments',
  },
} as const;
