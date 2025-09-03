import { DEFAULT_EMAIL_PREFERENCES, validateEmailPreferences } from '@/types/emailPreferences';
import { emailPreferencesService } from './emailPreferencesService';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}));

describe('EmailPreferencesService', () => {
  const mockSupabase = require('@/lib/supabase').supabase;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGlobalEmailPreferences', () => {
    it('should return default preferences when no data exists', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        error: { code: 'PGRST116' }, // No rows found
      });

      const preferences = await emailPreferencesService.getGlobalEmailPreferences();

      expect(preferences).toEqual(DEFAULT_EMAIL_PREFERENCES);
    });

    it('should return stored preferences when they exist', async () => {
      const storedPreferences = {
        emailNotificationsEnabled: false,
        reminderTimeBeforeAppointment: 30,
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { preferences: storedPreferences },
        error: null,
      });

      const preferences = await emailPreferencesService.getGlobalEmailPreferences();

      expect(preferences.emailNotificationsEnabled).toBe(false);
      expect(preferences.reminderTimeBeforeAppointment).toBe(30);
      expect(preferences.fromEmail).toBe(DEFAULT_EMAIL_PREFERENCES.fromEmail); // Should merge with defaults
    });

    it('should merge stored preferences with defaults', async () => {
      const partialPreferences = {
        emailNotificationsEnabled: false,
        reminderTimeBeforeAppointment: 60,
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { preferences: partialPreferences },
        error: null,
      });

      const preferences = await emailPreferencesService.getGlobalEmailPreferences();

      expect(preferences.emailNotificationsEnabled).toBe(false);
      expect(preferences.reminderTimeBeforeAppointment).toBe(60);
      expect(preferences.smsNotificationsEnabled).toBe(DEFAULT_EMAIL_PREFERENCES.smsNotificationsEnabled);
    });

    it('should return defaults on error', async () => {
      mockSupabase.from().select().eq().single.mockRejectedValue(new Error('Database error'));

      const preferences = await emailPreferencesService.getGlobalEmailPreferences();

      expect(preferences).toEqual(DEFAULT_EMAIL_PREFERENCES);
    });
  });

  describe('updateGlobalEmailPreferences', () => {
    it('should update preferences successfully', async () => {
      const updateData = {
        emailNotificationsEnabled: false,
        reminderTimeBeforeAppointment: 60,
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { preferences: DEFAULT_EMAIL_PREFERENCES },
        error: null,
      });
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: { preferences: { ...DEFAULT_EMAIL_PREFERENCES, ...updateData } },
        error: null,
      });

      const result = await emailPreferencesService.updateGlobalEmailPreferences(updateData);

      expect(result.emailNotificationsEnabled).toBe(false);
      expect(result.reminderTimeBeforeAppointment).toBe(60);
    });

    it('should throw error for invalid preferences', async () => {
      const invalidUpdateData = {
        reminderTimeBeforeAppointment: -1, // Invalid value
      };

      await expect(
        emailPreferencesService.updateGlobalEmailPreferences(invalidUpdateData),
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('resetToDefaults', () => {
    it('should reset preferences to defaults', async () => {
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: { preferences: DEFAULT_EMAIL_PREFERENCES },
        error: null,
      });

      const result = await emailPreferencesService.resetToDefaults();

      expect(result).toEqual(DEFAULT_EMAIL_PREFERENCES);
    });
  });

  describe('getPreference', () => {
    it('should return specific preference value', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { preferences: DEFAULT_EMAIL_PREFERENCES },
        error: null,
      });

      const value = await emailPreferencesService.getPreference('emailNotificationsEnabled');

      expect(value).toBe(DEFAULT_EMAIL_PREFERENCES.emailNotificationsEnabled);
    });
  });

  describe('updatePreference', () => {
    it('should update specific preference value', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { preferences: DEFAULT_EMAIL_PREFERENCES },
        error: null,
      });
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: { preferences: { ...DEFAULT_EMAIL_PREFERENCES, emailNotificationsEnabled: false } },
        error: null,
      });

      const result = await emailPreferencesService.updatePreference('emailNotificationsEnabled', false);

      expect(result.emailNotificationsEnabled).toBe(false);
    });
  });

  describe('areEmailNotificationsEnabled', () => {
    it('should return email notifications status', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { preferences: DEFAULT_EMAIL_PREFERENCES },
        error: null,
      });

      const enabled = await emailPreferencesService.areEmailNotificationsEnabled();

      expect(enabled).toBe(DEFAULT_EMAIL_PREFERENCES.emailNotificationsEnabled);
    });
  });

  describe('testEmailConfiguration', () => {
    it('should return success for valid configuration', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          preferences: {
            ...DEFAULT_EMAIL_PREFERENCES,
            smtpHost: 'smtp.example.com',
            smtpPort: 587,
            fromEmail: 'test@example.com',
          },
        },
        error: null,
      });

      const result = await emailPreferencesService.testEmailConfiguration();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email configuration is valid');
    });

    it('should return error for incomplete configuration', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          preferences: {
            ...DEFAULT_EMAIL_PREFERENCES,
            smtpHost: '',
            smtpPort: undefined,
            fromEmail: '',
          },
        },
        error: null,
      });

      const result = await emailPreferencesService.testEmailConfiguration();

      expect(result.success).toBe(false);
      expect(result.message).toBe('SMTP configuration is incomplete');
    });

    it('should return error for invalid email format', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          preferences: {
            smtpHost: 'smtp.example.com',
            smtpPort: 587,
            fromEmail: 'invalid-email',
          },
        },
        error: null,
      });

      const result = await emailPreferencesService.testEmailConfiguration();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email address format');
    });
  });

  describe('exportPreferences', () => {
    it('should export preferences as JSON string', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { preferences: DEFAULT_EMAIL_PREFERENCES },
        error: null,
      });

      const jsonString = await emailPreferencesService.exportPreferences();
      const parsed = JSON.parse(jsonString);

      expect(parsed).toEqual(DEFAULT_EMAIL_PREFERENCES);
    });
  });

  describe('importPreferences', () => {
    it('should import preferences from JSON string', async () => {
      const preferencesToImport = {
        emailNotificationsEnabled: false,
        reminderTimeBeforeAppointment: 60,
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { preferences: DEFAULT_EMAIL_PREFERENCES },
        error: null,
      });
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: { preferences: { ...DEFAULT_EMAIL_PREFERENCES, ...preferencesToImport } },
        error: null,
      });

      const jsonString = JSON.stringify(preferencesToImport);
      const result = await emailPreferencesService.importPreferences(jsonString);

      expect(result.emailNotificationsEnabled).toBe(false);
      expect(result.reminderTimeBeforeAppointment).toBe(60);
    });

    it('should throw error for invalid JSON', async () => {
      await expect(
        emailPreferencesService.importPreferences('invalid json'),
      ).rejects.toThrow('Failed to import preferences');
    });

    it('should throw error for invalid preferences', async () => {
      const invalidPreferences = {
        reminderTimeBeforeAppointment: -1,
      };

      await expect(
        emailPreferencesService.importPreferences(JSON.stringify(invalidPreferences)),
      ).rejects.toThrow('Failed to import preferences');
    });
  });
});

