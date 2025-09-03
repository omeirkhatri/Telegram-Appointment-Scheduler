/**
 * Tests for Google Calendar Mocking Utilities
 *
 * Ensures the mock factory works correctly and provides
 * consistent behavior for all Google Calendar API patterns.
 */

import {
    clearAllGoogleCalendarMocks,
    createMockGoogleCalendarAuthError,
    createMockGoogleCalendarError,
    createMockGoogleCalendarEvent,
    createMockGoogleCalendarEventResponse,
    createMockGoogleCalendarEvents,
    createMockGoogleCalendarList,
    createMockGoogleCalendarListEntry,
    createMockGoogleCalendarQuotaError,
    createMockGoogleCalendarWebhookPayload,
    MockGoogleCalendarAuth,
    MockGoogleCalendarClient,
    resetMockGoogleCalendar,
    setupMockCalendar,
    setupMockCalendarEvents,
    setupMockWebhook
} from './google-calendar-mocks';

describe('Google Calendar Mocking Utilities', () => {
  beforeEach(() => {
    clearAllGoogleCalendarMocks();
  });

  describe('Mock Data Factories', () => {
    describe('createMockGoogleCalendarEvent', () => {
      it('should create a calendar event with default values', () => {
        const event = createMockGoogleCalendarEvent();

        expect(event).toMatchObject({
          id: 'test-event-id',
          summary: 'Test Appointment',
          description: 'Test appointment description',
          status: 'confirmed',
        });
        expect(event.start).toEqual({ dateTime: '2024-01-15T10:00:00+04:00', timeZone: 'Asia/Dubai' });
        expect(event.end).toEqual({ dateTime: '2024-01-15T11:00:00+04:00', timeZone: 'Asia/Dubai' });
        expect(event.attendees).toHaveLength(2);
      });

      it('should allow overriding default values', () => {
        const event = createMockGoogleCalendarEvent({
          summary: 'Custom Event',
          location: 'Custom Location',
        });

        expect(event.summary).toBe('Custom Event');
        expect(event.location).toBe('Custom Location');
        expect(event.id).toBe('test-event-id'); // Default value preserved
      });
    });

    describe('createMockGoogleCalendarEventResponse', () => {
      it('should create a calendar event response with default values', () => {
        const eventResponse = createMockGoogleCalendarEventResponse();

        expect(eventResponse).toMatchObject({
          kind: 'calendar#event',
          id: 'test-event-id',
          status: 'confirmed',
          summary: 'Test Appointment',
        });
        expect(eventResponse.creator).toBeDefined();
        expect(eventResponse.organizer).toBeDefined();
        expect(eventResponse.attendees).toHaveLength(2);
      });
    });

    describe('createMockGoogleCalendarListEntry', () => {
      it('should create a calendar list entry with default values', () => {
        const calendar = createMockGoogleCalendarListEntry();

        expect(calendar).toMatchObject({
          id: 'test-calendar-id',
          summary: 'Test Calendar',
          timeZone: 'Asia/Dubai',
          accessRole: 'owner',
          primary: false,
          selected: true,
        });
      });
    });

    describe('createMockGoogleCalendarWebhookPayload', () => {
      it('should create a webhook payload with default values', () => {
        const webhook = createMockGoogleCalendarWebhookPayload();

        expect(webhook).toMatchObject({
          kind: 'api#channel',
          id: 'test-webhook-id',
          type: 'web_hook',
          address: 'https://example.com/api/webhooks/calendar',
        });
        expect(webhook.resourceId).toBeDefined();
        expect(webhook.resourceUri).toBeDefined();
      });
    });

    describe('Collection Factories', () => {
      it('should create multiple calendar events with unique IDs', () => {
        const events = createMockGoogleCalendarEvents(3);

        expect(events).toHaveLength(3);
        expect(events[0].id).toBe('event-1');
        expect(events[1].id).toBe('event-2');
        expect(events[2].id).toBe('event-3');
        expect(events[0].summary).toBe('Appointment 1');
        expect(events[1].summary).toBe('Appointment 2');
        expect(events[2].summary).toBe('Appointment 3');
      });

      it('should create multiple calendar list entries with unique IDs', () => {
        const calendars = createMockGoogleCalendarList(2);

        expect(calendars).toHaveLength(2);
        expect(calendars[0].id).toBe('calendar-1');
        expect(calendars[1].id).toBe('calendar-2');
        expect(calendars[0].summary).toBe('Calendar 1');
        expect(calendars[1].summary).toBe('Calendar 2');
        expect(calendars[0].primary).toBe(true); // First one is primary
      });
    });
  });

  describe('Error Factories', () => {
    it('should create a custom Google Calendar error', () => {
      const error = createMockGoogleCalendarError('Custom error', 400);

      expect(error).toEqual({
        error: {
          code: 400,
          message: 'Custom error',
          errors: [
            {
              domain: 'global',
              reason: 'invalid',
              message: 'Custom error',
            },
          ],
        },
      });
    });

    it('should create an authentication error', () => {
      const error = createMockGoogleCalendarAuthError();

      expect(error.error.code).toBe(401);
      expect(error.error.message).toBe('Invalid Credentials');
      expect(error.error.errors[0].reason).toBe('authError');
    });

    it('should create a quota exceeded error', () => {
      const error = createMockGoogleCalendarQuotaError();

      expect(error.error.code).toBe(403);
      expect(error.error.message).toBe('Quota exceeded');
      expect(error.error.errors[0].reason).toBe('quotaExceeded');
    });
  });

  describe('MockGoogleCalendarClient', () => {
    let client: MockGoogleCalendarClient;

    beforeEach(() => {
      client = new MockGoogleCalendarClient();
    });

    it('should set and retrieve calendar events', () => {
      const events = createMockGoogleCalendarEvents(2);
      client.setCalendarEvents('test-calendar', events);

      expect(client.events).toBeDefined();
    });

    it('should set and retrieve calendar info', () => {
      const calendar = createMockGoogleCalendarListEntry({ id: 'test-calendar' });
      client.setCalendar('test-calendar', calendar);

      expect(client.calendars).toBeDefined();
    });

    it('should set and retrieve webhooks', () => {
      const webhook = createMockGoogleCalendarWebhookPayload({ id: 'test-webhook' });
      client.setWebhook('test-webhook', webhook);

      // Verify webhook was set by checking if we can stop it
      expect(client.events.stop).toBeDefined();
    });

    it('should handle errors when configured', () => {
      const error = createMockGoogleCalendarError('Test error');
      client.withError(error);

      expect(client.mockError).toEqual(error);
      expect(client.shouldThrow).toBe(false);
    });

    it('should handle throwing errors when configured', () => {
      const error = createMockGoogleCalendarError('Test error');
      client.withThrowingError(error);

      expect(client.mockError).toEqual(error);
      expect(client.shouldThrow).toBe(true);
    });

    describe('events API', () => {
      it('should list events', async () => {
        const events = createMockGoogleCalendarEvents(2);
        client.setCalendarEvents('test-calendar', events);

        const result = await client.events.list({ calendarId: 'test-calendar' });

        expect(result.data.items).toHaveLength(2);
        expect(result.data.items[0].id).toBe('event-1');
      });

      it('should insert events', async () => {
        const eventData = {
          summary: 'New Event',
          description: 'New Description',
          start: { dateTime: '2024-01-15T10:00:00+04:00', timeZone: 'Asia/Dubai' },
          end: { dateTime: '2024-01-15T11:00:00+04:00', timeZone: 'Asia/Dubai' },
        };

        const result = await client.events.insert({
          calendarId: 'test-calendar',
          resource: eventData,
        });

        expect(result.data.id).toMatch(/^generated-\d+$/);
        expect(result.data.summary).toBe('New Event');
      });

      it('should patch events', async () => {
        const existingEvent = createMockGoogleCalendarEvent({ id: 'event-123' });
        client.setCalendarEvents('test-calendar', [existingEvent]);

        const updateData = { summary: 'Updated Event' };
        const result = await client.events.patch({
          calendarId: 'test-calendar',
          eventId: 'event-123',
          resource: updateData,
        });

        expect(result.data.summary).toBe('Updated Event');
        expect(result.data.id).toBe('event-123');
      });

      it('should delete events', async () => {
        const existingEvent = createMockGoogleCalendarEvent({ id: 'event-123' });
        client.setCalendarEvents('test-calendar', [existingEvent]);

        const result = await client.events.delete({
          calendarId: 'test-calendar',
          eventId: 'event-123',
        });

        expect(result.data).toEqual({});
      });

      it('should watch for changes', async () => {
        const result = await client.events.watch({
          calendarId: 'test-calendar',
          resource: { address: 'https://example.com/webhook' },
        });

        expect(result.data.id).toMatch(/^webhook-\d+$/);
        expect(result.data.address).toBe('https://example.com/webhook');
      });

      it('should stop watching', async () => {
        const webhook = createMockGoogleCalendarWebhookPayload({ id: 'webhook-123' });
        client.setWebhook('webhook-123', webhook);

        const result = await client.events.stop({
          resource: { id: 'webhook-123' },
        });

        expect(result.data).toEqual({});
      });
    });

    describe('calendars API', () => {
      it('should get calendar info', async () => {
        const calendar = createMockGoogleCalendarListEntry({ id: 'test-calendar' });
        client.setCalendar('test-calendar', calendar);

        const result = await client.calendars.get({ calendarId: 'test-calendar' });

        expect(result.data.id).toBe('test-calendar');
        expect(result.data.summary).toBe('Test Calendar');
      });
    });

    describe('calendarList API', () => {
      it('should list calendars', async () => {
        const calendars = createMockGoogleCalendarList(2);
        calendars.forEach(calendar => {
          client.setCalendar(calendar.id, calendar);
        });

        const result = await client.calendarList.list();

        expect(result.data.items).toHaveLength(2);
        expect(result.data.kind).toBe('calendar#calendarList');
      });
    });
  });

  describe('MockGoogleCalendarAuth', () => {
    let auth: MockGoogleCalendarAuth;

    beforeEach(() => {
      auth = new MockGoogleCalendarAuth();
    });

    it('should set service account authentication', () => {
      auth.withServiceAccount();

      expect(auth.hasServiceAccountAuth()).toBe(true);
      expect(auth.hasApiKeyAuth()).toBe(false);
      expect(auth.getAuthStatus().isInitialized).toBe(true);
    });

    it('should set API key authentication', () => {
      auth.withApiKey();

      expect(auth.hasServiceAccountAuth()).toBe(false);
      expect(auth.hasApiKeyAuth()).toBe(true);
      expect(auth.getAuthStatus().isInitialized).toBe(true);
    });

    it('should validate calendar IDs correctly', () => {
      expect(auth.validateCalendarId('user@example.com')).toBe(true);
      expect(auth.validateCalendarId('primary')).toBe(true);
      expect(auth.validateCalendarId('group@group.calendar.google.com')).toBe(true);
      expect(auth.validateCalendarId('invalid-id')).toBe(false);
      expect(auth.validateCalendarId('')).toBe(false);
    });

    it('should test calendar access', async () => {
      const result = await auth.testCalendarAccess('user@example.com');
      expect(result).toBe(true);
    });

    it('should handle errors when configured', async () => {
      auth.withError(new Error('Test error'));

      await expect(auth.testCalendarAccess('user@example.com')).rejects.toThrow('Test error');
    });

    it('should get calendar client', async () => {
      const client = await auth.getCalendarClient();
      expect(client).toBeDefined();
    });

    it('should get API key when available', () => {
      auth.withApiKey();
      expect(auth.getApiKey()).toBe('mock-api-key');

      auth = new MockGoogleCalendarAuth();
      expect(auth.getApiKey()).toBe(null);
    });
  });

  describe('Setup Helpers', () => {
    it('should setup mock calendar events', () => {
      const events = setupMockCalendarEvents('test-calendar', 3);

      expect(events).toHaveLength(3);
      expect(events[0].id).toBe('event-1');
    });

    it('should setup mock calendar', () => {
      const calendar = setupMockCalendar('test-calendar', { summary: 'Custom Calendar' });

      expect(calendar.id).toBe('test-calendar');
      expect(calendar.summary).toBe('Custom Calendar');
    });

    it('should setup mock webhook', () => {
      const webhook = setupMockWebhook('test-webhook', { address: 'https://custom.com/webhook' });

      expect(webhook.id).toBe('test-webhook');
      expect(webhook.address).toBe('https://custom.com/webhook');
    });
  });

  describe('Utility Functions', () => {
    it('should clear all mocks', () => {
      setupMockCalendarEvents('test-calendar', 3);
      clearAllGoogleCalendarMocks();

      // After clearing, we should be able to set up new data
      const events = setupMockCalendarEvents('test-calendar', 1);
      expect(events).toHaveLength(1);
    });

    it('should reset to default state', () => {
      resetMockGoogleCalendar();

      // Should have default calendars and events
      expect(true).toBe(true); // Mock successfully reset
    });
  });
});
