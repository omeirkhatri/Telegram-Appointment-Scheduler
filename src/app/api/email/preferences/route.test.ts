import { NextRequest } from 'next/server';
import { GET, PUT, POST } from './route';
import { emailPreferencesService } from '@/services/emailPreferencesService';
import { DEFAULT_EMAIL_PREFERENCES } from '@/types/emailPreferences';

// Mock the email preferences service
jest.mock('@/services/emailPreferencesService', () => ({
  emailPreferencesService: {
    getGlobalEmailPreferences: jest.fn(),
    updateGlobalEmailPreferences: jest.fn(),
    resetToDefaults: jest.fn(),
    testEmailConfiguration: jest.fn(),
    exportPreferences: jest.fn(),
    importPreferences: jest.fn(),
  },
}));

const mockEmailPreferencesService = emailPreferencesService as jest.Mocked<typeof emailPreferencesService>;

describe('/api/email/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return email preferences successfully', async () => {
      mockEmailPreferencesService.getGlobalEmailPreferences.mockResolvedValue(DEFAULT_EMAIL_PREFERENCES);

      const request = new NextRequest('http://localhost:3000/api/email/preferences');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(DEFAULT_EMAIL_PREFERENCES);
      expect(mockEmailPreferencesService.getGlobalEmailPreferences).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching preferences', async () => {
      const errorMessage = 'Database connection failed';
      mockEmailPreferencesService.getGlobalEmailPreferences.mockRejectedValue(new Error(errorMessage));

      const request = new NextRequest('http://localhost:3000/api/email/preferences');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe(errorMessage);
    });
  });

  describe('PUT', () => {
    it('should update email preferences successfully', async () => {
      const updateData = {
        emailNotificationsEnabled: false,
        reminderTimeBeforeAppointment: 60,
      };
      const updatedPreferences = { ...DEFAULT_EMAIL_PREFERENCES, ...updateData };

      mockEmailPreferencesService.updateGlobalEmailPreferences.mockResolvedValue(updatedPreferences);

      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences: updateData }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedPreferences);
      expect(data.message).toBe('Email preferences updated successfully');
      expect(mockEmailPreferencesService.updateGlobalEmailPreferences).toHaveBeenCalledWith(updateData);
    });

    it('should return error for missing preferences', async () => {
      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Preferences object is required');
    });

    it('should handle errors when updating preferences', async () => {
      const errorMessage = 'Validation failed';
      mockEmailPreferencesService.updateGlobalEmailPreferences.mockRejectedValue(new Error(errorMessage));

      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences: { emailNotificationsEnabled: false } }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe(errorMessage);
    });
  });

  describe('POST', () => {
    it('should reset preferences to defaults', async () => {
      mockEmailPreferencesService.resetToDefaults.mockResolvedValue(DEFAULT_EMAIL_PREFERENCES);

      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(DEFAULT_EMAIL_PREFERENCES);
      expect(data.message).toBe('Email preferences reset to defaults');
      expect(mockEmailPreferencesService.resetToDefaults).toHaveBeenCalledTimes(1);
    });

    it('should test email configuration', async () => {
      const testResult = {
        success: true,
        message: 'Email configuration is valid',
      };

      mockEmailPreferencesService.testEmailConfiguration.mockResolvedValue(testResult);

      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Email configuration is valid');
      expect(mockEmailPreferencesService.testEmailConfiguration).toHaveBeenCalledTimes(1);
    });

    it('should export preferences', async () => {
      const preferencesJson = JSON.stringify(DEFAULT_EMAIL_PREFERENCES);
      mockEmailPreferencesService.exportPreferences.mockResolvedValue(preferencesJson);

      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'POST',
        body: JSON.stringify({ action: 'export' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBe(preferencesJson);
      expect(data.message).toBe('Preferences exported successfully');
      expect(mockEmailPreferencesService.exportPreferences).toHaveBeenCalledTimes(1);
    });

    it('should import preferences', async () => {
      const preferencesToImport = { emailNotificationsEnabled: false };
      const preferencesJson = JSON.stringify(preferencesToImport);
      const importedPreferences = { ...DEFAULT_EMAIL_PREFERENCES, ...preferencesToImport };

      mockEmailPreferencesService.importPreferences.mockResolvedValue(importedPreferences);

      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'POST',
        body: JSON.stringify({ action: 'import', preferencesJson }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(importedPreferences);
      expect(data.message).toBe('Email preferences imported successfully');
      expect(mockEmailPreferencesService.importPreferences).toHaveBeenCalledWith(preferencesJson);
    });

    it('should return error for missing preferencesJson in import', async () => {
      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'POST',
        body: JSON.stringify({ action: 'import' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Preferences JSON string is required');
    });

    it('should return error for invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action. Supported actions: reset, test, export, import');
    });

    it('should handle errors in actions', async () => {
      const errorMessage = 'Service error';
      mockEmailPreferencesService.resetToDefaults.mockRejectedValue(new Error(errorMessage));

      const request = new NextRequest('http://localhost:3000/api/email/preferences', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe(errorMessage);
    });
  });
});
