import { POST } from './route';
import { NextRequest } from 'next/server';
import type { BulkCopyRequest } from '@/types/bulkCopy';

// Mock the services
jest.mock('@/services', () => ({
  appointmentService: {
    getAppointment: jest.fn(),
    createAppointment: jest.fn(),
    assignStaffToAppointment: jest.fn(),
    getAppointments: jest.fn(),
  },
  staffService: {
    getStaff: jest.fn(),
  },
}));

// Mock the utilities
jest.mock('@/lib/copyConflictResolution', () => ({
  checkCopyConflicts: jest.fn(),
}));

jest.mock('@/lib/validations/appointment', () => ({
  validateAppointmentData: jest.fn(),
}));

jest.mock('@/lib/bulkCopyUtils', () => ({
  generateBulkCopyDates: jest.fn(),
  validateBulkCopyConfig: jest.fn(),
}));

jest.mock('@/utils/deepClone', () => ({
  deepClone: jest.fn((obj) => ({ ...obj })),
}));

import { appointmentService, staffService } from '@/services';
import { checkCopyConflicts } from '@/lib/copyConflictResolution';
import { validateAppointmentData } from '@/lib/validations/appointment';
import { generateBulkCopyDates, validateBulkCopyConfig } from '@/lib/bulkCopyUtils';

