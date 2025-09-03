/**
 * Comprehensive Google Calendar API Mocking Utilities
 * 
 * Provides type-safe, consistent mocking for all Google Calendar API patterns
 * used throughout the MediCare Scheduler application.
 */

import type { Staff } from '@/types';
import type { Appointment } from '@/types/appointment';
import type { Patient } from '@/types/patient';

// Google Calendar API types
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
  location?: string;
  attendees?: Array<{ email: string; responseStatus?: string }>;
  updated: string;
  created: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  iCalUID?: string;
  sequence?: number;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  accessRole: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
  primary?: boolean;
  selected?: boolean;
}

export interface GoogleCalendarWebhookPayload {
  kind: 'api#channel';
  id: string;
  resourceId: string;
  resourceUri: string;
  token?: string;
  expiration?: string;
  type: 'web_hook';
  address: string;
}

export interface GoogleCalendarWatchResponse {
  kind: 'api#channel';
  id: string;
  resourceId: string;
  resourceUri: string;
  token?: string;
  expiration: string;
  type: 'web_hook';
  address: string;
}

export interface GoogleCalendarEventsListResponse {
  kind: 'calendar#events';
  etag: string;
  summary: string;
  description?: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  defaultReminders: Array<{ method: string; minutes: number }>;
  nextPageToken?: string;
  nextSyncToken?: string;
  items: GoogleCalendarEvent[];
}

export interface GoogleCalendarEventResponse {
  kind: 'calendar#event';
  etag: string;
  id: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator: { id: string; email: string; displayName?: string };
  organizer: { id: string; email: string; displayName?: string };
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
  endTimeUnspecified?: boolean;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: { dateTime: string; timeZone: string } | { date: string };
  transparency?: 'opaque' | 'transparent';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  iCalUID: string;
  sequence: number;
  attendees?: Array<{
    id?: string;
    email: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    optional?: boolean;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    comment?: string;
    additionalGuests?: number;
  }>;
  attendeesOmitted?: boolean;
  hangoutLink?: string;
  conferenceData?: any;
  gadget?: any;
  anyoneCanAddSelf?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  privateCopy?: boolean;
  locked?: boolean;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
  source?: { url: string; title: string };
  attachments?: Array<{
    fileId: string;
    fileUrl: string;
    title: string;
    mimeType: string;
    iconLink: string;
    fileSize: number;
  }>;
  eventType?: 'default' | 'outOfOffice' | 'focusTime';
}

// Mock data factories
export const createMockGoogleCalendarEvent = (overrides: Partial<GoogleCalendarEvent> = {}): GoogleCalendarEvent => ({
  id: 'test-event-id',
  summary: 'Test Appointment',
  description: 'Test appointment description',
  start: { dateTime: '2024-01-15T10:00:00+04:00', timeZone: 'Asia/Dubai' },
  end: { dateTime: '2024-01-15T11:00:00+04:00', timeZone: 'Asia/Dubai' },
  location: 'Dubai, UAE',
  attendees: [
    { email: 'doctor@example.com', responseStatus: 'accepted' },
    { email: 'patient@example.com', responseStatus: 'accepted' },
  ],
  updated: '2024-01-01T00:00:00Z',
  created: '2024-01-01T00:00:00Z',
  status: 'confirmed',
  htmlLink: 'https://calendar.google.com/event?eid=test-event-id',
  iCalUID: 'test-event-id@google.com',
  sequence: 0,
  ...overrides,
});

export const createMockGoogleCalendarEventResponse = (overrides: Partial<GoogleCalendarEventResponse> = {}): GoogleCalendarEventResponse => ({
  kind: 'calendar#event',
  etag: '"test-etag"',
  id: 'test-event-id',
  status: 'confirmed',
  htmlLink: 'https://calendar.google.com/event?eid=test-event-id',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z',
  summary: 'Test Appointment',
  description: 'Test appointment description',
  location: 'Dubai, UAE',
  creator: { id: 'creator-id', email: 'creator@example.com', displayName: 'Creator' },
  organizer: { id: 'organizer-id', email: 'organizer@example.com', displayName: 'Organizer' },
  start: { dateTime: '2024-01-15T10:00:00+04:00', timeZone: 'Asia/Dubai' },
  end: { dateTime: '2024-01-15T11:00:00+04:00', timeZone: 'Asia/Dubai' },
  iCalUID: 'test-event-id@google.com',
  sequence: 0,
  attendees: [
    { email: 'doctor@example.com', responseStatus: 'accepted' },
    { email: 'patient@example.com', responseStatus: 'accepted' },
  ],
  reminders: { useDefault: true },
  ...overrides,
});

