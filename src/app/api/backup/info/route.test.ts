import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the backup service
jest.mock('@/services/backupService', () => ({
  backupService: {
    getTableInfo: jest.fn(),
    getBackupStatistics: jest.fn(),
  },
}));

describe('/api/backup/info', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return basic statistics when includeTableInfo is false', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      mockBackupService.getBackupStatistics.mockResolvedValue({
        totalTables: 5,
        totalRows: 1000,
        tableStats: [],
      });

      const request = new NextRequest('http://localhost:3000/api/backup/info');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.statistics).toBeDefined();
      expect(data.data.statistics.totalTables).toBe(5);
      expect(data.data.statistics.totalRows).toBe(1000);
      expect(data.data.tableInfo).toBeUndefined();
    });

    it('should return detailed information when includeTableInfo is true', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      const mockTableInfo = [
        { name: 'patients', rowCount: 500, columns: ['id', 'name', 'phone'] },
        { name: 'appointments', rowCount: 300, columns: ['id', 'date', 'patient_id'] },
      ];
      const mockStatistics = {
        totalTables: 2,
        totalRows: 800,
        tableStats: mockTableInfo,
      };

      mockBackupService.getTableInfo.mockResolvedValue(mockTableInfo);
      mockBackupService.getBackupStatistics.mockResolvedValue(mockStatistics);

      const request = new NextRequest('http://localhost:3000/api/backup/info?includeTableInfo=true');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.statistics).toBeDefined();
      expect(data.data.tableInfo).toBeDefined();
      expect(data.data.tableInfo).toEqual(mockTableInfo);
      expect(data.data.statistics).toEqual(mockStatistics);
    });

    it('should handle service errors gracefully', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      mockBackupService.getBackupStatistics.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/backup/info');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });

    it('should handle unexpected errors', async () => {
      const mockBackupService = require('@/services/backupService').backupService;
      mockBackupService.getBackupStatistics.mockRejectedValue('Unexpected error');

      const request = new NextRequest('http://localhost:3000/api/backup/info');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get backup information');
    });
  });
});
