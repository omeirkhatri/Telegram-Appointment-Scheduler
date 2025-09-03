import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/types';
import { AppointmentService } from './appointmentService';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                single: jest.fn(),
              })),
            })),
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('AppointmentService - External Edit Tracking', () => {
  let appointmentService: AppointmentService;
  let mockAppointment: Appointment;

  beforeEach(() => {
    appointmentService = new AppointmentService();
    mockAppointment = {
      id: 'test-appointment-1',
      patient_id: 'patient-1',
      appointment_type: 'doctor_on_call',
      appointment_date: '2024-01-15',
      start_time: '10:00',
      duration_minutes: 60,
      status: 'scheduled',
      custom_fields: {},
      google_event_ids: {},
      external_edit_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('trackExternalEdit', () => {
    it('should track external edit and increment count', async () => {
      const mockUpdatedAppointment = {
        ...mockAppointment,
        external_edit_count: 1,
        last_external_edit: '2024-01-15T12:00:00Z',
        last_external_edit_source: 'google_calendar',
        last_edit_source: 'google_calendar',
      };

      // Mock getAppointment
      const mockGetAppointment = jest.spyOn(appointmentService, 'getAppointment');
      mockGetAppointment.mockResolvedValue(mockAppointment);

      // Mock update query
      const mockUpdate = {
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockUpdatedAppointment,
              error: null,
            }),
          })),
        })),
      };

      const mockFrom = jest.fn(() => ({
        update: jest.fn().mockReturnValue(mockUpdate),
      }));

      mockSupabase.from.mockReturnValue(mockFrom() as any);

      const result = await appointmentService.trackExternalEdit(
        'test-appointment-1',
        'google_calendar',
        { notes: 'Updated from Google Calendar' }
      );

      expect(result).toEqual(mockUpdatedAppointment);
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments');
      expect(mockUpdate.eq).toHaveBeenCalledWith('id', 'test-appointment-1');
    });

    it('should throw error when appointment not found', async () => {
      const mockGetAppointment = jest.spyOn(appointmentService, 'getAppointment');
      mockGetAppointment.mockResolvedValue(null);

      await expect(
        appointmentService.trackExternalEdit('non-existent-id', 'google_calendar')
      ).rejects.toThrow('Appointment not found');
    });

    it('should handle database error', async () => {
      const mockGetAppointment = jest.spyOn(appointmentService, 'getAppointment');
      mockGetAppointment.mockResolvedValue(mockAppointment);

      const mockUpdate = {
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          })),
        })),
      };

      const mockFrom = jest.fn(() => ({
        update: jest.fn().mockReturnValue(mockUpdate),
      }));

      mockSupabase.from.mockReturnValue(mockFrom() as any);

      await expect(
        appointmentService.trackExternalEdit('test-appointment-1', 'google_calendar')
      ).rejects.toThrow('Failed to track external edit: Database error');
    });
  });

  describe('trackInternalEdit', () => {
    it('should track internal edit', async () => {
      const mockUpdatedAppointment = {
        ...mockAppointment,
        last_edit_source: 'app',
      };

      const mockUpdate = {
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockUpdatedAppointment,
              error: null,
            }),
          })),
        })),
      };

      const mockFrom = jest.fn(() => ({
        update: jest.fn().mockReturnValue(mockUpdate),
      }));

      mockSupabase.from.mockReturnValue(mockFrom() as any);

      const result = await appointmentService.trackInternalEdit(
        'test-appointment-1',
        { notes: 'Updated from app' }
      );

      expect(result).toEqual(mockUpdatedAppointment);
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments');
    });
  });

  describe('getAppointmentsWithExternalEdits', () => {
    it('should return appointments with external edits', async () => {
      const mockAppointments = [
        {
          ...mockAppointment,
          external_edit_count: 2,
          last_external_edit: '2024-01-15T10:00:00Z',
        },
        {
          ...mockAppointment,
          id: 'test-appointment-2',
          external_edit_count: 1,
          last_external_edit: '2024-01-15T11:00:00Z',
        },
      ];

      const mockQuery = {
        gt: jest.fn(() => ({
          order: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn().mockResolvedValue({
                  data: mockAppointments,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      const mockFrom = jest.fn(() => ({
        select: jest.fn().mockReturnValue(mockQuery),
      }));

      mockSupabase.from.mockReturnValue(mockFrom() as any);

      const result = await appointmentService.getAppointmentsWithExternalEdits();

      expect(result).toEqual(mockAppointments);
      expect(mockQuery.gt).toHaveBeenCalledWith('external_edit_count', 0);
    });

    it('should apply filters correctly', async () => {
      const mockQuery = {
        gt: jest.fn(() => ({
          order: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      const mockFrom = jest.fn(() => ({
        select: jest.fn().mockReturnValue(mockQuery),
      }));

      mockSupabase.from.mockReturnValue(mockFrom() as any);

      await appointmentService.getAppointmentsWithExternalEdits({
        appointment_type: 'doctor_on_call',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });

      expect(mockQuery.gt).toHaveBeenCalledWith('external_edit_count', 0);
    });
  });

  describe('getExternalEditStatistics', () => {
    it('should return external edit statistics', async () => {
      const mockData = [
        {
          external_edit_count: 2,
          last_external_edit_source: 'google_calendar',
          last_external_edit: '2024-01-15T10:00:00Z',
        },
        {
          external_edit_count: 1,
          last_external_edit_source: 'webhook',
          last_external_edit: '2024-01-15T11:00:00Z',
        },
        {
          external_edit_count: 0,
          last_external_edit_source: null,
          last_external_edit: null,
        },
      ];

      const mockQuery = {
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          })),
        })),
      };

      const mockFrom = jest.fn(() => mockQuery);

      mockSupabase.from.mockReturnValue(mockFrom() as any);

      // Mock Date.now() to return a fixed timestamp
      const mockDate = new Date('2024-01-15T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await appointmentService.getExternalEditStatistics();

      expect(result).toEqual({
        totalExternalEdits: 3,
        bySource: {
          app: 0,
          google_calendar: 1,
          webhook: 1,
          manual: 0,
        },
        recentExternalEdits: 2, // Both edits are within 24 hours
      });

      jest.restoreAllMocks();
    });

    it('should handle date range filters', async () => {
      const mockQuery = {
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          })),
        })),
      };

      const mockFrom = jest.fn(() => mockQuery);

      mockSupabase.from.mockReturnValue(mockFrom() as any);

      await appointmentService.getExternalEditStatistics('2024-01-01', '2024-01-31');

      expect(mockQuery.gte).toHaveBeenCalledWith('appointment_date', '2024-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('appointment_date', '2024-01-31');
    });
  });
});
