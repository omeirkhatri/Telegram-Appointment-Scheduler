import { patientService } from './patientService';
import type { CreatePatient, Patient } from '@/types';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('PatientService', () => {
  const mockPatient: Patient = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    phone: '+971501234567',
    flat_villa_no: 'Villa 123',
    building_street: 'Sheikh Zayed Road',
    area: 'Downtown',
    city: 'Dubai',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockCreatePatient: CreatePatient = {
    name: 'John Doe',
    phone: '+971501234567',
    flat_villa_no: 'Villa 123',
    building_street: 'Sheikh Zayed Road',
    area: 'Downtown',
    city: 'Dubai',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPatients', () => {
    it('should fetch all patients without filters', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockPatient], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await patientService.getPatients();

      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual([mockPatient]);
    });

    it('should apply filters when provided', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [mockPatient], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters = {
        name: 'John',
        area: 'Downtown',
      };

      await patientService.getPatients(filters);

      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%John%');
      expect(mockQuery.eq).toHaveBeenCalledWith('area', 'Downtown');
    });
  });

  describe('getPatient', () => {
    it('should fetch a single patient by ID', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPatient, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await patientService.getPatient('123');

      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '123');
      expect(result).toEqual(mockPatient);
    });

    it('should return null when patient not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await patientService.getPatient('123');

      expect(result).toBeNull();
    });
  });

  describe('createPatient', () => {
    it('should create a new patient', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPatient, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await patientService.createPatient(mockCreatePatient);

      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
      expect(mockQuery.insert).toHaveBeenCalledWith(mockCreatePatient);
      expect(mockQuery.select).toHaveBeenCalled();
      expect(result).toEqual(mockPatient);
    });
  });

  describe('updatePatient', () => {
    it('should update an existing patient', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPatient, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const updates = { name: 'Jane Doe' };
      const result = await patientService.updatePatient('123', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
      expect(mockQuery.update).toHaveBeenCalledWith(updates);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '123');
      expect(result).toEqual(mockPatient);
    });
  });

  describe('deletePatient', () => {
    it('should delete a patient', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      await patientService.deletePatient('123');

      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '123');
    });
  });

  describe('searchPatients', () => {
    it('should search patients by name or phone', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockPatient], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await patientService.searchPatients('John');

      expect(mockSupabase.from).toHaveBeenCalledWith('patients');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%John%,phone.ilike.%John%');
      expect(result).toEqual([mockPatient]);
    });
  });
});