describe('/api/appointments/[id]/bulk-copy', () => {
  const mockAppointment = {
    id: 'appointment-1',
    patient_id: 'patient-1',
    appointment_type: 'doctor_on_call',
    appointment_date: '2024-01-01',
    start_time: '10:00',
    duration_minutes: 60,
    status: 'scheduled',
    custom_fields: { chief_complaint: 'Test complaint' },
    transportation_type: 'driver',
    transportation_method: 'Company car',
    driver_id: 'driver-1',
    notes: 'Test notes',
    recurring_rule: null,
    google_event_ids: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockStaff = [
    { id: 'staff-1', first_name: 'John', last_name: 'Doe', staff_type: 'doctor' },
    { id: 'staff-2', first_name: 'Jane', last_name: 'Smith', staff_type: 'nurse' },
  ];

  const mockRequest = (body: BulkCopyRequest) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    (appointmentService.getAppointment as jest.Mock).mockResolvedValue(mockAppointment);
    (staffService.getStaff as jest.Mock).mockResolvedValue(mockStaff);
    (appointmentService.getAppointments as jest.Mock).mockResolvedValue([]);
    (validateBulkCopyConfig as jest.Mock).mockReturnValue([]);
    (generateBulkCopyDates as jest.Mock).mockReturnValue(['2024-01-02', '2024-01-03']);
    (checkCopyConflicts as jest.Mock).mockResolvedValue({
      hasConflicts: false,
      conflicts: [],
      canProceed: true,
      requiresOverride: false,
      overrideOptions: [],
    });
    (validateAppointmentData as jest.Mock).mockReturnValue([]);
  });

  describe('POST', () => {
    it('should successfully perform bulk copy', async () => {
      const createdAppointment = { ...mockAppointment, id: 'new-appointment-1' };
      (appointmentService.createAppointment as jest.Mock).mockResolvedValue(createdAppointment);

      const requestBody: BulkCopyRequest = {
        sourceAppointmentId: 'appointment-1',
        config: {
          pattern: 'daily',
          interval: 1,
          occurrences: 2,
          startDate: '2024-01-01',
        },
        staffAssignments: [
          { staff_id: 'staff-1', role: 'primary', is_primary: true },
        ],
        overrideConflicts: false,
      };

      const request = mockRequest(requestBody);
      const response = await POST(request, { params: { id: 'appointment-1' } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.totalCreated).toBe(2);
      expect(result.data.totalRequested).toBe(2);
      expect(appointmentService.createAppointment).toHaveBeenCalledTimes(2);
    });

    it('should handle validation errors', async () => {
      (validateBulkCopyConfig as jest.Mock).mockReturnValue(['Invalid configuration']);

      const requestBody: BulkCopyRequest = {
        sourceAppointmentId: 'appointment-1',
        config: {
          pattern: 'daily',
          interval: 0, // Invalid interval
          occurrences: 2,
          startDate: '2024-01-01',
        },
        overrideConflicts: false,
      };

      const request = mockRequest(requestBody);
      const response = await POST(request, { params: { id: 'appointment-1' } });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid bulk copy configuration');
      expect(result.details).toContain('Invalid configuration');
    });

    it('should handle source appointment not found', async () => {
      (appointmentService.getAppointment as jest.Mock).mockResolvedValue(null);

      const requestBody: BulkCopyRequest = {
        sourceAppointmentId: 'nonexistent',
        config: {
          pattern: 'daily',
          interval: 1,
          occurrences: 2,
          startDate: '2024-01-01',
        },
        overrideConflicts: false,
      };

      const request = mockRequest(requestBody);
      const response = await POST(request, { params: { id: 'nonexistent' } });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Source appointment not found');
    });

    it('should handle conflicts when override is false', async () => {
      (checkCopyConflicts as jest.Mock).mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ description: 'Staff unavailable' }],
        canProceed: false,
        requiresOverride: true,
        overrideOptions: [],
      });

      const requestBody: BulkCopyRequest = {
        sourceAppointmentId: 'appointment-1',
        config: {
          pattern: 'daily',
          interval: 1,
          occurrences: 2,
          startDate: '2024-01-01',
        },
        overrideConflicts: false,
      };

      const request = mockRequest(requestBody);
      const response = await POST(request, { params: { id: 'appointment-1' } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.totalConflicts).toBe(2);
      expect(result.data.totalCreated).toBe(0);
    });

    it('should handle appointment creation errors', async () => {
      (appointmentService.createAppointment as jest.Mock).mockRejectedValue(new Error('Database error'));

      const requestBody: BulkCopyRequest = {
        sourceAppointmentId: 'appointment-1',
        config: {
          pattern: 'daily',
          interval: 1,
          occurrences: 2,
          startDate: '2024-01-01',
        },
        overrideConflicts: false,
      };

      const request = mockRequest(requestBody);
      const response = await POST(request, { params: { id: 'appointment-1' } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.totalErrors).toBe(2);
      expect(result.data.totalCreated).toBe(0);
    });

    it('should handle staff assignment errors gracefully', async () => {
      const createdAppointment = { ...mockAppointment, id: 'new-appointment-1' };
      (appointmentService.createAppointment as jest.Mock).mockResolvedValue(createdAppointment);
      (appointmentService.assignStaffToAppointment as jest.Mock).mockRejectedValue(new Error('Staff assignment failed'));

      const requestBody: BulkCopyRequest = {
        sourceAppointmentId: 'appointment-1',
        config: {
          pattern: 'daily',
          interval: 1,
          occurrences: 1,
          startDate: '2024-01-01',
        },
        staffAssignments: [
          { staff_id: 'staff-1', role: 'primary', is_primary: true },
        ],
        overrideConflicts: false,
      };

      const request = mockRequest(requestBody);
      const response = await POST(request, { params: { id: 'appointment-1' } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.totalCreated).toBe(1);
      // Staff assignment errors should not prevent appointment creation
    });

    it('should handle no valid dates generated', async () => {
      (generateBulkCopyDates as jest.Mock).mockReturnValue([]);

      const requestBody: BulkCopyRequest = {
        sourceAppointmentId: 'appointment-1',
        config: {
          pattern: 'daily',
          interval: 1,
          occurrences: 0,
          startDate: '2024-01-01',
        },
        overrideConflicts: false,
      };

      const request = mockRequest(requestBody);
      const response = await POST(request, { params: { id: 'appointment-1' } });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No valid dates generated for bulk copy');
    });
  });
});
