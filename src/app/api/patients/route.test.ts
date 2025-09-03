import { patientService } from '@/services/patientService';
import { storageService } from '@/services/storage';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock the services
jest.mock('@/services/patientService');
jest.mock('@/services/storage');

const mockPatientService = patientService as jest.Mocked<typeof patientService>;
const mockStorageService = storageService as jest.Mocked<typeof storageService>;

describe('Patient API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/patients', () => {
    it('should return all patients without filters', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: '123',
          building_street: 'Main St',
          area: 'Dubai Marina',
          city: 'Dubai',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPatientService.getPatients.mockResolvedValue(mockPatients);

      const request = new NextRequest('http://localhost:3000/api/patients');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPatients);
      expect(mockPatientService.getPatients).toHaveBeenCalledWith({});
    });

    it('should return filtered patients', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: '123',
          building_street: 'Main St',
          area: 'Dubai Marina',
          city: 'Dubai',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPatientService.getPatients.mockResolvedValue(mockPatients);

      const request = new NextRequest(
        'http://localhost:3000/api/patients?name=John&area=Dubai%20Marina&has_id_document=true',
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPatients);
      expect(mockPatientService.getPatients).toHaveBeenCalledWith({
        name: 'John',
        area: 'Dubai Marina',
        has_id_document: true,
      });
    });

    it('should handle errors', async () => {
      mockPatientService.getPatients.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/patients');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/patients', () => {
    it('should create a patient without ID document', async () => {
      const mockPatient = {
        id: '1',
        name: 'John Doe',
        phone: '+971501234567',
        flat_villa_no: '123',
        building_street: 'Main St',
        area: 'Dubai Marina',
        city: 'Dubai',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockPatientService.createPatient.mockResolvedValue(mockPatient);

      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('phone', '+971501234567');
      formData.append('flat_villa_no', '123');
      formData.append('building_street', 'Main St');
      formData.append('area', 'Dubai Marina');
      formData.append('city', 'Dubai');

      const request = new NextRequest('http://localhost:3000/api/patients', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPatient);
      expect(mockPatientService.createPatient).toHaveBeenCalledWith({
        name: 'John Doe',
        phone: '+971501234567',
        flat_villa_no: '123',
        building_street: 'Main St',
        area: 'Dubai Marina',
        city: 'Dubai',
      });
    });

    it('should create a patient with ID document', async () => {
      const mockPatient = {
        id: '1',
        name: 'John Doe',
        phone: '+971501234567',
        flat_villa_no: '123',
        building_street: 'Main St',
        area: 'Dubai Marina',
        city: 'Dubai',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockUpdatedPatient = {
        ...mockPatient,
        id_document_url: 'id-documents/1_1234567890_uuid.pdf',
        id_document_filename: 'passport.pdf',
      };

      mockPatientService.createPatient.mockResolvedValue(mockPatient);
      mockPatientService.updatePatient.mockResolvedValue(mockUpdatedPatient);
      mockPatientService.getPatient.mockResolvedValue(mockUpdatedPatient);
      mockStorageService.uploadPatientDocument.mockResolvedValue({
        success: true,
        filePath: 'id-documents/1_1234567890_uuid.pdf',
        fileId: '1_1234567890_uuid.pdf',
      });

      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('phone', '+971501234567');
      formData.append('flat_villa_no', '123');
      formData.append('building_street', 'Main St');
      formData.append('area', 'Dubai Marina');
      formData.append('city', 'Dubai');

      const file = new File(['test'], 'passport.pdf', { type: 'application/pdf' });
      formData.append('id_document', file);

      const request = new NextRequest('http://localhost:3000/api/patients', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUpdatedPatient);
      expect(mockStorageService.uploadPatientDocument).toHaveBeenCalledWith('1', file);
    });

    it('should handle validation errors', async () => {
      const formData = new FormData();
      formData.append('name', ''); // Invalid: empty name
      formData.append('phone', '+971501234567');
      formData.append('flat_villa_no', '123');
      formData.append('building_street', 'Main St');
      formData.append('area', 'Dubai Marina');
      formData.append('city', 'Dubai');

      const request = new NextRequest('http://localhost:3000/api/patients', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Name is required');
    });

    it('should handle file upload errors', async () => {
      const mockPatient = {
        id: '1',
        name: 'John Doe',
        phone: '+971501234567',
        flat_villa_no: '123',
        building_street: 'Main St',
        area: 'Dubai Marina',
        city: 'Dubai',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockPatientService.createPatient.mockResolvedValue(mockPatient);
      mockStorageService.uploadPatientDocument.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('phone', '+971501234567');
      formData.append('flat_villa_no', '123');
      formData.append('building_street', 'Main St');
      formData.append('area', 'Dubai Marina');
      formData.append('city', 'Dubai');

      const file = new File(['test'], 'passport.pdf', { type: 'application/pdf' });
      formData.append('id_document', file);

      const request = new NextRequest('http://localhost:3000/api/patients', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.warning).toBe('Patient created but ID document upload failed');
      expect(data.uploadError).toBe('Upload failed');
    });

    it('should handle service errors', async () => {
      mockPatientService.createPatient.mockRejectedValue(new Error('Database error'));

      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('phone', '+971501234567');
      formData.append('flat_villa_no', '123');
      formData.append('building_street', 'Main St');
      formData.append('area', 'Dubai Marina');
      formData.append('city', 'Dubai');

      const request = new NextRequest('http://localhost:3000/api/patients', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });
});