export const createMockGoogleCalendarListEntry = (overrides: Partial<GoogleCalendarListEntry> = {}): GoogleCalendarListEntry => ({
  id: 'test-calendar-id',
  summary: 'Test Calendar',
  description: 'Test calendar description',
  timeZone: 'Asia/Dubai',
  accessRole: 'owner',
  primary: false,
  selected: true,
  ...overrides,
});

export const createMockGoogleCalendarWebhookPayload = (overrides: Partial<GoogleCalendarWebhookPayload> = {}): GoogleCalendarWebhookPayload => ({
  kind: 'api#channel',
  id: 'test-webhook-id',
  resourceId: 'test-resource-id',
  resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/test-calendar-id/events',
  token: 'test-token',
  expiration: '2024-01-01T00:00:00Z',
  type: 'web_hook',
  address: 'https://example.com/api/webhooks/calendar',
  ...overrides,
});

export const createMockGoogleCalendarWatchResponse = (overrides: Partial<GoogleCalendarWatchResponse> = {}): GoogleCalendarWatchResponse => ({
  kind: 'api#channel',
  id: 'test-watch-id',
  resourceId: 'test-resource-id',
  resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/test-calendar-id/events',
  token: 'test-token',
  expiration: '2024-01-01T00:00:00Z',
  type: 'web_hook',
  address: 'https://example.com/api/webhooks/calendar',
  ...overrides,
});

export const createMockGoogleCalendarEventsListResponse = (overrides: Partial<GoogleCalendarEventsListResponse> = {}): GoogleCalendarEventsListResponse => ({
  kind: 'calendar#events',
  etag: '"test-etag"',
  summary: 'Test Calendar',
  description: 'Test calendar description',
  updated: '2024-01-01T00:00:00Z',
  timeZone: 'Asia/Dubai',
  accessRole: 'owner',
  defaultReminders: [{ method: 'popup', minutes: 10 }],
  items: [createMockGoogleCalendarEvent()],
  ...overrides,
});

// Mock collections
export const createMockGoogleCalendarEvents = (count: number = 3): GoogleCalendarEvent[] =>
  Array.from({ length: count }, (_, i) =>
    createMockGoogleCalendarEvent({
      id: `event-${i + 1}`,
      summary: `Appointment ${i + 1}`,
      start: { dateTime: `2024-01-${15 + i}T10:00:00+04:00`, timeZone: 'Asia/Dubai' },
      end: { dateTime: `2024-01-${15 + i}T11:00:00+04:00`, timeZone: 'Asia/Dubai' },
    })
  );

export const createMockGoogleCalendarList = (count: number = 3): GoogleCalendarListEntry[] =>
  Array.from({ length: count }, (_, i) =>
    createMockGoogleCalendarListEntry({
      id: `calendar-${i + 1}`,
      summary: `Calendar ${i + 1}`,
      primary: i === 0,
    })
  );

// Error factories
export const createMockGoogleCalendarError = (message: string = 'Test error', code: number = 400) => ({
  error: {
    code,
    message,
    errors: [
      {
        domain: 'global',
        reason: 'invalid',
        message,
      },
    ],
  },
});

export const createMockGoogleCalendarAuthError = () => ({
  error: {
    code: 401,
    message: 'Invalid Credentials',
    errors: [
      {
        domain: 'global',
        reason: 'authError',
        message: 'Invalid Credentials',
      },
    ],
  },
});

