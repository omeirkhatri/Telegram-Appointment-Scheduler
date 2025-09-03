import { NextRequest } from 'next/server';
import { GET, PUT } from './route';

describe('/api/google-calendar/sync-settings', () => {
  describe('GET', () => {
    it('should return default sync settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-calendar/sync-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('autoSyncAppointments');
      expect(data.data).toHaveProperty('bidirectionalSync');
      expect(data.data).toHaveProperty('conflictResolution');
      expect(data.data).toHaveProperty('syncReminders');
      expect(data.data).toHaveProperty('syncInterval');
      expect(data.data).toHaveProperty('retryAttempts');
      expect(data.data).toHaveProperty('webhookEnabled');
      expect(data.data).toHaveProperty('lastUpdated');
    });
  });

  describe('PUT', () => {
    it('should update sync settings with valid data', async () => {
      const validSettings = {
        autoSyncAppointments: true,
        bidirectionalSync: false,
        conflictResolution: true,
        syncReminders: false,
        syncInterval: 600,
        retryAttempts: 5,
        webhookEnabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/google-calendar/sync-settings', {
        method: 'PUT',
        body: JSON.stringify(validSettings),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expect.objectContaining(validSettings));
      expect(data.message).toBe('Sync settings updated successfully');
    });

    it('should return validation error for invalid sync interval', async () => {
      const invalidSettings = {
        autoSyncAppointments: true,
        bidirectionalSync: true,
        conflictResolution: false,
        syncReminders: true,
        syncInterval: 30, // Invalid: less than 60
        retryAttempts: 3,
        webhookEnabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/google-calendar/sync-settings', {
        method: 'PUT',
        body: JSON.stringify(invalidSettings),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('syncInterval must be a number between 60 and 3600 seconds');
    });

    it('should return validation error for invalid retry attempts', async () => {
      const invalidSettings = {
        autoSyncAppointments: true,
        bidirectionalSync: true,
        conflictResolution: false,
        syncReminders: true,
        syncInterval: 300,
        retryAttempts: 15, // Invalid: greater than 10
        webhookEnabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/google-calendar/sync-settings', {
        method: 'PUT',
        body: JSON.stringify(invalidSettings),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('retryAttempts must be a number between 1 and 10');
    });

    it('should return validation error for non-boolean values', async () => {
      const invalidSettings = {
        autoSyncAppointments: 'true', // Invalid: should be boolean
        bidirectionalSync: true,
        conflictResolution: false,
        syncReminders: true,
        syncInterval: 300,
        retryAttempts: 3,
        webhookEnabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/google-calendar/sync-settings', {
        method: 'PUT',
        body: JSON.stringify(invalidSettings),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('autoSyncAppointments must be a boolean');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-calendar/sync-settings', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unexpected token');
    });
  });
});
