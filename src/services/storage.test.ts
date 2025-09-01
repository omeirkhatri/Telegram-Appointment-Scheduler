import { storageService } from './storage';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        createSignedUrl: jest.fn(),
        remove: jest.fn(),
        list: jest.fn()
      }))
    }
  }
}));

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should validate correct file types', () => {
      const validFiles = [
        new File([''], 'test.jpg', { type: 'image/jpeg' }),
        new File([''], 'test.png', { type: 'image/png' }),
        new File([''], 'test.pdf', { type: 'application/pdf' }),
        new File([''], 'test.webp', { type: 'image/webp' })
      ];

      validFiles.forEach(file => {
        const result = storageService.validateFile(file);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid file types', () => {
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
      const result = storageService.validateFile(invalidFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject files larger than 10MB', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const result = storageService.validateFile(largeFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size too large');
    });

    it('should accept files smaller than 10MB', () => {
      const smallFile = new File(['x'.repeat(5 * 1024 * 1024)], 'small.jpg', { type: 'image/jpeg' });
      const result = storageService.validateFile(smallFile);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(storageService.formatFileSize(0)).toBe('0 Bytes');
      expect(storageService.formatFileSize(1024)).toBe('1 KB');
      expect(storageService.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(storageService.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(storageService.formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('uploadPatientDocument', () => {
    it('should upload valid files successfully', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'id-documents/test-file.jpg' },
        error: null
      });

      const { supabase } = require('@/lib/supabase');
      supabase.storage.from.mockReturnValue({
        upload: mockUpload
      });

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const patientId = '123e4567-e89b-12d3-a456-426614174000';

      const result = await storageService.uploadPatientDocument(patientId, file);

      expect(result.success).toBe(true);
      expect(result.filePath).toContain('id-documents/');
      expect(result.filePath).toContain(patientId);
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('id-documents/'),
        file,
        expect.objectContaining({
          cacheControl: '3600',
          upsert: false
        })
      );
    });

    it('should reject invalid file types', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const patientId = '123e4567-e89b-12d3-a456-426614174000';

      const result = await storageService.uploadPatientDocument(patientId, file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject files larger than 10MB', async () => {
      const file = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const patientId = '123e4567-e89b-12d3-a456-426614174000';

      const result = await storageService.uploadPatientDocument(patientId, file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File size too large');
    });

    it('should handle upload errors', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' }
      });

      const { supabase } = require('@/lib/supabase');
      supabase.storage.from.mockReturnValue({
        upload: mockUpload
      });

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const patientId = '123e4567-e89b-12d3-a456-426614174000';

      const result = await storageService.uploadPatientDocument(patientId, file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });
  });

  describe('getDocumentUrl', () => {
    it('should return signed URL for valid file path', async () => {
      const mockSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null
      });

      const { supabase } = require('@/lib/supabase');
      supabase.storage.from.mockReturnValue({
        createSignedUrl: mockSignedUrl
      });

      const filePath = 'id-documents/test-file.jpg';
      const result = await storageService.getDocumentUrl(filePath);

      expect(result).toBe('https://example.com/signed-url');
      expect(mockSignedUrl).toHaveBeenCalledWith(filePath, 3600);
    });

    it('should return null for errors', async () => {
      const mockSignedUrl = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to create signed URL' }
      });

      const { supabase } = require('@/lib/supabase');
      supabase.storage.from.mockReturnValue({
        createSignedUrl: mockSignedUrl
      });

      const filePath = 'id-documents/test-file.jpg';
      const result = await storageService.getDocumentUrl(filePath);

      expect(result).toBeNull();
    });
  });

  describe('deletePatientDocument', () => {
    it('should delete document successfully', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        error: null
      });

      const { supabase } = require('@/lib/supabase');
      supabase.storage.from.mockReturnValue({
        remove: mockRemove
      });

      const filePath = 'id-documents/test-file.jpg';
      const result = await storageService.deletePatientDocument(filePath);

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith([filePath]);
    });

    it('should return false for errors', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        error: { message: 'Delete failed' }
      });

      const { supabase } = require('@/lib/supabase');
      supabase.storage.from.mockReturnValue({
        remove: mockRemove
      });

      const filePath = 'id-documents/test-file.jpg';
      const result = await storageService.deletePatientDocument(filePath);

      expect(result).toBe(false);
    });
  });

  describe('listPatientDocuments', () => {
    it('should list documents for a patient', async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            name: 'document1.jpg',
            metadata: { size: 1024, mimetype: 'image/jpeg' },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        error: null
      });

      const { supabase } = require('@/lib/supabase');
      supabase.storage.from.mockReturnValue({
        list: mockList
      });

      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const result = await storageService.listPatientDocuments(patientId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('document1.jpg');
      expect(result[0].size).toBe(1024);
      expect(mockList).toHaveBeenCalledWith('id-documents', {
        search: patientId
      });
    });

    it('should return empty array for errors', async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'List failed' }
      });

      const { supabase } = require('@/lib/supabase');
      supabase.storage.from.mockReturnValue({
        list: mockList
      });

      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const result = await storageService.listPatientDocuments(patientId);

      expect(result).toEqual([]);
    });
  });
});