export const createMockGoogleCalendarQuotaError = () => ({
  error: {
    code: 403,
    message: 'Quota exceeded',
    errors: [
      {
        domain: 'usageLimits',
        reason: 'quotaExceeded',
        message: 'Quota exceeded',
      },
    ],
  },
});

// Mock Google Calendar API client factory
export class MockGoogleCalendarClient {
  private eventsData: Map<string, GoogleCalendarEvent[]> = new Map();
  private calendarsData: Map<string, GoogleCalendarListEntry> = new Map();
  private webhooksData: Map<string, GoogleCalendarWebhookPayload> = new Map();
  private shouldThrow = false;
  private mockError: any = null;

  // Set mock data for a calendar
  setCalendarEvents(calendarId: string, events: GoogleCalendarEvent[]): this {
    this.eventsData.set(calendarId, events);
    return this;
  }

  // Set mock calendar info
  setCalendar(calendarId: string, calendar: GoogleCalendarListEntry): this {
    this.calendarsData.set(calendarId, calendar);
    return this;
  }

  // Set mock webhook
  setWebhook(webhookId: string, webhook: GoogleCalendarWebhookPayload): this {
    this.webhooksData.set(webhookId, webhook);
    return this;
  }

  // Set error for all operations
  withError(error: any): this {
    this.mockError = error;
    this.shouldThrow = false;
    return this;
  }

  // Set error that should throw
  withThrowingError(error: any): this {
    this.mockError = error;
    this.shouldThrow = true;
    return this;
  }

  // Get the events API
  get events() {
    const self = this;
    
    return {
      list: jest.fn(async (params: any) => {
        if (self.shouldThrow && self.mockError) {
          throw new Error(self.mockError.error?.message || 'Mock error');
        }

        if (self.mockError) {
          return { data: self.mockError };
        }

        const calendarId = params.calendarId || 'primary';
        const events = self.eventsData.get(calendarId) || [];
        
        // Apply basic filtering
        let filteredEvents = events;
        if (params.timeMin) {
          filteredEvents = filteredEvents.filter(event => {
            const eventStart = new Date(event.start.dateTime || event.start.date);
            return eventStart >= new Date(params.timeMin);
          });
        }
        if (params.timeMax) {
          filteredEvents = filteredEvents.filter(event => {
            const eventStart = new Date(event.start.dateTime || event.start.date);
            return eventStart <= new Date(params.timeMax);
          });
        }

        return {
          data: createMockGoogleCalendarEventsListResponse({
            items: filteredEvents,
            summary: self.calendarsData.get(calendarId)?.summary || 'Test Calendar',
          }),
        };
      }),

      insert: jest.fn(async (params: any) => {
        if (self.shouldThrow && self.mockError) {
          throw new Error(self.mockError.error?.message || 'Mock error');
        }

        if (self.mockError) {
          return { data: self.mockError };
        }

        const calendarId = params.calendarId || 'primary';
        const eventData = params.resource || {};
        const newEvent = createMockGoogleCalendarEventResponse({
          id: `generated-${Date.now()}`,
          summary: eventData.summary || 'New Event',
          description: eventData.description || 'Event Description',
          start: eventData.start || { dateTime: '2024-01-15T10:00:00+04:00', timeZone: 'Asia/Dubai' },
          end: eventData.end || { dateTime: '2024-01-15T11:00:00+04:00', timeZone: 'Asia/Dubai' },
          location: eventData.location,
          attendees: eventData.attendees,
        });

        // Add to mock events
        const existingEvents = self.eventsData.get(calendarId) || [];
        existingEvents.push(newEvent);
        self.eventsData.set(calendarId, existingEvents);

        return { data: newEvent };
      }),

      patch: jest.fn(async (params: any) => {
        if (self.shouldThrow && self.mockError) {
          throw new Error(self.mockError.error?.message || 'Mock error');
        }

        if (self.mockError) {
          return { data: self.mockError };
        }

        const calendarId = params.calendarId || 'primary';
        const eventId = params.eventId;
        const eventData = params.resource;
        
        const existingEvents = self.eventsData.get(calendarId) || [];
        const eventIndex = existingEvents.findIndex(event => event.id === eventId);
        
        if (eventIndex >= 0) {
          const updatedEvent = {
            ...existingEvents[eventIndex],
            ...eventData,
            updated: new Date().toISOString(),
          };
          existingEvents[eventIndex] = updatedEvent;
          self.eventsData.set(calendarId, existingEvents);
          
          return { data: createMockGoogleCalendarEventResponse(updatedEvent) };
        } else {
          throw new Error('Event not found');
        }
      }),

      delete: jest.fn(async (params: any) => {
        if (self.shouldThrow && self.mockError) {
          throw new Error(self.mockError.error?.message || 'Mock error');
        }

        if (self.mockError) {
          return { data: self.mockError };
        }

        const calendarId = params.calendarId || 'primary';
        const eventId = params.eventId;
        
        const existingEvents = self.eventsData.get(calendarId) || [];
        const filteredEvents = existingEvents.filter(event => event.id !== eventId);
        self.eventsData.set(calendarId, filteredEvents);

        return { data: {} };
      }),

      watch: jest.fn(async (params: any) => {
        if (self.shouldThrow && self.mockError) {
          throw new Error(self.mockError.error?.message || 'Mock error');
        }

        if (self.mockError) {
          return { data: self.mockError };
        }

        const webhookId = `webhook-${Date.now()}`;
        const webhook = createMockGoogleCalendarWatchResponse({
          id: webhookId,
          address: params.resource.address,
          resourceId: `resource-${Date.now()}`,
        });

        self.setWebhook(webhookId, webhook);
        return { data: webhook };
      }),

      stop: jest.fn(async (params: any) => {
        if (self.shouldThrow && self.mockError) {
          throw new Error(self.mockError.error?.message || 'Mock error');
        }

        if (self.mockError) {
          return { data: self.mockError };
        }

        const webhookId = params.resource.id;
        self.webhooksData.delete(webhookId);
        return { data: {} };
      }),
    };
  }

