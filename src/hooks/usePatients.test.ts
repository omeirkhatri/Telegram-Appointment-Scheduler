import type { CreatePatient, Patient, UpdatePatient } from '@/types';
import { act, renderHook } from '@testing-library/react';
import { usePatients } from './usePatients';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('usePatients', () => {
  const mockPatient: Patient = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePatients());

      expect(result.current.patients).toEqual([]);
      expect(result.current.patient).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.totalCount).toBe(0);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(20);
      expect(result.current.filters).toEqual({});
      expect(result.current.searchTerm).toBe('');
    });

    it('should initialize with custom options', () => {
      const initialFilters = { city: 'Dubai' };
      const { result } = renderHook(() => usePatients({
        initialFilters,
        autoFetch: false
      }));

      expect(result.current.filters).toEqual(initialFilters);
    });
  });

  describe('fetchPatients', () => {
    it('should fetch patients successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockPatient],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      await act(async () => {
        await result.current.fetchPatients();
      });

      expect(result.current.patients).toEqual([mockPatient]);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Failed to fetch patients',
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      await act(async () => {
        await result.current.fetchPatients();
      });

      expect(result.current.error).toBe('Failed to fetch patients');
      expect(result.current.isLoading).toBe(false);
    });

    it('should apply filters when fetching', async () => {
      const mockResponse = {
        success: true,
        data: [mockPatient],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      const filters = { city: 'Dubai', area: 'Dubai Marina' };

      await act(async () => {
        await result.current.fetchPatients(filters);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('city=Dubai&area=Dubai%20Marina')
      );
    });
  });

  describe('fetchPatient', () => {
    it('should fetch single patient successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockPatient,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      await act(async () => {
        await result.current.fetchPatient('1');
      });

      expect(result.current.patient).toEqual(mockPatient);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch single patient errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Patient not found',
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      await act(async () => {
        await result.current.fetchPatient('1');
      });

      expect(result.current.error).toBe('Patient not found');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('createPatient', () => {
    it('should create patient successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockPatient,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      const newPatient: CreatePatient = {
        name: 'John Doe',
        phone: '+971501234567',
        flat_villa_no: 'Villa 123',
        building_street: 'Sheikh Zayed Road',
        area: 'Dubai Marina',
        city: 'Dubai',
      };

      let createdPatient: Patient;
      await act(async () => {
        createdPatient = await result.current.createPatient(newPatient);
      });

      expect(createdPatient!).toEqual(mockPatient);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle create patient errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Validation failed',
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      const newPatient: CreatePatient = {
        name: '',
        phone: '+971501234567',
        flat_villa_no: 'Villa 123',
        building_street: 'Sheikh Zayed Road',
        area: 'Dubai Marina',
        city: 'Dubai',
      };

      await act(async () => {
        try {
          await result.current.createPatient(newPatient);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Validation failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('updatePatient', () => {
    it('should update patient successfully', async () => {
      const updatedPatient = { ...mockPatient, name: 'Jane Doe' };
      const mockResponse = {
        success: true,
        data: updatedPatient,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      // Set initial patient
      act(() => {
        result.current.patient = mockPatient;
      });

      const updateData: UpdatePatient = {
        name: 'Jane Doe',
      };

      let updatedPatientResult: Patient;
      await act(async () => {
        updatedPatientResult = await result.current.updatePatient('1', updateData);
      });

      expect(updatedPatientResult!).toEqual(updatedPatient);
      expect(result.current.patient).toEqual(updatedPatient);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('deletePatient', () => {
    it('should delete patient successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Patient deleted successfully',
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      // Set initial data
      act(() => {
        result.current.patients = [mockPatient];
        result.current.patient = mockPatient;
      });

      await act(async () => {
        await result.current.deletePatient('1');
      });

      expect(result.current.patients).toEqual([]);
      expect(result.current.patient).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('searchPatients', () => {
    it('should search patients successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockPatient],
        count: 1,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      await act(async () => {
        await result.current.searchPatients('John');
      });

      expect(result.current.patients).toEqual([mockPatient]);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('filter management', () => {
    it('should update filters correctly', () => {
      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      const newFilters = { city: 'Dubai', area: 'Dubai Marina' };

      act(() => {
        result.current.setFilters(newFilters);
      });

      expect(result.current.filters).toEqual(newFilters);
      expect(result.current.currentPage).toBe(1); // Should reset to first page
    });

    it('should clear filters correctly', () => {
      const initialFilters = { city: 'Dubai' };
      const { result } = renderHook(() => usePatients({
        initialFilters,
        autoFetch: false
      }));

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual(initialFilters);
      expect(result.current.searchTerm).toBe('');
      expect(result.current.currentPage).toBe(1);
    });

    it('should update search term correctly', () => {
      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      act(() => {
        result.current.setSearchTerm('John Doe');
      });

      expect(result.current.searchTerm).toBe('John Doe');
      expect(result.current.currentPage).toBe(1); // Should reset to first page
    });
  });

  describe('pagination', () => {
    it('should update page correctly', () => {
      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      act(() => {
        result.current.setPage(2);
      });

      expect(result.current.currentPage).toBe(2);
    });

    it('should update page size correctly', () => {
      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      act(() => {
        result.current.setPageSize(50);
      });

      expect(result.current.pageSize).toBe(50);
      expect(result.current.currentPage).toBe(1); // Should reset to first page
    });
  });

  describe('state management', () => {
    it('should refresh data correctly', async () => {
      const mockResponse = {
        success: true,
        data: [mockPatient],
        total: 1,
      };

      mockFetch.mockResolvedValue({
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.patients).toEqual([mockPatient]);
      expect(result.current.totalCount).toBe(1);
    });

    it('should clear error correctly', () => {
      const { result } = renderHook(() => usePatients({ autoFetch: false }));

      // Set an error
      act(() => {
        result.current.error = 'Some error';
      });

      expect(result.current.error).toBe('Some error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
