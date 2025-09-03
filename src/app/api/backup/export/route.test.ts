import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the backup service
jest.mock('@/services/backupService', () => ({
  backupService: {
    exportAllData: jest.fn(),
    exportCoreData: jest.fn(),
    exportSystemData: jest.fn(),
    exportTable: jest.fn(),
  },
}));

describe('/api/backup/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should export all data successfully', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      mockBackupService.exportAllData.mockResolvedValue({
        success: true,
        data: 'csv,content\n1,test',
        filename: 'medicare_backup_2024-01-15.csv',
        metadata: {
          exportedAt: '2024-01-15T10:00:00Z',
          totalTables: 3,
          totalRows: 100,
          fileSize: 1024,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          type: 'all',
          format: 'csv',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('medicare_backup_2024-01-15.csv');
    });

    it('should export core data successfully', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      mockBackupService.exportCoreData.mockResolvedValue({
        success: true,
        data: 'csv,content\n1,test',
        filename: 'medicare_backup_2024-01-15.csv',
        metadata: {
          exportedAt: '2024-01-15T10:00:00Z',
          totalTables: 2,
          totalRows: 50,
          fileSize: 512,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          type: 'core',
          format: 'csv',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockBackupService.exportCoreData).toHaveBeenCalledWith({
        format: 'csv',
        dateRange: undefined,
        includeMetadata: true,
      });
    });

    it('should export system data successfully', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      mockBackupService.exportSystemData.mockResolvedValue({
        success: true,
        data: '{"tables": {}}',
        filename: 'medicare_backup_2024-01-15.json',
        metadata: {
          exportedAt: '2024-01-15T10:00:00Z',
          totalTables: 1,
          totalRows: 10,
          fileSize: 256,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          type: 'system',
          format: 'json',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(mockBackupService.exportSystemData).toHaveBeenCalledWith({
        format: 'json',
        dateRange: undefined,
        includeMetadata: true,
      });
    });

    it('should export specific table successfully', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      mockBackupService.exportTable.mockResolvedValue({
        success: true,
        data: 'csv,content\n1,test',
        filename: 'patients_backup_2024-01-15.csv',
        metadata: {
          exportedAt: '2024-01-15T10:00:00Z',
          totalTables: 1,
          totalRows: 25,
          fileSize: 128,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          type: 'table',
          tableName: 'patients',
          format: 'csv',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockBackupService.exportTable).toHaveBeenCalledWith('patients', {
        format: 'csv',
        dateRange: undefined,
        includeMetadata: true,
      });
    });

    it('should return error for missing type', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Export type and format are required');
    });

    it('should return error for missing format', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          type: 'all',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Export type and format are required');
    });

    it('should return error for table export without table name', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          type: 'table',
          format: 'csv',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Table name is required for table export');
    });

    it('should return error for unsupported export type', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid',
          format: 'csv',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unsupported export type: invalid');
    });

    it('should handle backup service errors', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      mockBackupService.exportAllData.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          type: 'all',
          format: 'csv',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      mockBackupService.exportAllData.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({
          type: 'all',
          format: 'csv',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unexpected error');
    });
  });
});
