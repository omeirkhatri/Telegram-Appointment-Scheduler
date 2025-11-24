// server-only can't be imported in client bundles; ensure only server code imports this file

/**
 * Google Calendar Service
 *
 * This service handles all Google Calendar operations using service account authentication.
 * It provides methods for calendar creation, sharing, event management, and error handling.
 */

import { config } from '@/lib/env';
import {
    isRetryableError as isRetryableErrorCode
} from '@/lib/errorCodes';
import { isFeatureEnabled } from '@/lib/featureFlags';
import {
    CalendarErrorCode,
    CalendarStatusResponse,
    CreateCalendarEventRequest,
    CreateCalendarRequest,
    getCalendarName,
    isValidGoogleCalendarId,
    isValidGoogleEventId,
    ShareCalendarRequest
} from '@/types/calendar';
import { google } from 'googleapis';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface GoogleCalendarCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface CalendarCreationResult {
  success: boolean;
  calendarId?: string;
  calendarUrl?: string;
  errorCode?: CalendarErrorCode;
  errorMessage?: string;
}

export interface CalendarSharingResult {
  success: boolean;
  errorCode?: CalendarErrorCode;
  errorMessage?: string;
}

export interface EventCreationResult {
  success: boolean;
  eventId?: string;
  eventUrl?: string;
  errorCode?: CalendarErrorCode;
  errorMessage?: string;
}

export interface CalendarOperationOptions {
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
  validateInput?: boolean;
}

// =============================================================================
// GOOGLE CALENDAR SERVICE CLASS
// =============================================================================

export class GoogleCalendarService {
  private calendar: any;
  private auth: any;
  private _isInitialized: boolean = false;
  private readonly defaultOptions: CalendarOperationOptions = {
    retryCount: 0,
    maxRetries: 3,
    timeout: 30000,
    validateInput: true
  };

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the Google Calendar service with service account credentials
   */
  private async initializeService(): Promise<void> {
    try {
      console.log('🔧 Starting Google Calendar service initialization...');

      // Check if Google Calendar is enabled
      const isEnabled = isFeatureEnabled('GOOGLE_CALENDAR_ENABLED');
      console.log('🔧 Google Calendar enabled:', isEnabled);
      if (!isEnabled) {
        console.warn('⚠️ Google Calendar integration is disabled');
        this._isInitialized = false;
        return;
      }

      // Check if configuration is available
      const isConfigured = config.googleCalendar.isConfigured();
      console.log('🔧 Google Calendar configured:', isConfigured);
      if (!isConfigured) {
        console.warn('⚠️ Google Calendar service account credentials not configured');
        this._isInitialized = false;
        return;
      }

      // Validate configuration
      config.googleCalendar.validateConfig();

      // Get service account credentials
      const credentials = config.googleCalendar.getServiceAccountCredentials();

      // Create GoogleAuth client with service account credentials
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });

      // Get the auth client
      const authClient = await this.auth.getClient();

      // Initialize calendar API
      this.calendar = google.calendar({ version: 'v3', auth: authClient });

      // Test authentication
      await this.testAuthentication();

