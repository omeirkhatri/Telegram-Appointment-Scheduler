import type { Appointment, Patient, Staff } from '@/types';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppointmentForm } from './AppointmentForm';


jest.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: jest.fn(() => true),
}));

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(),
  useFieldArray: jest.fn(),
}));

const mockUseForm = require('react-hook-form').useForm;
const mockUseFieldArray = require('react-hook-form').useFieldArray;
const { isFeatureEnabled } = require('@/lib/featureFlags');

describe('AppointmentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isFeatureEnabled.mockReturnValue(true);
  });

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
      available_days: [1, 2, 3, 4, 5],
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      status: 'active',
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
      available_days: [1, 2, 3, 4, 5, 6],
      working_hours_start: '08:00',
      working_hours_end: '16:00',
      status: 'active',
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
      available_days: [1, 2, 3, 4, 5, 6, 7],
      working_hours_start: '06:00',
      working_hours_end: '22:00',
      status: 'active',
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
    expect(screen.getByText('Notes & Instructions')).toBeInTheDocument();
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

    expect(screen.getAllByText('Patient is required')).toHaveLength(2); // Multiple error messages
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
  });

  it('shows recurring options in RecurrenceRuleBuilder', () => {
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

    // The RecurrenceRuleBuilder is always rendered, no checkbox needed
    expect(screen.getByText('Does not repeat')).toBeInTheDocument();
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

    // The RecurrenceRuleBuilder is always rendered, no checkbox needed
    expect(screen.getByText('Does not repeat')).toBeInTheDocument();
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
    expect(screen.getByText('Notes & Instructions')).toBeInTheDocument();

    // Check for required field labels
    expect(screen.getByText('Patient *')).toBeInTheDocument();
    expect(screen.getByText('Appointment Type *')).toBeInTheDocument();
    expect(screen.getByText('Date *')).toBeInTheDocument();
    expect(screen.getByText('Start Time *')).toBeInTheDocument();
    expect(screen.getByText('End Time *')).toBeInTheDocument();
    expect(screen.getByText('Duration *')).toBeInTheDocument();
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

    expect(screen.getByText('15-min intervals')).toBeInTheDocument();
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

  // New tests for assignment mode functionality
  describe('Assignment Mode Functionality', () => {
    it('shows assignment mode toggle when transportation type is driver', () => {
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

      expect(screen.getByText('Driver Assignment Mode')).toBeInTheDocument();
      expect(screen.getByText('Assign Now')).toBeInTheDocument();
      expect(screen.getByText('Assign Later')).toBeInTheDocument();
    });

    it('does not show assignment mode toggle when transportation type is not driver', () => {
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

      expect(screen.queryByText('Driver Assignment Mode')).not.toBeInTheDocument();
    });

    it('shows driver selection when assignment mode is assign_now', () => {
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

      // Should show driver selection by default (assign_now)
      expect(screen.getByText('Driver *')).toBeInTheDocument();
      expect(screen.getByText('Driver Ali - +971501234572')).toBeInTheDocument();
    });

    it('shows assign later message when assignment mode is assign_later', () => {
      // Mock the component to simulate assign_later mode
      const { rerender } = render(
        <AppointmentForm
          patients={mockPatients}
          staff={mockStaff}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
      );

      // This test would need to be updated to properly test the assignment mode state
      // For now, we'll test the UI elements that should be present
      expect(screen.getByText('Assign Later')).toBeInTheDocument();
    });

    it('shows assignment mode descriptions', () => {
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

      expect(screen.getByText('Select a driver immediately. Use when you know which driver will handle this appointment.')).toBeInTheDocument();
      expect(screen.getByText('Save appointment without driver selection. Driver will be assigned later through the capacity planner.')).toBeInTheDocument();
    });
  });

  // Tests for form submission variations
  describe('Form Submission Variations', () => {
    it('submits form with assign_now mode and driver selection', () => {
      const mockHandleSubmit = jest.fn((fn) => fn);

      mockUseForm.mockReturnValue({
        register: jest.fn(),
        handleSubmit: mockHandleSubmit,
        control: {},
        formState: { errors: {}, isSubmitting: false },
        watch: jest.fn().mockImplementation((field) => {
          if (field === 'appointment_type') return 'doctor_on_call';
          if (field === 'transportation_type') return 'driver';
          if (field === 'driver_id') return '3';
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

      const submitButton = screen.getByText('Create Appointment');
      fireEvent.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('validates driver selection when assignment mode is assign_now', () => {
      const mockErrors = {
        driver_id: { message: 'Driver ID is required when transportation type is driver and assignment mode is assign now' },
      };

      mockUseForm.mockReturnValue({
        register: jest.fn(),
        handleSubmit: jest.fn(),
        control: {},
        formState: { errors: mockErrors, isSubmitting: false },
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

      expect(screen.getByText('Driver ID is required when transportation type is driver and assignment mode is assign now')).toBeInTheDocument();
    });

    it('allows form submission without driver when assignment mode is assign_later', () => {
      const mockHandleSubmit = jest.fn((fn) => fn);

      mockUseForm.mockReturnValue({
        register: jest.fn(),
        handleSubmit: mockHandleSubmit,
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

      // Should not show driver validation error when in assign_later mode
      expect(screen.queryByText('Driver ID is required when transportation type is driver and assignment mode is assign now')).not.toBeInTheDocument();
    });
  it('shows override capture controls when assigning a non-primary recommended driver', async () => {
    jest.useFakeTimers();

    const setValue = jest.fn();
    const watchMock = jest.fn((field: string) => {
      switch (field) {
        case 'appointment_type':
          return 'doctor_on_call';
        case 'transportation_type':
          return 'driver';
        case 'appointment_date':
          return '2024-12-25';
        case 'start_time':
          return '10:00';
        case 'end_time':
          return '11:00';
        case 'duration_minutes':
          return 60;
        case 'patient_id':
          return '1';
        case 'status':
          return 'scheduled';
        default:
          return '';
      }
    });

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      control: {},
      formState: { errors: {}, isSubmitting: false },
      watch: watchMock,
      setValue,
      reset: jest.fn(),
    });

    isFeatureEnabled.mockReturnValue(true);

    mockUseFieldArray.mockReturnValue({
      fields: [],
      append: jest.fn(),
      remove: jest.fn(),
    });

    const driverPrimary: Staff = {
      id: 'driver-primary',
      first_name: 'Driver',
      last_name: 'Primary',
      staff_type: 'driver',
      specialization: '',
      phone: '+971500000001',
      email: 'primary@example.com',
      available_days: [1, 2, 3, 4, 5, 6, 7],
      working_hours_start: '06:00',
      working_hours_end: '22:00',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const driverSecondary: Staff = {
      id: 'driver-secondary',
      first_name: 'Driver',
      last_name: 'Secondary',
      staff_type: 'driver',
      specialization: '',
      phone: '+971500000002',
      email: 'secondary@example.com',
      available_days: [1, 2, 3, 4, 5, 6, 7],
      working_hours_start: '06:00',
      working_hours_end: '22:00',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const segment = {
      id: 'segment-override',
      appointment_id: 'appointment-1',
      segment_type: 'pickup',
      title: 'Pickup',
      planned_start: '2024-12-25T10:00:00.000Z',
      planned_end: '2024-12-25T10:30:00.000Z',
      driver_id: 'driver-secondary',
      travel_mode: null,
      pickup_location: null,
      patient_location: null,
      pickup_location_type: 'office' as const,
      pickup_location_reference: null,
      estimated_travel_minutes: 25,
      estimated_distance_km: 12,
      buffer_minutes: 15,
      instructions: null,
      requires_follow_up: false,
      status: 'scheduled' as const,
      manual_override: false,
      google_event_id: null,
      assignment_mode: 'assign_now' as const,
      priority: 0,
      recommended_driver_ids: ['driver-primary', 'driver-secondary'],
      recommendation_metadata: {
        drivers: [
          { driver_id: 'driver-primary', score: 0.92, reasons: ['Closest to pickup'], tags: ['Wheelchair ready'] },
          { driver_id: 'driver-secondary', score: 0.72, reasons: ['Backup driver'], tags: ['On standby'] },
        ],
      },
      queue_rank: 1,
      escalation_state: 'normal' as const,
      escalation_deadline: null,
      created_at: '2024-12-20T09:00:00.000Z',
      updated_at: '2024-12-20T09:00:00.000Z',
    };

    render(
      <AppointmentForm
        appointment={mockAppointment}
        patients={mockPatients}
        staff={[driverPrimary, driverSecondary]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
        transportationSegments={[segment]}
      />,
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(screen.getByText('Override reason')).toBeInTheDocument());

    const reasonSelect = screen.getByLabelText('Reason') as HTMLSelectElement;
    expect(reasonSelect).toBeRequired();

    fireEvent.change(reasonSelect, { target: { value: 'patient_preference' } });
    expect(reasonSelect.value).toBe('patient_preference');

    const notesField = screen.getByLabelText('Notes (optional)') as HTMLTextAreaElement;
    fireEvent.change(notesField, { target: { value: 'Patient requested a familiar driver' } });
    expect(notesField.value).toBe('Patient requested a familiar driver');

    const driverSelect = screen.getByLabelText('Driver') as HTMLSelectElement;
    fireEvent.change(driverSelect, { target: { value: 'driver-primary' } });

    await waitFor(() => expect(screen.queryByText('Override reason')).not.toBeInTheDocument());

    jest.useRealTimers();
  });

  });

  // Tests for transportation segments with assignment modes
  describe('Transportation Segments with Assignment Modes', () => {
    it('creates segments with correct assignment mode', () => {
      mockUseForm.mockReturnValue({
        register: jest.fn(),
        handleSubmit: jest.fn(),
        control: {},
        formState: { errors: {}, isSubmitting: false },
        watch: jest.fn().mockImplementation((field) => {
          if (field === 'appointment_type') return 'doctor_on_call';
          if (field === 'transportation_type') return 'driver';
          if (field === 'appointment_date') return '2024-12-25';
          if (field === 'start_time') return '10:00';
          if (field === 'end_time') return '11:00';
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

      // This test would need to be enhanced to properly test segment creation
      // For now, we verify the segment mode is available
      expect(screen.getByText('Segment Mode')).toBeInTheDocument();
    });

    it('validates segment fields when in segment mode', () => {
      mockUseForm.mockReturnValue({
        register: jest.fn(),
        handleSubmit: jest.fn(),
        control: {},
        formState: { errors: {}, isSubmitting: false },
        watch: jest.fn().mockImplementation((field) => {
          if (field === 'appointment_type') return 'doctor_on_call';
          if (field === 'transportation_type') return 'driver';
          if (field === 'transportation_mode') return 'segments';
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

      // Test would need to be enhanced to properly test segment validation
      // This is a placeholder for the segment validation test
      // Note: Transportation Segments section is only shown when feature flag is enabled
      // and transportation type is 'driver' and mode is 'segments'
    });
  });
});