  // Get the calendars API
  get calendars() {
    const self = this;
    
    return {
      get: jest.fn(async (params: any) => {
        if (self.shouldThrow && self.mockError) {
          throw new Error(self.mockError.error?.message || 'Mock error');
        }

        if (self.mockError) {
          return { data: self.mockError };
        }

        const calendarId = params.calendarId || 'primary';
        const calendar = self.calendarsData.get(calendarId) || createMockGoogleCalendarListEntry({
          id: calendarId,
          summary: 'Primary Calendar',
          primary: true,
        });

        return { data: calendar };
      }),
    };
  }

  // Get the calendarList API
  get calendarList() {
    const self = this;
    
    return {
      list: jest.fn(async (params: any) => {
        if (self.shouldThrow && self.mockError) {
          throw new Error(self.mockError.error?.message || 'Mock error');
        }

        if (self.mockError) {
          return { data: self.mockError };
        }

        const calendars = Array.from(self.calendarsData.values());
        return {
          data: {
            kind: 'calendar#calendarList',
            etag: '"test-etag"',
            items: calendars,
          },
        };
      }),
    };
  }
}

// Global mock client instance
export const mockGoogleCalendarClient = new MockGoogleCalendarClient();

// Helper functions for common test scenarios
export const setupMockCalendarEvents = (calendarId: string, count: number = 3) => {
  const events = createMockGoogleCalendarEvents(count);
  mockGoogleCalendarClient.setCalendarEvents(calendarId, events);
  return events;
};

export const setupMockCalendar = (calendarId: string, overrides: Partial<GoogleCalendarListEntry> = {}) => {
  const calendar = createMockGoogleCalendarListEntry({
    id: calendarId,
    ...overrides,
  });
  mockGoogleCalendarClient.setCalendar(calendarId, calendar);
  return calendar;
};

export const setupMockWebhook = (webhookId: string, overrides: Partial<GoogleCalendarWebhookPayload> = {}) => {
  const webhook = createMockGoogleCalendarWebhookPayload({
    id: webhookId,
    ...overrides,
  });
  mockGoogleCalendarClient.setWebhook(webhookId, webhook);
  return webhook;
};

