import { JWT } from 'google-auth-library';
import { google } from 'googleapis';

// Google Calendar API v3 Authentication Configuration
export class GoogleCalendarAuth {
  private static instance: GoogleCalendarAuth;
  private auth: JWT | null = null;
  private apiKey: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): GoogleCalendarAuth {
    if (!GoogleCalendarAuth.instance) {
      GoogleCalendarAuth.instance = new GoogleCalendarAuth();
    }
    return GoogleCalendarAuth.instance;
  }

  // Initialize authentication with service account
  async initializeServiceAccount(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const serviceAccountEmail = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
    const projectId = process.env.GOOGLE_CALENDAR_PROJECT_ID;

    if (!serviceAccountEmail || !privateKey || !projectId) {
      throw new Error(
        'Google Calendar service account credentials not configured. ' +
        'Please set GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL, GOOGLE_CALENDAR_PRIVATE_KEY, and GOOGLE_CALENDAR_PROJECT_ID environment variables.',
      );
    }

    try {
      // Create JWT client for service account authentication
      this.auth = new JWT({
        email: serviceAccountEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.readonly',
        ],
        subject: serviceAccountEmail, // Impersonate the service account
      });

      // Test the authentication
      await this.auth.authorize();
      this.isInitialized = true;

      console.log('Google Calendar service account authentication initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Calendar service account authentication:', error);
      throw new Error(`Google Calendar authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Initialize API key authentication (for read-only operations)
  initializeApiKey(): void {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Google Calendar API key not configured. ' +
        'Please set GOOGLE_CALENDAR_API_KEY environment variable.',
      );
    }

    this.apiKey = apiKey;
    console.log('Google Calendar API key authentication initialized');
  }

  // Get authenticated calendar client
  async getCalendarClient() {
    if (!this.auth && !this.apiKey) {
      // Try to initialize service account first, fall back to API key
      try {
        await this.initializeServiceAccount();
      } catch (error) {
        console.warn('Service account authentication failed, falling back to API key:', error);
        this.initializeApiKey();
      }
    }

    if (this.auth) {
      return google.calendar({ version: 'v3', auth: this.auth });
    } else if (this.apiKey) {
      return google.calendar({ version: 'v3', auth: this.apiKey });
    } else {
      throw new Error('No Google Calendar authentication method available');
    }
  }

  // Get API key for direct fetch requests
  getApiKey(): string | null {
    return this.apiKey;
  }

  // Check if service account authentication is available
  hasServiceAccountAuth(): boolean {
    return this.auth !== null && this.isInitialized;
  }

  // Check if API key authentication is available
  hasApiKeyAuth(): boolean {
    return this.apiKey !== null;
  }

  // Get authentication status
  getAuthStatus(): {
    hasServiceAccount: boolean;
    hasApiKey: boolean;
    isInitialized: boolean;
  } {
    return {
      hasServiceAccount: this.hasServiceAccountAuth(),
      hasApiKey: this.hasApiKeyAuth(),
      isInitialized: this.hasServiceAccountAuth() || this.hasApiKeyAuth(),
    };
  }

  // Validate calendar ID format
  validateCalendarId(calendarId: string): boolean {
    // Google Calendar IDs can be email addresses or special IDs
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const specialIdRegex = /^[a-zA-Z0-9._-]+@group\.calendar\.google\.com$/;
    const primaryCalendarRegex = /^primary$/;

    return emailRegex.test(calendarId) ||
           specialIdRegex.test(calendarId) ||
           primaryCalendarRegex.test(calendarId);
  }

  // Test calendar access permissions
  async testCalendarAccess(calendarId: string): Promise<boolean> {
    try {
      const calendar = await this.getCalendarClient();

      // Try to get calendar metadata
      await calendar.calendars.get({
        calendarId: calendarId,
      });

      return true;
    } catch (error) {
      console.error(`Failed to access calendar ${calendarId}:`, error);
      return false;
    }
  }

  // Get calendar list for authenticated user/service account
  async getCalendarList(): Promise<any[]> {
    try {
      const calendar = await this.getCalendarClient();

      const response = await calendar.calendarList.list({
        maxResults: 100,
        showDeleted: false,
        showHidden: false,
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Failed to get calendar list:', error);
      throw error;
    }
  }

  // Refresh authentication token (for service account)
  async refreshToken(): Promise<void> {
    if (this.auth) {
      try {
        await this.auth.authorize();
        console.log('Google Calendar authentication token refreshed');
      } catch (error) {
        console.error('Failed to refresh authentication token:', error);
        throw error;
      }
    }
  }
}

// Export singleton instance
export const googleCalendarAuth = GoogleCalendarAuth.getInstance();
export default googleCalendarAuth;
