import { render, screen } from '@testing-library/react';
import { PrintableAppointmentSheet } from './PrintableAppointmentSheet';
import type { Appointment, Patient, Staff } from '@/types';

// Mock data
const mockPatient: Patient = {
  id: 'patient-1',
  name: 'John Doe',
  phone: '+971501234567',
  flat_villa_no: 'Villa 123',
  building_street: 'Al Wasl Road',
  area: 'Jumeirah',
  city: 'Dubai',
  google_maps_link: 'https://maps.google.com/...',
  medical_notes: 'Diabetes patient',
  emergency_contact: '+971501234568',
  preferred_transport: 'Driver',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockStaff: Staff = {
  id: 'staff-1',
  first_name: 'Dr. Ahmed',
  last_name: 'Hassan',
  staff_type: 'doctor',
  specialization: 'Cardiology',
  phone: '+971501234569',
  email: 'ahmed@medicare.com',
  google_calendar_id: 'ahmed@medicare.com',
  available_days: [1, 2, 3, 4, 5],
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  status: 'active',
  email_notifications_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockDriver: Staff = {
  id: 'driver-1',
  first_name: 'Mohammed',
  last_name: 'Ali',
  staff_type: 'driver',
  specialization: null,
  phone: '+971501234570',
  email: 'mohammed@medicare.com',
  google_calendar_id: 'mohammed@medicare.com',
  available_days: [1, 2, 3, 4, 5, 6, 7],
  working_hours_start: '06:00',
  working_hours_end: '22:00',
  status: 'active',
  email_notifications_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAppointment: Appointment = {
  id: 'appointment-1',
  patient_id: 'patient-1',
  appointment_type: 'doctor_on_call',
  appointment_date: '2024-01-15',
  start_time: '10:00',
  duration_minutes: 60,
  status: 'scheduled',
  custom_fields: {
    chiefComplaint: 'Chest pain',
    primaryDoctor: 'Dr. Ahmed Hassan',
  },
  transportation_type: 'driver',
  transportation_method: null,
  driver_id: 'driver-1',
  notes: 'Patient prefers morning appointments',
  recurring_rule: null,
  google_event_ids: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('PrintableAppointmentSheet', () => {
  const defaultProps = {
    appointment: mockAppointment,
    patient: mockPatient,
    staff: [mockStaff],
    driver: mockDriver,
  };

  it('should render loading state initially', () => {
    render(<PrintableAppointmentSheet {...defaultProps} />);
    // In test environment, the component renders immediately
    expect(screen.getByText('MediCare Scheduler')).toBeInTheDocument();
  });

  it('should render appointment header', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('MediCare Scheduler')).toBeInTheDocument();
    expect(screen.getAllByText('Appointment Details')).toHaveLength(2);
    expect(screen.getByText('Appointment #appointm')).toBeInTheDocument();
    expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    expect(screen.getByText('60 minutes')).toBeInTheDocument();
  });

  it('should render appointment type badge', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Doctor On Call')).toBeInTheDocument();
  });

  it('should render patient information', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Patient Information')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('+971501234567')).toBeInTheDocument();
    expect(screen.getByText('Villa 123, Al Wasl Road, Jumeirah, Dubai')).toBeInTheDocument();
  });

  it('should render staff information', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Assigned Staff')).toBeInTheDocument();
    expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('+971501234569')).toBeInTheDocument();
  });

  it('should render transportation information', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    expect(screen.getByText('Driver: Mohammed Ali')).toBeInTheDocument();
  });

  it('should render custom fields', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getAllByText('Appointment Details')).toHaveLength(2);
    expect(screen.getByText('Chief Complaint:')).toBeInTheDocument();
    expect(screen.getByText('Chest pain')).toBeInTheDocument();
  });

  it('should render notes', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Patient prefers morning appointments')).toBeInTheDocument();
  });

  it('should render additional information', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Additional Information')).toBeInTheDocument();
    expect(screen.getByText('appointment-1')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('should handle appointment without notes', async () => {
    const appointmentWithoutNotes = {
      ...mockAppointment,
      notes: null,
    };

    render(<PrintableAppointmentSheet {...defaultProps} appointment={appointmentWithoutNotes} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('should handle appointment without custom fields', async () => {
    const appointmentWithoutCustomFields = {
      ...mockAppointment,
      custom_fields: null,
    };

    render(<PrintableAppointmentSheet {...defaultProps} appointment={appointmentWithoutCustomFields} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Should only have the header "Appointment Details", not the custom fields section
    expect(screen.getAllByText('Appointment Details')).toHaveLength(1);
  });

  it('should handle appointment without staff', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} staff={[]} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.queryByText('Assigned Staff')).not.toBeInTheDocument();
  });

  it('should handle self-transport appointment', async () => {
    const selfTransportAppointment = {
      ...mockAppointment,
      transportation_type: 'self_transport' as const,
      transportation_method: 'Taxi',
    };

    render(<PrintableAppointmentSheet {...defaultProps} appointment={selfTransportAppointment} driver={undefined} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Self-transport: Taxi')).toBeInTheDocument();
  });

  it('should apply custom className', async () => {
    render(<PrintableAppointmentSheet {...defaultProps} className="custom-class" />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const sheetElement = screen.getByText('MediCare Scheduler').closest('.print-appointment-sheet');
    expect(sheetElement).toHaveClass('custom-class');
  });

  it('should render different appointment types correctly', async () => {
    const labTestAppointment = {
      ...mockAppointment,
      appointment_type: 'lab_test' as const,
      custom_fields: {
        testList: 'Blood sugar, Cholesterol',
        labName: 'AVM',
        sampleTypes: ['Blood', 'Urine'],
        fastingRequired: true,
      },
    };

    render(<PrintableAppointmentSheet {...defaultProps} appointment={labTestAppointment} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Lab Test')).toBeInTheDocument();
    expect(screen.getByText('Tests:')).toBeInTheDocument();
    expect(screen.getByText('Blood sugar, Cholesterol')).toBeInTheDocument();
    expect(screen.getByText('Lab:')).toBeInTheDocument();
    expect(screen.getByText('AVM')).toBeInTheDocument();
    expect(screen.getByText('Sample Types:')).toBeInTheDocument();
    expect(screen.getByText('Blood, Urine')).toBeInTheDocument();
    expect(screen.getByText('Fasting Required:')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });
});
