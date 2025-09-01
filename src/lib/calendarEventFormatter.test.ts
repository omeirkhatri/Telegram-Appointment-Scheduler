import { CalendarEventFormatter } from './calendarEventFormatter';
import type { Appointment } from '@/types/appointment';
import type { Patient } from '@/types/patient';
import type { Staff } from '@/types/staff';

// Mock data for testing
const mockPatient: Patient = {
  id: 'patient-1',
  name: 'John Doe',
  phone: '+971501234567',
  flat_villa_no: 'Apt 123',
  building_street: 'Building A, Street 1',
  area: 'Dubai Marina',
  city: 'Dubai',
  google_maps_link: 'https://maps.google.com/?q=dubai+marina',
  medical_notes: 'Patient has diabetes',
  emergency_contact: '+971509876543',
  preferred_transport: 'Driver',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockDoctor: Staff = {
  id: 'doctor-1',
  first_name: 'Dr. Sarah',
  last_name: 'Smith',
  staff_type: 'doctor',
  specialization: 'Cardiology',
  phone: '+971502345678',
  email: 'dr.sarah@medicare.com',
  google_calendar_id: 'dr.sarah@medicare.com',
  available_days: [1, 2, 3, 4, 5], // Mon-Fri
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  status: 'active',
  email_notifications_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockDriver: Staff = {
  id: 'driver-1',
  first_name: 'Ahmed',
  last_name: 'Ali',
  staff_type: 'driver',
  phone: '+971503456789',
  email: 'ahmed.ali@medicare.com',
  google_calendar_id: 'ahmed.ali@medicare.com',
  available_days: [1, 2, 3, 4, 5, 6, 7], // All days
  working_hours_start: '06:00',
  working_hours_end: '22:00',
  status: 'active',
  email_notifications_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockNurse: Staff = {
  id: 'nurse-1',
  first_name: 'Nurse',
  last_name: 'Johnson',
  staff_type: 'nurse',
  specialization: 'General Nursing',
  phone: '+971504567890',
  email: 'nurse.johnson@medicare.com',
  google_calendar_id: 'nurse.johnson@medicare.com',
  available_days: [1, 2, 3, 4, 5], // Mon-Fri
  working_hours_start: '08:00',
  working_hours_end: '18:00',
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
    chief_complaint: 'Chest pain',
    primary_doctor_id: 'doctor-1',
    assisting_nurse_id: 'nurse-1',
  },
  transportation_type: 'driver',
  driver_id: 'driver-1',
  notes: 'Patient prefers morning appointments',
  google_event_ids: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('CalendarEventFormatter', () => {
  describe('formatEventTitle', () => {
    it('should format title with staff member', () => {
      const title = CalendarEventFormatter.formatEventTitle(
        mockAppointment,
        mockPatient,
        mockDoctor
      );

      expect(title).toBe('Doctor on Call - John Doe (Dr. Sarah Smith)');
    });

    it('should format title without staff member', () => {
      const title = CalendarEventFormatter.formatEventTitle(
        mockAppointment,
        mockPatient
      );

      expect(title).toBe('Doctor on Call - John Doe');
    });

    it('should handle different appointment types', () => {
      const labTestAppointment = {
        ...mockAppointment,
        appointment_type: 'lab_test' as const,
        custom_fields: {
          test_list: 'Blood test, ECG',
          lab_name: 'AVM',
          sample_types: ['Blood'],
          nurse_id: 'nurse-1',
          fasting_required: true,
        },
      };

      const title = CalendarEventFormatter.formatEventTitle(
        labTestAppointment,
        mockPatient,
        mockDoctor
      );

      expect(title).toBe('Lab Test - John Doe (Dr. Sarah Smith)');
    });
  });

  describe('formatEventDescription', () => {
    it('should format complete event description', () => {
      const description = CalendarEventFormatter.formatEventDescription(
        mockAppointment,
        mockPatient,
        mockDoctor,
        [mockDoctor, mockDriver]
      );

      expect(description).toContain('📅 **Appointment Details**');
      expect(description).toContain('Type: Doctor on Call');
      expect(description).toContain('Date: 15/01/2024');
      expect(description).toContain('Time: 10:00 - 11:00');
      expect(description).toContain('Duration: 60 minutes');
      expect(description).toContain('Status: scheduled');

      expect(description).toContain('👤 **Patient Information**');
      expect(description).toContain('Name: John Doe');
      expect(description).toContain('Phone: +971501234567');
      expect(description).toContain('Address: Apt 123, Building A, Street 1, Dubai Marina, Dubai');
      expect(description).toContain('Medical Notes: Patient has diabetes');
      expect(description).toContain('Emergency Contact: +971509876543');

      expect(description).toContain('👨‍⚕️ **Assigned Staff**');
      expect(description).toContain('• Doctor: Dr. Sarah Smith (+971502345678)');
      expect(description).toContain('• Driver: Ahmed Ali (+971503456789)');

      expect(description).toContain('🚗 **Transportation**');
      expect(description).toContain('Type: Driver');
      expect(description).toContain('Driver: Ahmed Ali (+971503456789)');

      expect(description).toContain('📋 **Additional Details**');
      expect(description).toContain('Chief Complaint: Chest pain');
      expect(description).toContain('Primary Doctor ID: doctor-1');
      expect(description).toContain('Assisting Nurse ID: nurse-1');

      expect(description).toContain('📝 **Notes**');
      expect(description).toContain('Patient prefers morning appointments');
    });

    it('should handle appointment without transportation', () => {
      const appointmentWithoutTransport = {
        ...mockAppointment,
        transportation_type: undefined,
        driver_id: undefined,
      };

      const description = CalendarEventFormatter.formatEventDescription(
        appointmentWithoutTransport,
        mockPatient,
        mockDoctor,
        [mockDoctor]
      );

      expect(description).not.toContain('🚗 **Transportation**');
    });

    it('should handle appointment without custom fields', () => {
      const appointmentWithoutCustomFields = {
        ...mockAppointment,
        custom_fields: {},
      };

      const description = CalendarEventFormatter.formatEventDescription(
        appointmentWithoutCustomFields,
        mockPatient,
        mockDoctor,
        [mockDoctor]
      );

      expect(description).not.toContain('📋 **Additional Details**');
    });

    it('should handle appointment without notes', () => {
      const appointmentWithoutNotes = {
        ...mockAppointment,
        notes: undefined,
      };

      const description = CalendarEventFormatter.formatEventDescription(
        appointmentWithoutNotes,
        mockPatient,
        mockDoctor,
        [mockDoctor]
      );

      expect(description).not.toContain('📝 **Notes**');
    });
  });

  describe('createDriverEventDescription', () => {
    it('should create comprehensive driver event description', () => {
      const description = CalendarEventFormatter.createDriverEventDescription(
        mockAppointment,
        mockPatient,
        mockDriver
      );

      // Driver header
      expect(description).toContain('🚗 **Driver Assignment**');
      expect(description).toContain('Driver: Ahmed Ali');
      expect(description).toContain('Phone: +971503456789');
      expect(description).toContain('Vehicle: Company Vehicle');

      // Pickup details
      expect(description).toContain('📍 **Pickup Details**');
      expect(description).toContain('Patient: John Doe');
      expect(description).toContain('Phone: +971501234567');
      expect(description).toContain('Pickup Address: Apt 123, Building A, Street 1, Dubai Marina, Dubai');
      expect(description).toContain('Maps Link: https://maps.google.com/?q=dubai+marina');
      expect(description).toContain('Pickup Time: 10:00');

      // Appointment details
      expect(description).toContain('🏥 **Appointment Details**');
      expect(description).toContain('Appointment Time: 10:00 - 11:00');
      expect(description).toContain('Appointment Type: Doctor on Call');
      expect(description).toContain('Duration: 60 minutes');
      expect(description).toContain('Date: 15/01/2024');

      // Patient instructions
      expect(description).toContain('📋 **Patient Instructions**');
      expect(description).toContain('Medical Notes: Patient has diabetes');
      expect(description).toContain('Emergency Contact: +971509876543');
      expect(description).toContain('Chief Complaint: Chest pain');

      // Transportation notes
      expect(description).toContain('🚐 **Transportation Notes**');
      expect(description).toContain('• Ensure patient is comfortable during transport');
      expect(description).toContain('• Assist with entering/exiting vehicle if needed');
      expect(description).toContain('• Wait for appointment completion if required');
      expect(description).toContain('• Return patient to pickup location after appointment');

      // Additional notes
      expect(description).toContain('📝 **Additional Notes**');
      expect(description).toContain('Patient prefers morning appointments');
    });

    it('should handle driver with specialization', () => {
      const driverWithSpecialization = {
        ...mockDriver,
        specialization: 'Luxury Sedan',
      };

      const description = CalendarEventFormatter.createDriverEventDescription(
        mockAppointment,
        mockPatient,
        driverWithSpecialization
      );

      expect(description).toContain('Vehicle: Luxury Sedan');
    });

    it('should handle patient without Google Maps link', () => {
      const patientWithoutMaps = {
        ...mockPatient,
        google_maps_link: undefined,
      };

      const description = CalendarEventFormatter.createDriverEventDescription(
        mockAppointment,
        patientWithoutMaps,
        mockDriver
      );

      expect(description).not.toContain('Maps Link:');
    });

    it('should handle lab test with fasting requirements', () => {
      const labTestAppointment = {
        ...mockAppointment,
        appointment_type: 'lab_test' as const,
        custom_fields: {
          test_list: 'Blood test, ECG',
          lab_name: 'AVM',
          sample_types: ['Blood'],
          nurse_id: 'nurse-1',
          fasting_required: true,
        },
      };

      const description = CalendarEventFormatter.createDriverEventDescription(
        labTestAppointment,
        mockPatient,
        mockDriver
      );

      expect(description).toContain('⚠️ Patient may need to fast for lab tests - confirm with patient');
    });

    it('should handle physiotherapy with mobility assistance', () => {
      const physioAppointment = {
        ...mockAppointment,
        appointment_type: 'physiotherapy' as const,
        custom_fields: {
          physiotherapist_id: 'physio-1',
          condition_injury: 'Lower back pain',
          session_type: 'Treatment',
        },
      };

      const description = CalendarEventFormatter.createDriverEventDescription(
        physioAppointment,
        mockPatient,
        mockDriver
      );

      expect(description).toContain('Condition: Lower back pain - may need assistance with mobility');
    });
  });

  describe('createMedicalStaffEventDescription', () => {
    it('should create comprehensive medical staff event description', () => {
      const description = CalendarEventFormatter.createMedicalStaffEventDescription(
        mockAppointment,
        mockPatient,
        mockDoctor
      );

      // Medical header
      expect(description).toContain('👨‍⚕️ **Medical Appointment**');
      expect(description).toContain('Staff: Dr. Sarah Smith');
      expect(description).toContain('Role: Doctor');
      expect(description).toContain('Phone: +971502345678');
      expect(description).toContain('Specialization: Cardiology');

      // Patient information
      expect(description).toContain('👤 **Patient Information**');
      expect(description).toContain('Name: John Doe');
      expect(description).toContain('Phone: +971501234567');
      expect(description).toContain('Address: Apt 123, Building A, Street 1, Dubai Marina, Dubai');
      expect(description).toContain('Emergency Contact: +971509876543');

      // Appointment details
      expect(description).toContain('📅 **Appointment Details**');
      expect(description).toContain('Type: Doctor on Call');
      expect(description).toContain('Date: 15/01/2024');
      expect(description).toContain('Time: 10:00 - 11:00');
      expect(description).toContain('Duration: 60 minutes');
      expect(description).toContain('Status: scheduled');

      // Medical context
      expect(description).toContain('🏥 **Medical Context**');
      expect(description).toContain('Medical Notes: Patient has diabetes');

      // Appointment specifics
      expect(description).toContain('📋 **Appointment Specifics**');
      expect(description).toContain('Chief Complaint: Chest pain');
      expect(description).toContain('Primary Doctor ID: doctor-1');
      expect(description).toContain('Assisting Nurse ID: nurse-1');

      // Notes
      expect(description).toContain('📝 **Notes**');
      expect(description).toContain('Patient prefers morning appointments');
    });

    it('should handle medical staff without specialization', () => {
      const doctorWithoutSpecialization = {
        ...mockDoctor,
        specialization: undefined,
      };

      const description = CalendarEventFormatter.createMedicalStaffEventDescription(
        mockAppointment,
        mockPatient,
        doctorWithoutSpecialization
      );

      expect(description).not.toContain('Specialization:');
    });

    it('should handle patient without medical notes', () => {
      const patientWithoutMedicalNotes = {
        ...mockPatient,
        medical_notes: undefined,
      };

      const description = CalendarEventFormatter.createMedicalStaffEventDescription(
        mockAppointment,
        patientWithoutMedicalNotes,
        mockDoctor
      );

      expect(description).not.toContain('🏥 **Medical Context**');
    });

    it('should handle lab test with preparation notes', () => {
      const labTestAppointment = {
        ...mockAppointment,
        appointment_type: 'lab_test' as const,
        custom_fields: {
          test_list: 'Blood test, ECG, X-ray',
          lab_name: 'AVM',
          sample_types: ['Blood', 'Urine'],
          nurse_id: 'nurse-1',
          fasting_required: true,
        },
      };

      const description = CalendarEventFormatter.createMedicalStaffEventDescription(
        labTestAppointment,
        mockPatient,
        mockNurse
      );

      expect(description).toContain('🔧 **Preparation Required**');
      expect(description).toContain('• Confirm fasting status with patient');
      expect(description).toContain('• Prepare for sample collection: Blood, Urine');
    });

    it('should handle teleconsultation with platform setup', () => {
      const teleconsultationAppointment = {
        ...mockAppointment,
        appointment_type: 'teleconsultation' as const,
        custom_fields: {
          platform: 'Zoom',
          doctor_id: 'doctor-1',
          consultation_type: 'Follow-up',
        },
      };

      const description = CalendarEventFormatter.createMedicalStaffEventDescription(
        teleconsultationAppointment,
        mockPatient,
        mockDoctor
      );

      expect(description).toContain('🔧 **Preparation Required**');
      expect(description).toContain('• Set up Zoom meeting room');
    });

    it('should handle physiotherapy with condition review', () => {
      const physioAppointment = {
        ...mockAppointment,
        appointment_type: 'physiotherapy' as const,
        custom_fields: {
          physiotherapist_id: 'physio-1',
          condition_injury: 'Lower back pain',
          session_type: 'Treatment',
        },
      };

      const description = CalendarEventFormatter.createMedicalStaffEventDescription(
        physioAppointment,
        mockPatient,
        mockDoctor
      );

      expect(description).toContain('🔧 **Preparation Required**');
      expect(description).toContain('• Review patient condition: Lower back pain');
    });

    it('should handle IV therapy with equipment preparation', () => {
      const ivAppointment = {
        ...mockAppointment,
        appointment_type: 'iv_therapy' as const,
        custom_fields: {
          nurse_id: 'nurse-1',
          doctor_id: 'doctor-1',
          iv_type: 'Vitamin C Infusion',
          iv_company: 'Revitalife',
        },
      };

      const description = CalendarEventFormatter.createMedicalStaffEventDescription(
        ivAppointment,
        mockPatient,
        mockNurse
      );

      expect(description).toContain('🔧 **Preparation Required**');
      expect(description).toContain('• Prepare IV equipment for: Vitamin C Infusion');
    });
  });

  describe('createEventData', () => {
    it('should create complete event data', () => {
      const eventData = CalendarEventFormatter.createEventData(
        mockAppointment,
        mockPatient,
        mockDoctor,
        [mockDoctor, mockDriver]
      );

      expect(eventData.summary).toBe('Doctor on Call - John Doe (Dr. Sarah Smith)');
      expect(eventData.description).toContain('📅 **Appointment Details**');
      expect(eventData.start.dateTime).toBe('2024-01-15T10:00:00+04:00');
      expect(eventData.end.dateTime).toBe('2024-01-15T11:00:00+04:00');
      expect(eventData.start.timeZone).toBe('Asia/Dubai');
      expect(eventData.end.timeZone).toBe('Asia/Dubai');
      expect(eventData.location).toBe('https://maps.google.com/?q=dubai+marina');
      expect(eventData.attendees).toEqual([
        { email: 'dr.sarah@medicare.com' },
        { email: 'ahmed.ali@medicare.com' },
      ]);
    });

    it('should handle patient without Google Maps link', () => {
      const patientWithoutMaps = {
        ...mockPatient,
        google_maps_link: undefined,
      };

      const eventData = CalendarEventFormatter.createEventData(
        mockAppointment,
        patientWithoutMaps,
        mockDoctor,
        [mockDoctor]
      );

      expect(eventData.location).toBeUndefined();
    });

    it('should handle staff without email addresses', () => {
      const staffWithoutEmail = {
        ...mockDoctor,
        email: '',
      };

      const eventData = CalendarEventFormatter.createEventData(
        mockAppointment,
        mockPatient,
        staffWithoutEmail,
        [staffWithoutEmail]
      );

      expect(eventData.attendees).toBeUndefined();
    });
  });

  describe('custom fields formatting', () => {
    it('should format lab test custom fields', () => {
      const labTestAppointment = {
        ...mockAppointment,
        appointment_type: 'lab_test' as const,
        custom_fields: {
          test_list: 'Blood test, ECG, X-ray',
          lab_name: 'AVM',
          sample_types: ['Blood', 'Urine'],
          nurse_id: 'nurse-1',
          fasting_required: true,
        },
      };

      const description = CalendarEventFormatter.formatEventDescription(
        labTestAppointment,
        mockPatient,
        mockDoctor,
        [mockDoctor]
      );

      expect(description).toContain('Tests: Blood test, ECG, X-ray');
      expect(description).toContain('Lab: AVM');
      expect(description).toContain('Sample Types: Blood, Urine');
      expect(description).toContain('Nurse ID: nurse-1');
      expect(description).toContain('Fasting Required: Yes');
    });

    it('should format teleconsultation custom fields', () => {
      const teleconsultationAppointment = {
        ...mockAppointment,
        appointment_type: 'teleconsultation' as const,
        custom_fields: {
          platform: 'Zoom',
          doctor_id: 'doctor-1',
          consultation_type: 'Follow-up',
        },
      };

      const description = CalendarEventFormatter.formatEventDescription(
        teleconsultationAppointment,
        mockPatient,
        mockDoctor,
        [mockDoctor]
      );

      expect(description).toContain('Platform: Zoom');
      expect(description).toContain('Doctor ID: doctor-1');
      expect(description).toContain('Consultation Type: Follow-up');
    });

    it('should format physiotherapy custom fields', () => {
      const physiotherapyAppointment = {
        ...mockAppointment,
        appointment_type: 'physiotherapy' as const,
        custom_fields: {
          physiotherapist_id: 'physio-1',
          condition_injury: 'Lower back pain',
          session_type: 'Treatment',
        },
      };

      const description = CalendarEventFormatter.formatEventDescription(
        physiotherapyAppointment,
        mockPatient,
        mockDoctor,
        [mockDoctor]
      );

      expect(description).toContain('Physiotherapist ID: physio-1');
      expect(description).toContain('Condition/Injury: Lower back pain');
      expect(description).toContain('Session Type: Treatment');
    });
  });
});