      this._isInitialized = true;
      console.log('✅ Google Calendar service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar service:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      this._isInitialized = false;
      // Don't throw error, just mark as not initialized
    }
  }

  /**
   * Check if the service is properly initialized
   */
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Ensure the service is initialized before performing operations
   */
  private ensureInitialized(): void {
    if (!this._isInitialized) {
      throw new Error('Google Calendar service is not initialized. Please check your configuration.');
    }
  }

  /**
   * Test authentication with Google Calendar API
   */
  private async testAuthentication(): Promise<void> {
    try {
      const response = await this.calendar.calendarList.list({
        maxResults: 1
      });

      if (!response.data) {
        throw new Error('No response from Google Calendar API');
      }

      console.log('✅ Google Calendar API authentication successful');
    } catch (error) {
      console.error('❌ Google Calendar API authentication failed:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensure service is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Google Calendar service not initialized');
    }
  }

  /**
   * Execute operation with retry logic and error handling
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: CalendarOperationOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Check if error is retryable
        const errorCode = this.mapGoogleErrorToCalendarError(lastError);
        if (!isRetryableErrorCode(errorCode) || attempt === opts.maxRetries!) {
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`⏳ Retrying Google Calendar operation in ${delay}ms (attempt ${attempt + 1}/${opts.maxRetries! + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Operation failed after all retries');
  }

  /**
   * Map Google API errors to calendar error codes
   */
  private mapGoogleErrorToCalendarError(error: Error): CalendarErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes('quota') || message.includes('rate limit')) {
      return 'QUOTA_EXCEEDED';
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'PERMISSION_DENIED';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'CALENDAR_NOT_FOUND';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'GOOGLE_API_UNAVAILABLE';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'GOOGLE_API_UNAVAILABLE';
    }
    if (message.includes('invalid') || message.includes('bad request')) {
      return 'CALENDAR_CREATION_FAILED';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Validate calendar creation request
   */
  private validateCreateCalendarRequest(request: CreateCalendarRequest): void {
    if (!request.staff_id) {
      throw new Error('Staff ID is required');
    }
    if (!request.staff_name || request.staff_name.trim().length === 0) {
      throw new Error('Staff name is required');
    }
    if (!request.staff_type || request.staff_type.trim().length === 0) {
      throw new Error('Staff type is required');
    }
    if (!request.staff_email || !this.isValidEmail(request.staff_email)) {
      throw new Error('Valid staff email is required');
    }
  }

  /**
   * Validate calendar sharing request
   */
  private validateShareCalendarRequest(request: ShareCalendarRequest): void {
    if (!request.staff_id) {
      throw new Error('Staff ID is required');
    }
    if (!request.google_calendar_id || !isValidGoogleCalendarId(request.google_calendar_id)) {
      throw new Error('Valid Google Calendar ID is required');
    }
    if (!request.staff_email || !this.isValidEmail(request.staff_email)) {
      throw new Error('Valid staff email is required');
    }
  }

  /**
   * Validate calendar event creation request
   */
  private validateCreateEventRequest(request: CreateCalendarEventRequest): void {
    if (!request.staff_id) {
      throw new Error('Staff ID is required');
    }
    if (!request.google_calendar_id || !isValidGoogleCalendarId(request.google_calendar_id)) {
      throw new Error('Valid Google Calendar ID is required');
    }
    if (!request.event_title || request.event_title.trim().length === 0) {
      throw new Error('Event title is required');
    }
    if (!request.start_time || !this.isValidDateTime(request.start_time)) {
      throw new Error('Valid start time is required');
    }
    if (!request.end_time || !this.isValidDateTime(request.end_time)) {
      throw new Error('Valid end time is required');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate datetime format
   */
  private isValidDateTime(dateTime: string): boolean {
    const date = new Date(dateTime);
    return !isNaN(date.getTime());
  }

  // =============================================================================
  // CALENDAR OPERATIONS
  // =============================================================================

  /**
   * Create a new calendar for a staff member
   */
  async createCalendar(
    request: CreateCalendarRequest,
    options: CalendarOperationOptions = {}
  ): Promise<CalendarCreationResult> {
    this.ensureInitialized();

    try {
      // Validate input
      if (options.validateInput !== false) {
        this.validateCreateCalendarRequest(request);
      }

      const calendarName = getCalendarName(request.staff_name, request.staff_type);

      const result = await this.executeWithRetry(async () => {
        const response = await this.calendar.calendars.insert({
          requestBody: {
            summary: calendarName,
            description: `Calendar for ${request.staff_name} (${request.staff_type}) at BestDOC`,
            timeZone: config.googleCalendar.defaultTimezone,
            accessRole: 'owner'
          }
        });

        return response.data;
      }, options);

      return {
        success: true,
        calendarId: result.id,
        calendarUrl: `https://calendar.google.com/calendar/embed?src=${result.id}`
      };

    } catch (error) {
      const errorCode = this.mapGoogleErrorToCalendarError(error as Error);
      console.error(`❌ Failed to create calendar for ${request.staff_name}:`, error);

      return {
        success: false,
        errorCode,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Share a calendar with a staff member
   */
  async shareCalendar(
    request: ShareCalendarRequest,
    options: CalendarOperationOptions = {}
  ): Promise<CalendarSharingResult> {
    this.ensureInitialized();

    try {
      // Validate input
      if (options.validateInput !== false) {
        this.validateShareCalendarRequest(request);
      }

      await this.executeWithRetry(async () => {
        await this.calendar.acl.insert({
          calendarId: request.google_calendar_id,
          requestBody: {
            role: request.permission_level || 'reader',
            scope: {
              type: 'user',
              value: request.staff_email
            }
          }
        });
      }, options);

      return { success: true };

    } catch (error) {
      const errorCode = this.mapGoogleErrorToCalendarError(error as Error);
      console.error(`❌ Failed to share calendar ${request.google_calendar_id} with ${request.staff_email}:`, error);

      return {
        success: false,
        errorCode,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create an event in a staff calendar
   */
  async createEvent(
    request: CreateCalendarEventRequest,
    options: CalendarOperationOptions = {}
  ): Promise<EventCreationResult> {
    this.ensureInitialized();

    try {
      // Validate input
      if (options.validateInput !== false) {
        this.validateCreateEventRequest(request);
      }

      const result = await this.executeWithRetry(async () => {
        const event = {
          summary: request.event_title,
          description: request.event_description || '',
          start: {
            dateTime: request.start_time,
            timeZone: config.googleCalendar.defaultTimezone
          },
          end: {
            dateTime: request.end_time,
            timeZone: config.googleCalendar.defaultTimezone
          },
          location: request.location || '',
          attendees: request.attendees?.map(email => ({ email })) || []
        };

        const response = await this.calendar.events.insert({
          calendarId: request.google_calendar_id,
          requestBody: event
        });

        return response.data;
      }, options);

      return {
        success: true,
        eventId: result.id,
        eventUrl: result.htmlLink
      };

    } catch (error) {
      const errorCode = this.mapGoogleErrorToCalendarError(error as Error);
      console.error(`❌ Failed to create event in calendar ${request.google_calendar_id}:`, error);

      return {
        success: false,
        errorCode,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing event in a staff calendar
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: Partial<CreateCalendarEventRequest>,
    options: CalendarOperationOptions = {}
  ): Promise<EventCreationResult> {
    this.ensureInitialized();

    try {
      if (!isValidGoogleCalendarId(calendarId)) {
        throw new Error('Invalid calendar ID');
      }
      if (!isValidGoogleEventId(eventId)) {
        throw new Error('Invalid event ID');
      }

      const result = await this.executeWithRetry(async () => {
        // First get the existing event
        const existingEvent = await this.calendar.events.get({
          calendarId,
          eventId
        });

        // Update the event with new data
        const updatedEvent = {
          ...existingEvent.data,
          summary: updates.event_title || existingEvent.data.summary,
          description: updates.event_description !== undefined ? updates.event_description : existingEvent.data.description,
          location: updates.location !== undefined ? updates.location : existingEvent.data.location,
          start: updates.start_time ? {
            dateTime: updates.start_time,
            timeZone: config.googleCalendar.defaultTimezone
          } : existingEvent.data.start,
          end: updates.end_time ? {
            dateTime: updates.end_time,
            timeZone: config.googleCalendar.defaultTimezone
          } : existingEvent.data.end,
          attendees: updates.attendees?.map(email => ({ email })) || existingEvent.data.attendees
        };

        const response = await this.calendar.events.update({
          calendarId,
          eventId,
          requestBody: updatedEvent
        });

        return response.data;
      }, options);

      return {
        success: true,
        eventId: result.id,
        eventUrl: result.htmlLink
      };

    } catch (error) {
      const errorCode = this.mapGoogleErrorToCalendarError(error as Error);
      console.error(`❌ Failed to update event ${eventId} in calendar ${calendarId}:`, error);

      return {
        success: false,
        errorCode,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete an event from a staff calendar
   */
  async deleteEvent(
    calendarId: string,
    eventId: string,
    options: CalendarOperationOptions = {}
  ): Promise<{ success: boolean; errorCode?: CalendarErrorCode; errorMessage?: string }> {
    this.ensureInitialized();

    try {
      if (!isValidGoogleCalendarId(calendarId)) {
        throw new Error('Invalid calendar ID');
      }
      if (!isValidGoogleEventId(eventId)) {
        throw new Error('Invalid event ID');
      }

      await this.executeWithRetry(async () => {
        await this.calendar.events.delete({
          calendarId,
          eventId
        });
      }, options);

      return { success: true };

    } catch (error) {
      const errorCode = this.mapGoogleErrorToCalendarError(error as Error);
      console.error(`❌ Failed to delete event ${eventId} from calendar ${calendarId}:`, error);

      return {
        success: false,
        errorCode,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get calendar status and information
   */
  async getCalendarStatus(calendarId: string): Promise<CalendarStatusResponse | null> {
    this.ensureInitialized();

    try {
      if (!isValidGoogleCalendarId(calendarId)) {
        throw new Error('Invalid calendar ID');
      }

      const response = await this.calendar.calendars.get({
        calendarId
      });

      return {
        staff_id: '', // This would need to be passed in or looked up
        google_calendar_id: response.data.id,
        verification_status: 'not_required', // This would be determined by other logic
        last_operation: 'create_calendar',
        last_operation_status: 'success',
        last_operation_date: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to get calendar status for ${calendarId}:`, error);
      return null;
    }
  }

  /**
   * List all calendars owned by the service account
   */
  async listCalendars(): Promise<Array<{ id: string; summary: string; description?: string }>> {
    this.ensureInitialized();

    try {
      const response = await this.calendar.calendarList.list({
        minAccessRole: 'owner'
      });

      return response.data.items?.map((calendar: any) => ({
        id: calendar.id,
        summary: calendar.summary,
        description: calendar.description
      })) || [];

    } catch (error) {
      console.error('❌ Failed to list calendars:', error);
      throw error;
    }
  }

  /**
   * Check if a calendar exists
   */
  async calendarExists(calendarId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      if (!isValidGoogleCalendarId(calendarId)) {
        return false;
      }

      await this.calendar.calendars.get({
        calendarId
      });

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a specific event exists in Google Calendar
   */
  async eventExists(calendarId: string, eventId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      if (!isValidGoogleCalendarId(calendarId) || !eventId) {
        return false;
      }

      await this.calendar.events.get({
        calendarId,
        eventId
      });

      return true;

    } catch (error) {
      // If the event doesn't exist, Google Calendar API returns 404
      // If there's any other error, we consider the event as not existing
      return false;
    }
  }

  /**
   * List events from a calendar
   */
  async listEvents(calendarId: string, options: {
    maxResults?: number;
    timeMin?: string;
    timeMax?: string;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
  } = {}): Promise<Array<{
    id: string;
    summary: string;
    description?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    created?: string;
    updated?: string;
  }>> {
    this.ensureInitialized();

    try {
      if (!isValidGoogleCalendarId(calendarId)) {
        throw new Error('Invalid calendar ID');
      }

      const response = await this.calendar.events.list({
        calendarId,
        maxResults: options.maxResults || 100,
        timeMin: options.timeMin || new Date().toISOString(),
        timeMax: options.timeMax,
        singleEvents: options.singleEvents !== false,
        orderBy: options.orderBy || 'startTime'
      });

      return response.data.items || [];

    } catch (error) {
      console.error('❌ Failed to list events:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    lastChecked: string;
  }> {
    try {
      this.ensureInitialized();

      // Test API connectivity
      await this.calendar.calendarList.list({ maxResults: 1 });

      return {
        status: 'healthy',
        message: 'Google Calendar service is operational',
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Google Calendar service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString()
      };
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let googleCalendarServiceInstance: GoogleCalendarService | null = null;

/**
 * Get the singleton instance of GoogleCalendarService
 */
export function getGoogleCalendarService(): GoogleCalendarService {
  if (!googleCalendarServiceInstance) {
    googleCalendarServiceInstance = new GoogleCalendarService();
  }
  return googleCalendarServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetGoogleCalendarService(): void {
  googleCalendarServiceInstance = null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default GoogleCalendarService;
