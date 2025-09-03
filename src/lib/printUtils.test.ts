import {
  formatPrintDate,
  formatPrintTime,
  getPrintEndTime,
  formatAppointmentTypeForPrint,
  getAppointmentTypePrintClass,
  formatPatientAddressForPrint,
  formatStaffNameForPrint,
  formatStaffTypeForPrint,
  formatTransportationForPrint,
  formatCustomFieldsForPrint,
  generateAppointmentPrintSummary,
  generateAgendaPrintData,
  printUtils,
} from './printUtils';
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

describe('printUtils', () => {
  describe('formatPrintDate', () => {
    it('should format date string correctly', () => {
      const result = formatPrintDate('2024-01-15');
      expect(result).toBe('15/01/2024');
    });

    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15');
      const result = formatPrintDate(date);
      expect(result).toBe('15/01/2024');
    });
  });

  describe('formatPrintTime', () => {
    it('should format time correctly', () => {
      const result = formatPrintTime('10:30');
      expect(result).toBe('10:30');
    });

    it('should handle time with seconds', () => {
      const result = formatPrintTime('10:30:45');
      expect(result).toBe('10:30');
    });
  });

  describe('getPrintEndTime', () => {
    it('should calculate end time correctly', () => {
      const result = getPrintEndTime('10:00', 60);
      expect(result).toBe('11:00');
    });

    it('should handle hour overflow', () => {
      const result = getPrintEndTime('23:30', 60);
      expect(result).toBe('00:30');
    });
  });

  describe('formatAppointmentTypeForPrint', () => {
    it('should format appointment type correctly', () => {
      const result = formatAppointmentTypeForPrint('doctor_on_call');
      expect(result).toBe('Doctor On Call');
    });

    it('should handle lab test type', () => {
      const result = formatAppointmentTypeForPrint('lab_test');
      expect(result).toBe('Lab Test');
    });
  });

  describe('getAppointmentTypePrintClass', () => {
    it('should return correct CSS class for doctor on call', () => {
      const result = getAppointmentTypePrintClass('doctor_on_call');
      expect(result).toBe('print-type-doctor');
    });

    it('should return default class for unknown type', () => {
      const result = getAppointmentTypePrintClass('unknown_type');
      expect(result).toBe('print-type-default');
    });
  });

  describe('formatPatientAddressForPrint', () => {
    it('should format complete address', () => {
      const result = formatPatientAddressForPrint(mockPatient);
      expect(result).toBe('Villa 123, Al Wasl Road, Jumeirah, Dubai');
    });

    it('should handle missing address parts', () => {
      const incompletePatient = { ...mockPatient, area: '', city: '' };
      const result = formatPatientAddressForPrint(incompletePatient);
      expect(result).toBe('Villa 123, Al Wasl Road');
    });
  });

  describe('formatStaffNameForPrint', () => {
    it('should format staff name correctly', () => {
      const result = formatStaffNameForPrint(mockStaff);
      expect(result).toBe('Dr. Ahmed Hassan');
    });
  });

  describe('formatStaffTypeForPrint', () => {
    it('should format staff type correctly', () => {
      const result = formatStaffTypeForPrint('lab_technician');
      expect(result).toBe('Lab Technician');
    });
  });

  describe('formatTransportationForPrint', () => {
    it('should format driver transportation', () => {
      const result = formatTransportationForPrint(mockAppointment, mockDriver);
      expect(result).toBe('Driver: Mohammed Ali');
    });

    it('should format self transport', () => {
      const selfTransportAppointment = {
        ...mockAppointment,
        transportation_type: 'self_transport' as const,
        transportation_method: 'Taxi',
      };
      const result = formatTransportationForPrint(selfTransportAppointment);
      expect(result).toBe('Self-transport: Taxi');
    });

    it('should handle no transportation', () => {
      const noTransportAppointment = {
        ...mockAppointment,
        transportation_type: 'self_transport' as const,
        transportation_method: null,
      };
      const result = formatTransportationForPrint(noTransportAppointment);
      expect(result).toBe('Transportation not specified');
    });
  });

  describe('formatCustomFieldsForPrint', () => {
    it('should format doctor on call fields', () => {
      const customFields = {
        chiefComplaint: 'Chest pain',
        primaryDoctor: 'Dr. Ahmed',
      };
      const result = formatCustomFieldsForPrint(customFields);
      expect(result).toEqual([
        { label: 'Chief Complaint', value: 'Chest pain' },
      ]);
    });

    it('should format lab test fields', () => {
      const customFields = {
        testList: 'Blood sugar, Cholesterol',
        labName: 'AVM',
        sampleTypes: ['Blood', 'Urine'],
        fastingRequired: true,
      };
      const result = formatCustomFieldsForPrint(customFields);
      expect(result).toEqual([
        { label: 'Tests', value: 'Blood sugar, Cholesterol' },
        { label: 'Lab', value: 'AVM' },
        { label: 'Sample Types', value: 'Blood, Urine' },
        { label: 'Fasting Required', value: 'Yes' },
      ]);
    });

    it('should handle empty custom fields', () => {
      const result = formatCustomFieldsForPrint(null);
      expect(result).toEqual([]);
    });
  });

  describe('generateAppointmentPrintSummary', () => {
    it('should generate complete appointment summary', () => {
      const result = generateAppointmentPrintSummary(
        mockAppointment,
        mockPatient,
        [mockStaff],
        mockDriver
      );

      expect(result.id).toBe('appointment-1');
      expect(result.date).toBe('15/01/2024');
      expect(result.time).toBe('10:00');
      expect(result.endTime).toBe('11:00');
      expect(result.duration).toBe('60 minutes');
      expect(result.type).toBe('Doctor On Call');
      expect(result.typeClass).toBe('print-type-doctor');
      expect(result.patient.name).toBe('John Doe');
      expect(result.patient.phone).toBe('+971501234567');
      expect(result.patient.address).toBe('Villa 123, Al Wasl Road, Jumeirah, Dubai');
      expect(result.staff).toHaveLength(1);
      expect(result.staff[0].name).toBe('Dr. Ahmed Hassan');
      expect(result.transportation).toBe('Driver: Mohammed Ali');
      expect(result.customFields).toHaveLength(1);
      expect(result.customFields[0].label).toBe('Chief Complaint');
      expect(result.notes).toBe('Patient prefers morning appointments');
    });
  });

  describe('generateAgendaPrintData', () => {
    it('should generate complete agenda data', () => {
      const appointments = [{
        appointment: mockAppointment,
        patient: mockPatient,
        staff: [mockStaff],
        driver: mockDriver,
      }];
      const date = new Date('2024-01-15');

      const result = generateAgendaPrintData(mockStaff, appointments, date);

      expect(result.staff.name).toBe('Dr. Ahmed Hassan');
      expect(result.staff.type).toBe('Doctor');
      expect(result.staff.phone).toBe('+971501234569');
      expect(result.staff.email).toBe('ahmed@medicare.com');
      expect(result.date).toBe('15/01/2024');
      expect(result.appointments).toHaveLength(1);
      expect(result.totalAppointments).toBe(1);
    });
  });

  describe('printUtils', () => {
    describe('getAgendaPrintUrl', () => {
      it('should generate correct agenda print URL', () => {
        const result = printUtils.getAgendaPrintUrl('staff-1', '2024-01-15');
        expect(result).toBe('/print/agenda/staff-1/2024-01-15');
      });
    });

    describe('getAppointmentPrintUrl', () => {
      it('should generate correct appointment print URL', () => {
        const result = printUtils.getAppointmentPrintUrl('appointment-1');
        expect(result).toBe('/print/appointment/appointment-1');
      });
    });

    describe('printPage', () => {
      it('should call window.print', () => {
        const mockPrint = jest.fn();
        Object.defineProperty(window, 'print', {
          value: mockPrint,
          writable: true,
        });

        printUtils.printPage();
        expect(mockPrint).toHaveBeenCalled();
      });
    });

    describe('printElement', () => {
      beforeEach(() => {
        document.body.innerHTML = '<div id="test-element">Test content</div>';
      });

      afterEach(() => {
        document.body.innerHTML = '';
      });

      it('should handle missing element', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        printUtils.printElement('non-existent');
        
        expect(consoleSpy).toHaveBeenCalledWith('Element with id "non-existent" not found');
        consoleSpy.mockRestore();
      });

      it('should open print window for existing element', () => {
        const mockOpen = jest.fn().mockReturnValue({
          document: {
            write: jest.fn(),
            close: jest.fn(),
          },
          focus: jest.fn(),
          print: jest.fn(),
          close: jest.fn(),
        });
        Object.defineProperty(window, 'open', {
          value: mockOpen,
          writable: true,
        });

        printUtils.printElement('test-element');
        
        expect(mockOpen).toHaveBeenCalledWith('', '_blank');
      });
    });
  });
});