// Clear all mocks
export const clearAllGoogleCalendarMocks = () => {
  mockGoogleCalendarClient.eventsData.clear();
  mockGoogleCalendarClient.calendarsData.clear();
  mockGoogleCalendarClient.webhooksData.clear();
  mockGoogleCalendarClient.shouldThrow = false;
  mockGoogleCalendarClient.mockError = null;
  
  // Reset mock auth
  mockGoogleCalendarAuth.isInitialized = false;
  mockGoogleCalendarAuth.hasServiceAccount = false;
  mockGoogleCalendarAuth.hasApiKey = false;
  mockGoogleCalendarAuth.mockError = null;
  mockGoogleCalendarAuth.shouldThrow = false;
  
  jest.clearAllMocks();
};

// Reset to default state
export const resetMockGoogleCalendar = () => {
  clearAllGoogleCalendarMocks();
  
  // Set up default calendars
  setupMockCalendar('primary', { summary: 'Primary Calendar', primary: true });
  setupMockCalendar('test@example.com', { summary: 'Test Calendar' });
  
  // Set up default events
  setupMockCalendarEvents('primary', 2);
  setupMockCalendarEvents('test@example.com', 1);
};

// Mock Google Calendar Auth
export class MockGoogleCalendarAuth {
  public isInitialized = false;
  public hasServiceAccount = false;
  public hasApiKey = false;
  public mockError: any = null;
  public shouldThrow = false;

  // Set authentication state
  withServiceAccount(): this {
    this.hasServiceAccount = true;
    this.isInitialized = true;
    return this;
  }

  withApiKey(): this {
    this.hasApiKey = true;
    this.isInitialized = true;
    return this;
  }

  withError(error: any): this {
    this.mockError = error;
    this.shouldThrow = true;
    return this;
  }

  // Mock methods
  async initializeServiceAccount(): Promise<void> {
    if (this.shouldThrow && this.mockError) {
      throw new Error(this.mockError.message || 'Service account initialization failed');
    }
    this.hasServiceAccount = true;
    this.isInitialized = true;
  }

  initializeApiKey(): void {
    if (this.shouldThrow && this.mockError) {
      throw new Error(this.mockError.message || 'API key initialization failed');
    }
    this.hasApiKey = true;
    this.isInitialized = true;
  }

  async getCalendarClient() {
    if (this.shouldThrow && this.mockError) {
      throw new Error(this.mockError.message || 'Failed to get calendar client');
    }
    return mockGoogleCalendarClient;
  }

  getApiKey(): string | null {
    return this.hasApiKey ? 'mock-api-key' : null;
  }

  validateCalendarId(calendarId: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(calendarId) || 
           calendarId === 'primary' ||
           /^[a-zA-Z0-9._%+-]+@group\.calendar\.google\.com$/.test(calendarId);
  }

  async testCalendarAccess(calendarId: string): Promise<boolean> {
    if (this.shouldThrow && this.mockError) {
      throw new Error(this.mockError.message || 'Calendar access test failed');
    }
    return this.validateCalendarId(calendarId);
  }

  async getCalendarList(): Promise<GoogleCalendarListEntry[]> {
    if (this.shouldThrow && this.mockError) {
      throw new Error(this.mockError.message || 'Failed to get calendar list');
    }
    return Array.from(mockGoogleCalendarClient.calendarsData.values());
  }

  async refreshToken(): Promise<void> {
    if (this.shouldThrow && this.mockError) {
      throw new Error(this.mockError.message || 'Token refresh failed');
    }
  }

  hasServiceAccountAuth(): boolean {
    return this.hasServiceAccount;
  }

  hasApiKeyAuth(): boolean {
    return this.hasApiKey;
  }

  getAuthStatus(): {
    hasServiceAccount: boolean;
    hasApiKey: boolean;
    isInitialized: boolean;
  } {
    return {
      hasServiceAccount: this.hasServiceAccount,
      hasApiKey: this.hasApiKey,
      isInitialized: this.isInitialized,
    };
  }
}

// Global mock auth instance
export const mockGoogleCalendarAuth = new MockGoogleCalendarAuth();
