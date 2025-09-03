import type { CreateAuditDetailRequest, CreateAuditTrailRequest, UpdateAuditTrailRequest } from '@/types/auditTrail';
import { AuditTrailService } from './auditTrailService';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(),
          })),
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(),
          })),
        })),
        single: jest.fn(),
      })),
    })),
  },
}));

describe('AuditTrailService', () => {
  let auditTrailService: AuditTrailService;

  beforeEach(() => {
    auditTrailService = new AuditTrailService();
    jest.clearAllMocks();
  });

  describe('createAuditTrail', () => {
    it('should create audit trail successfully', async () => {
      const mockRequest: CreateAuditTrailRequest = {
        operation_id: 'test-operation-1',
        operation_type: 'single_copy',
        source_appointment_id: 'appointment-1',
        user_id: 'user-1',
        staff_assignments: [
          { staff_id: 'staff-1', role: 'primary', is_primary: true },
        ],
        override_conflicts: false,
        metadata: { test: 'data' },
        notes: 'Test operation',
      };

      const mockResponse = { id: 'audit-trail-1' };

      // Mock the Supabase chain
      const mockSingle = jest.fn().mockResolvedValue({ data: mockResponse, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({ insert: mockInsert });

      const result = await auditTrailService.createAuditTrail(mockRequest);

      expect(result.success).toBe(true);
      expect(result.audit_trail_id).toBe('audit-trail-1');
      expect(mockInsert).toHaveBeenCalledWith({
        operation_id: 'test-operation-1',
        operation_type: 'single_copy',
        source_appointment_id: 'appointment-1',
        user_id: 'user-1',
        copy_config: {},
        staff_assignments: [
          { staff_id: 'staff-1', role: 'primary', is_primary: true },
        ],
        override_conflicts: false,
        metadata: { test: 'data' },
        notes: 'Test operation',
        operation_status: 'pending',
        total_requested: 0,
        total_created: 0,
        total_conflicts: 0,
        total_errors: 0,
        created_appointment_ids: [],
        conflict_details: [],
        error_details: [],
      });
    });

    it('should handle creation errors', async () => {
      const mockRequest: CreateAuditTrailRequest = {
        operation_id: 'test-operation-1',
        operation_type: 'single_copy',
        source_appointment_id: 'appointment-1',
      };

      const mockError = { message: 'Database error' };
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({ insert: mockInsert });

      const result = await auditTrailService.createAuditTrail(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.audit_trail_id).toBe('');
    });
  });

  describe('updateAuditTrail', () => {
    it('should update audit trail successfully', async () => {
      const mockRequest: UpdateAuditTrailRequest = {
        operation_status: 'completed',
        total_created: 1,
        completed_at: '2024-01-01T12:00:00Z',
        duration_ms: 5000,
      };

      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({ update: mockUpdate });

      const result = await auditTrailService.updateAuditTrail('audit-trail-1', mockRequest);

      expect(result.success).toBe(true);
      expect(result.audit_trail_id).toBe('audit-trail-1');
      expect(mockUpdate).toHaveBeenCalledWith({
        operation_status: 'completed',
        total_created: 1,
        completed_at: '2024-01-01T12:00:00Z',
        duration_ms: 5000,
        updated_at: expect.any(String),
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'audit-trail-1');
    });

    it('should handle update errors', async () => {
      const mockRequest: UpdateAuditTrailRequest = {
        operation_status: 'failed',
      };

      const mockError = { message: 'Update failed' };
      const mockEq = jest.fn().mockResolvedValue({ error: mockError });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({ update: mockUpdate });

      const result = await auditTrailService.updateAuditTrail('audit-trail-1', mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('createAuditDetail', () => {
    it('should create audit detail successfully', async () => {
      const mockRequest: CreateAuditDetailRequest = {
        audit_trail_id: 'audit-trail-1',
        target_appointment_id: 'appointment-2',
        target_date: '2024-01-02',
        target_time: '10:00',
        operation_status: 'completed',
        conflict_detected: false,
        error_occurred: false,
        assigned_staff: [
          { staff_id: 'staff-1', role: 'primary', is_primary: true },
        ],
      };

      const mockResponse = { id: 'audit-detail-1' };
      const mockSingle = jest.fn().mockResolvedValue({ data: mockResponse, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({ insert: mockInsert });

      const result = await auditTrailService.createAuditDetail(mockRequest);

      expect(result.success).toBe(true);
      expect(result.audit_trail_id).toBe('audit-trail-1');
    });
  });

  describe('generateOperationId', () => {
    it('should generate unique operation IDs', () => {
      const id1 = auditTrailService.generateOperationId();
      const id2 = auditTrailService.generateOperationId();

      expect(id1).toMatch(/^copy_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^copy_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
      const startTime = '2024-01-01T10:00:00Z';
      const endTime = '2024-01-01T10:05:30Z'; // 5 minutes 30 seconds

      const duration = auditTrailService.calculateDuration(startTime, endTime);

      expect(duration).toBe(330000); // 5.5 minutes in milliseconds
    });

    it('should return 0 for missing end time', () => {
      const startTime = '2024-01-01T10:00:00Z';

      const duration = auditTrailService.calculateDuration(startTime);

      expect(duration).toBe(0);
    });
  });

  describe('logCopyOperationStart', () => {
    it('should log copy operation start successfully', async () => {
      const mockResponse = { id: 'audit-trail-1' };
      const mockSingle = jest.fn().mockResolvedValue({ data: mockResponse, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({ insert: mockInsert });

      const auditTrailId = await auditTrailService.logCopyOperationStart(
        'single_copy',
        'appointment-1',
        {
          user_id: 'user-1',
          staff_assignments: [
            { staff_id: 'staff-1', role: 'primary', is_primary: true },
          ],
          override_conflicts: false,
          metadata: { test: 'data' },
          notes: 'Test operation',
        },
      );

      expect(auditTrailId).toBe('audit-trail-1');
    });

    it('should throw error on failure', async () => {
      const mockError = { message: 'Database error' };
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({ insert: mockInsert });

      await expect(
        auditTrailService.logCopyOperationStart('single_copy', 'appointment-1'),
      ).rejects.toThrow('Failed to create audit trail: Database error');
    });
  });

  describe('logCopyOperationComplete', () => {
    it('should log copy operation completion successfully', async () => {
      const mockAuditTrail = {
        id: 'audit-trail-1',
        started_at: '2024-01-01T10:00:00Z',
      };

      // Mock getAuditTrailById
      const mockSingle = jest.fn().mockResolvedValue({ data: mockAuditTrail, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });

      // Mock updateAuditTrail
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ single: mockSingle }),
          }),
        }) // For getAuditTrailById
        .mockReturnValueOnce({ update: mockUpdate }); // For updateAuditTrail

      await auditTrailService.logCopyOperationComplete('audit-trail-1', {
        total_requested: 1,
        total_created: 1,
        total_conflicts: 0,
        total_errors: 0,
        created_appointment_ids: ['appointment-2'],
        conflict_details: [],
        error_details: [],
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_status: 'completed',
          total_requested: 1,
          total_created: 1,
          total_conflicts: 0,
          total_errors: 0,
          created_appointment_ids: ['appointment-2'],
          conflict_details: [],
          error_details: [],
          completed_at: expect.any(String),
          duration_ms: expect.any(Number),
          updated_at: expect.any(String),
        }),
      );
    });
  });
});
