import { patientService } from '@/services/patientService';
import { NextRequest } from 'next/server';
import { DELETE, GET, PUT } from './route';

// Mock the services
jest.mock('@/services/patientService');

const mockPatientService = patientService as jest.Mocked<typeof patientService>;

describe('Patient Individual Resource API Route', () => {
  const mockPatient = {
    id: '1',
    name: 'John Doe',
    phone: '+971501234567',
    flat_villa_no: '123',
    building_street: 'Main St',
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

  describe('GET /api/patients/[id]', () => {
    it('should return patient by ID', async () => {
      mockPatientService.getPatient.mockResolvedValue(mockPatient);

      const request = new NextRequest('http://localhost:3000/api/patients/1');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPatient);
      expect(mockPatientService.getPatient).toHaveBeenCalledWith('1');
    });

    it('should return 404 when patient not found', async () => {
      mockPatientService.getPatient.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/patients/nonexistent');
      const response = await GET(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Patient not found');
    });

    it('should handle service errors', async () => {
      mockPatientService.getPatient.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/patients/1');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle invalid patient ID gracefully', async () => {
      mockPatientService.getPatient.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/patients/invalid-id');
      const response = await GET(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Patient not found');
    });
  });

  describe('PUT /api/patients/[id]', () => {
    it('should update patient successfully', async () => {
      const updatedPatient = {
        ...mockPatient,
        name: 'John Smith',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockPatientService.updatePatient.mockResolvedValue(updatedPatient);

      const formData = new FormData();
      formData.append('name', 'John Smith');
      formData.append('phone', '+971501234567');
      formData.append('flat_villa_no', '123');
      formData.append('building_street', 'Main St');
      formData.append('area', 'Dubai Marina');
      formData.append('city', 'Dubai');

      const request = new NextRequest('http://localhost:3000/api/patients/1', {
        method: 'PUT',
        body: formData,
      });

      const response = await PUT(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedPatient);
      expect(mockPatientService.updatePatient).toHaveBeenCalledWith('1', {
        name: 'John Smith',
        phone: '+971501234567',
        flat_villa_no: '123',
        building_street: 'Main St',
        area: 'Dubai Marina',
        city: 'Dubai',
      });
    });

    it('should return 404 when updating non-existent patient', async () => {
      mockPatientService.getPatient.mockResolvedValue(null);

      const formData = new FormData();
      formData.append('name', 'John Smith');

      const request = new NextRequest('http://localhost:3000/api/patients/nonexistent', {
        method: 'PUT',
        body: formData,
      });

      const response = await PUT(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Patient not found');
    });

    it('should handle validation errors', async () => {
      const formData = new FormData();
      formData.append('name', ''); // Invalid: empty name
      formData.append('phone', ''); // Invalid: empty phone

      const request = new NextRequest('http://localhost:3000/api/patients/1', {
        method: 'PUT',
        body: formData,
      });

      const response = await PUT(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Name cannot be empty');
    });

    it('should handle service errors', async () => {
      mockPatientService.updatePatient.mockRejectedValue(new Error('Database connection failed'));

      const formData = new FormData();
      formData.append('name', 'John Smith');

      const request = new NextRequest('http://localhost:3000/api/patients/1', {
        method: 'PUT',
        body: formData,
      });

      const response = await PUT(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('DELETE /api/patients/[id]', () => {
    it('should delete patient successfully', async () => {
      mockPatientService.getPatient.mockResolvedValue(mockPatient);
      mockPatientService.deletePatient.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/patients/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Patient deleted successfully');
      expect(mockPatientService.deletePatient).toHaveBeenCalledWith('1');
    });

    it('should return 404 when deleting non-existent patient', async () => {
      mockPatientService.getPatient.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/patients/nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Patient not found');
    });

    it('should handle service errors', async () => {
      mockPatientService.getPatient.mockResolvedValue(mockPatient);
      mockPatientService.deletePatient.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/patients/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle patient with existing appointments', async () => {
      mockPatientService.getPatient.mockResolvedValue(mockPatient);
      mockPatientService.deletePatient.mockRejectedValue(new Error('Cannot delete patient with existing appointments'));

      const request = new NextRequest('http://localhost:3000/api/patients/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot delete patient with existing appointments');
    });
  });
});