describe('validateEmailPreferences', () => {
  it('should validate correct preferences', () => {
    const preferences = {
      reminderTimeBeforeAppointment: 30,
      maxRetryAttempts: 3,
      retryDelayMinutes: 5,
      smtpPort: 587,
      fromEmail: 'test@example.com',
    };

    const result = validateEmailPreferences(preferences);

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('should detect invalid reminder time', () => {
    const preferences = {
      reminderTimeBeforeAppointment: 2, // Too low
    };

    const result = validateEmailPreferences(preferences);

    expect(result.isValid).toBe(false);
    expect(result.errors.reminderTimeBeforeAppointment).toContain('Reminder time must be between 5 and 1440 minutes');
  });

  it('should detect invalid max retry attempts', () => {
    const preferences = {
      maxRetryAttempts: 15, // Too high
    };

    const result = validateEmailPreferences(preferences);

    expect(result.isValid).toBe(false);
    expect(result.errors.maxRetryAttempts).toContain('Max retry attempts must be between 1 and 10');
  });

  it('should detect invalid retry delay', () => {
    const preferences = {
      retryDelayMinutes: 0, // Too low
    };

    const result = validateEmailPreferences(preferences);

    expect(result.isValid).toBe(false);
    expect(result.errors.retryDelayMinutes).toContain('Retry delay must be between 1 and 60 minutes');
  });

  it('should detect invalid SMTP port', () => {
    const preferences = {
      smtpPort: 70000, // Too high
    };

    const result = validateEmailPreferences(preferences);

    expect(result.isValid).toBe(false);
    expect(result.errors.smtpPort).toContain('SMTP port must be between 1 and 65535');
  });

  it('should detect invalid email format', () => {
    const preferences = {
      fromEmail: 'invalid-email',
    };

    const result = validateEmailPreferences(preferences);

    expect(result.isValid).toBe(false);
    expect(result.errors.fromEmail).toContain('Invalid email address format');
  });
});
