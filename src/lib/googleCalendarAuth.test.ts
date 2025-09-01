import { GoogleCalendarAuth } from './googleCalendarAuth';

// Mock environment variables
const mockEnv = {
  GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL: 'test@project.iam.gserviceaccount.com',
  GOOGLE_CALENDAR_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----\n',
  GOOGLE_CALENDAR_PROJECT_ID: 'test-project',
  GOOGLE_CALENDAR_API_KEY: 'mock-api-key'
};

describe('GoogleCalendarAuth', () => {
  let auth: GoogleCalendarAuth;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
    delete process.env.GOOGLE_CALENDAR_PROJECT_ID;
    delete process.env.GOOGLE_CALENDAR_API_KEY;
    
    // Reset singleton instance for fresh test
    (GoogleCalendarAuth as any).instance = undefined;
    auth = GoogleCalendarAuth.getInstance();
  });

  describe('validateCalendarId', () => {
    it('should validate email calendar IDs', () => {
      expect(auth.validateCalendarId('user@example.com')).toBe(true);
      expect(auth.validateCalendarId('test.user@domain.co.uk')).toBe(true);
    });

    it('should validate group calendar IDs', () => {
      expect(auth.validateCalendarId('group@group.calendar.google.com')).toBe(true);
      expect(auth.validateCalendarId('team-calendar@group.calendar.google.com')).toBe(true);
    });

    it('should validate primary calendar ID', () => {
      expect(auth.validateCalendarId('primary')).toBe(true);
    });

    it('should reject invalid calendar IDs', () => {
      expect(auth.validateCalendarId('invalid-id')).toBe(false);
      expect(auth.validateCalendarId('')).toBe(false);
      expect(auth.validateCalendarId('not-an-email')).toBe(false);
    });
  });

  describe('initializeApiKey', () => {
    it('should initialize with valid API key', () => {
      process.env.GOOGLE_CALENDAR_API_KEY = mockEnv.GOOGLE_CALENDAR_API_KEY;
      
      expect(() => auth.initializeApiKey()).not.toThrow();
      expect(auth.hasApiKeyAuth()).toBe(true);
    });

    it('should throw error when API key is missing', () => {
      expect(() => auth.initializeApiKey()).toThrow(
        'Google Calendar API key not configured'
      );
    });
  });

  describe('initializeServiceAccount', () => {
    it('should throw error when service account credentials are missing', async () => {
      await expect(auth.initializeServiceAccount()).rejects.toThrow(
        'Google Calendar service account credentials not configured'
      );
    });

    it('should throw error when only some credentials are provided', async () => {
      process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL = mockEnv.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL;
      
      await expect(auth.initializeServiceAccount()).rejects.toThrow(
        'Google Calendar service account credentials not configured'
      );
    });
  });

  describe('getAuthStatus', () => {
    it('should return correct authentication status', () => {
      const status = auth.getAuthStatus();
      
      expect(status).toHaveProperty('hasServiceAccount');
      expect(status).toHaveProperty('hasApiKey');
      expect(status).toHaveProperty('isInitialized');
      expect(typeof status.hasServiceAccount).toBe('boolean');
      expect(typeof status.hasApiKey).toBe('boolean');
      expect(typeof status.isInitialized).toBe('boolean');
    });
  });

  describe('getApiKey', () => {
    it('should return API key when available', () => {
      process.env.GOOGLE_CALENDAR_API_KEY = mockEnv.GOOGLE_CALENDAR_API_KEY;
      auth.initializeApiKey();
      
      expect(auth.getApiKey()).toBe(mockEnv.GOOGLE_CALENDAR_API_KEY);
    });

    it('should return null when API key is not available', () => {
      expect(auth.getApiKey()).toBeNull();
    });
  });
});
