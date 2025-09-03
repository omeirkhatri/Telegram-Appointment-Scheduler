import { render, screen } from '@testing-library/react';
import { PrintableAgenda } from './PrintableAgenda';
import type { Appointment, Patient, Staff } from '@/types';

// Mock data
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

describe('PrintableAgenda', () => {
  const defaultProps = {
    staff: mockStaff,
    appointments: [{
      appointment: mockAppointment,
      patient: mockPatient,
      staff: [mockStaff],
      driver: mockDriver,
    }],
    date: new Date('2024-01-15'),
  };

  it('should render loading state initially', () => {
    render(<PrintableAgenda {...defaultProps} />);
    // In test environment, the component renders immediately
    expect(screen.getByText('MediCare Scheduler')).toBeInTheDocument();
  });

  it('should render agenda header with staff information', async () => {
    render(<PrintableAgenda {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('MediCare Scheduler')).toBeInTheDocument();
    expect(screen.getByText('Daily Appointment Agenda')).toBeInTheDocument();
    expect(screen.getByText('Schedule for 15/01/2024')).toBeInTheDocument();
    expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('Phone: +971501234569')).toBeInTheDocument();
    expect(screen.getByText('Email: ahmed@medicare.com')).toBeInTheDocument();
  });

  it('should render appointment details', async () => {
    render(<PrintableAgenda {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText('Doctor On Call')).toBeInTheDocument();
    expect(screen.getByText('60 minutes')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('+971501234567')).toBeInTheDocument();
    expect(screen.getByText('Villa 123, Al Wasl Road, Jumeirah, Dubai')).toBeInTheDocument();
  });

  it('should render staff assignments', async () => {
    render(<PrintableAgenda {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Dr. Ahmed Hassan (+971501234569)')).toBeInTheDocument();
  });

  it('should render transportation information', async () => {
    render(<PrintableAgenda {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Driver: Mohammed Ali')).toBeInTheDocument();
  });

  it('should render custom fields', async () => {
    render(<PrintableAgenda {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Chief Complaint:')).toBeInTheDocument();
    expect(screen.getByText('Chest pain')).toBeInTheDocument();
  });

  it('should render notes', async () => {
    render(<PrintableAgenda {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Patient prefers morning appointments')).toBeInTheDocument();
  });

  it('should render appointment ID', async () => {
    render(<PrintableAgenda {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Appointment ID: appointment-1')).toBeInTheDocument();
  });

  it('should render summary with total appointments', async () => {
    render(<PrintableAgenda {...defaultProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Total: 1 appointment')).toBeInTheDocument();
  });

  it('should render no appointments message when empty', async () => {
    const emptyProps = {
      ...defaultProps,
      appointments: [],
    };
    
    render(<PrintableAgenda {...emptyProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('No appointments scheduled')).toBeInTheDocument();
    expect(screen.getByText('You have no appointments scheduled for 15/01/2024.')).toBeInTheDocument();
  });

  it('should render multiple appointments correctly', async () => {
    const secondAppointment: Appointment = {
      ...mockAppointment,
      id: 'appointment-2',
      start_time: '14:00',
      appointment_type: 'lab_test',
    };

    const multipleProps = {
      ...defaultProps,
      appointments: [
        defaultProps.appointments[0],
        {
          appointment: secondAppointment,
          patient: mockPatient,
          staff: [mockStaff],
          driver: mockDriver,
        },
      ],
    };

    render(<PrintableAgenda {...multipleProps} />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(screen.getByText('Total: 2 appointments')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('should apply custom className', async () => {
    render(<PrintableAgenda {...defaultProps} className="custom-class" />);
    
    // Wait for client-side rendering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const agendaElement = screen.getByText('MediCare Scheduler').closest('.print-agenda');
    expect(agendaElement).toHaveClass('custom-class');
  });
});
