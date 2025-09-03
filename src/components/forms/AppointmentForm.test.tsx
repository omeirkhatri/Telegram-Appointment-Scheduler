import type { Appointment, Patient, Staff } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppointmentForm } from './AppointmentForm';

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(),
  useFieldArray: jest.fn(),
}));

const mockUseForm = require('react-hook-form').useForm;
const mockUseFieldArray = require('react-hook-form').useFieldArray;

describe('AppointmentForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockPatients: Patient[] = [
    {
      id: '1',
      name: 'John Doe',
      phone: '+971501234567',
      flat_villa_no: 'Villa 123',
      building_street: 'Sheikh Zayed Road',
      area: 'Dubai Marina',
      city: 'Dubai',
      google_maps_link: 'https://maps.google.com/...',
      medical_notes: 'Allergic to penicillin',
      emergency_contact: 'Jane Doe - +971501234568',
      preferred_transport: 'Taxi',
      id_document_url: 'https://example.com/document.pdf',
      id_document_filename: 'document.pdf',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Jane Smith',
      phone: '+971501234569',
      flat_villa_no: 'Apartment 456',
      building_street: 'Jumeirah Beach Road',
      area: 'Jumeirah',
      city: 'Dubai',
      google_maps_link: 'https://maps.google.com/...',
      medical_notes: '',
      emergency_contact: '',
      preferred_transport: 'Family member',
      id_document_url: '',
      id_document_filename: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockStaff: Staff[] = [
    {
      id: '1',
      first_name: 'Dr. Ahmed',
      last_name: 'Hassan',
      staff_type: 'doctor',
      specialization: 'Cardiology',
      phone: '+971501234570',
      email: 'ahmed@example.com',
      google_calendar_id: 'ahmed@example.com',
      available_days: [1, 2, 3, 4, 5],
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      status: 'active',
      email_notifications_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      first_name: 'Nurse',
      last_name: 'Maryam',
      staff_type: 'nurse',
      specialization: 'General',
      phone: '+971501234571',
      email: 'maryam@example.com',
      google_calendar_id: 'maryam@example.com',
      available_days: [1, 2, 3, 4, 5, 6],
      working_hours_start: '08:00',
      working_hours_end: '16:00',
      status: 'active',
      email_notifications_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      first_name: 'Driver',
      last_name: 'Ali',
      staff_type: 'driver',
      specialization: '',
      phone: '+971501234572',
      email: 'ali@example.com',
      google_calendar_id: 'ali@example.com',
      available_days: [1, 2, 3, 4, 5, 6, 7],
      working_hours_start: '06:00',
      working_hours_end: '22:00',
      status: 'active',
      email_notifications_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockAppointment: Appointment = {
    id: '1',
    patient_id: '1',
    appointment_type: 'doctor_on_call',
    appointment_date: '2024-12-25',
    start_time: '10:00',
    duration_minutes: 60,
    status: 'scheduled',
    custom_fields: {},
    transportation_type: 'driver',
    transportation_method: '',
    driver_id: '3',
    notes: 'Regular checkup',
    recurring_rule: undefined,
    google_event_ids: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create appointment form correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Appointment Details')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    expect(screen.getByText('Staff Assignments')).toBeInTheDocument();
    expect(screen.getByText('Recurring Appointment')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Create Appointment')).toBeInTheDocument();
  });

  it('renders update appointment form correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        appointment={mockAppointment}
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Update Appointment')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: true },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />,
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('displays form validation errors', () => {
    const mockErrors = {
      patient_id: { message: 'Patient is required' },
      appointment_date: { message: 'Appointment date is required' },
      start_time: { message: 'Start time is required' },
    };

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: mockErrors, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Patient is required')).toBeInTheDocument();
    expect(screen.getByText('Appointment date is required')).toBeInTheDocument();
    expect(screen.getByText('Start time is required')).toBeInTheDocument();
  });

  it('renders all appointment type options', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const appointmentTypeSelect = screen.getByLabelText(/Appointment Type/i);
    expect(appointmentTypeSelect).toBeInTheDocument();

    // Check for all appointment type options
    expect(screen.getByText('Doctor on Call')).toBeInTheDocument();
    expect(screen.getByText('Lab Test')).toBeInTheDocument();
    expect(screen.getByText('Teleconsultation')).toBeInTheDocument();
    expect(screen.getByText('Physiotherapy')).toBeInTheDocument();
    expect(screen.getByText('Caregiver')).toBeInTheDocument();
    expect(screen.getByText('IV Therapy')).toBeInTheDocument();
  });

  it('renders transportation type options', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const transportationTypeSelect = screen.getByLabelText(/Transportation Type/i);
    expect(transportationTypeSelect).toBeInTheDocument();

    // Check for transportation type options
    expect(screen.getByText('Driver')).toBeInTheDocument();
    expect(screen.getByText('Self Transport')).toBeInTheDocument();
  });

  it('shows driver selection when transportation type is driver', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockImplementation((field) => {
        if (field === 'appointment_type') return 'doctor_on_call';
        if (field === 'transportation_type') return 'driver';
        return '';
      }),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Driver *')).toBeInTheDocument();
    expect(screen.getByText('Driver Ali - +971501234572')).toBeInTheDocument();
  });

  it('shows transportation method selection when transportation type is self-transport', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockImplementation((field) => {
        if (field === 'appointment_type') return 'doctor_on_call';
        if (field === 'transportation_type') return 'self_transport';
        return '';
      }),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Transportation Method *')).toBeInTheDocument();
    expect(screen.getByText("Won't work")).toBeInTheDocument();
    expect(screen.getByText('Family member')).toBeInTheDocument();
    expect(screen.getByText('Taxi')).toBeInTheDocument();
    expect(screen.getByText('Public transport')).toBeInTheDocument();
    expect(screen.getByText('Walking')).toBeInTheDocument();
  });

  it('handles staff assignment addition and removal', () => {
    const mockAppend = jest.fn();
    const mockRemove = jest.fn();

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockImplementation((field) => {
        if (field === 'appointment_type') return 'doctor_on_call';
        if (field === 'staff_assignments') return [];
        return '';
      }),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: mockAppend,
      remove: mockRemove,
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const addStaffButton = screen.getByText('Add Staff');
    fireEvent.click(addStaffButton);

    expect(mockAppend).toHaveBeenCalledWith({
      staff_id: '',
      role: 'primary',
      is_primary: false,
    });
  });

  it('displays staff assignments when present', () => {
    const mockFields = [
      { id: '1', staff_id: '1', role: 'primary', is_primary: true },
    ];

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockImplementation((field) => {
        if (field === 'appointment_type') return 'doctor_on_call';
        if (field === 'staff_assignments') return mockFields;
        return '';
      }),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: mockFields,
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Staff Member *')).toBeInTheDocument();
    expect(screen.getByText('Role *')).toBeInTheDocument();
    expect(screen.getAllByText('Primary')).toHaveLength(2); // One in select option, one in checkbox label
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('shows recurring options when checkbox is checked', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockImplementation((field) => {
        if (field === 'appointment_type') return 'doctor_on_call';
        if (field === 'appointment_date') return '2024-01-15';
        return undefined;
      }),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const recurringCheckbox = screen.getByRole('checkbox');
    fireEvent.click(recurringCheckbox);

    expect(screen.getByText('Recurrence Pattern')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Yearly')).toBeInTheDocument();
  });

  it('renders recurring frequency options', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockImplementation((field) => {
        if (field === 'appointment_type') return 'doctor_on_call';
        if (field === 'appointment_date') return '2024-01-15';
        return undefined;
      }),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const recurringCheckbox = screen.getByRole('checkbox');
    fireEvent.click(recurringCheckbox);

    // Check for recurring frequency options
    expect(screen.getByText('Recurrence Pattern')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Yearly')).toBeInTheDocument();
  });

  it('handles cancel button click', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('filters staff by appointment type for doctor on call', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [{ id: '1', staff_id: '', role: 'primary', is_primary: false }],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    // Should only show doctors for doctor_on_call
    expect(screen.getByText('Dr. Ahmed Hassan (doctor)')).toBeInTheDocument();
    expect(screen.queryByText('Nurse Maryam (nurse)')).not.toBeInTheDocument();
  });

  it('filters staff by appointment type for lab test', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('lab_test'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [{ id: '1', staff_id: '', role: 'primary', is_primary: false }],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    // Should show nurses and lab technicians for lab_test
    expect(screen.getByText('Nurse Maryam (nurse)')).toBeInTheDocument();
    expect(screen.queryByText('Dr. Ahmed Hassan (doctor)')).not.toBeInTheDocument();
  });

  it('renders all required form sections', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    // Check for all form sections
    expect(screen.getByText('Appointment Details')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    expect(screen.getByText('Staff Assignments')).toBeInTheDocument();
    expect(screen.getByText('Recurring Appointment')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();

    // Check for required field labels
    expect(screen.getByText('Patient *')).toBeInTheDocument();
    expect(screen.getByText('Appointment Type *')).toBeInTheDocument();
    expect(screen.getByText('Appointment Date *')).toBeInTheDocument();
    expect(screen.getByText('Start Time *')).toBeInTheDocument();
    expect(screen.getByText('End Time *')).toBeInTheDocument();
    expect(screen.getByText('Duration (minutes) *')).toBeInTheDocument();
  });

  it('displays duration calculation helper text', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Automatically calculated from start and end times')).toBeInTheDocument();
  });

  it('renders status options', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('doctor_on_call'),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    render(
      <AppointmentForm
        patients={mockPatients}
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    // Check for status options
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});
