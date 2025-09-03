import { supabase } from '@/lib/supabase';
import { 
  GlobalEmailPreferences, 
  DEFAULT_EMAIL_PREFERENCES, 
  validateEmailPreferences 
} from '@/types/emailPreferences';

export class EmailPreferencesService {
  private static readonly PREFERENCES_TABLE = 'email_preferences';
  private static readonly PREFERENCES_KEY = 'global_settings';

  /**
   * Get global email preferences
   */
  async getGlobalEmailPreferences(): Promise<GlobalEmailPreferences> {
    try {
      const { data, error } = await supabase
        .from(this.PREFERENCES_TABLE)
        .select('preferences')
        .eq('key', this.PREFERENCES_KEY)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, return defaults
          return DEFAULT_EMAIL_PREFERENCES;
        }
        throw new Error(`Failed to fetch email preferences: ${error.message}`);
      }

      // Merge with defaults to ensure all fields are present
      return {
        ...DEFAULT_EMAIL_PREFERENCES,
        ...data.preferences,
      };
    } catch (error) {
      console.error('Error fetching email preferences:', error);
      // Return defaults on error
      return DEFAULT_EMAIL_PREFERENCES;
    }
  }

  /**
   * Update global email preferences
   */
  async updateGlobalEmailPreferences(
    preferences: Partial<GlobalEmailPreferences>
  ): Promise<GlobalEmailPreferences> {
    try {
      // Validate preferences
      const validation = validateEmailPreferences(preferences);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
      }

      // Get current preferences
      const currentPreferences = await this.getGlobalEmailPreferences();
      
      // Merge with current preferences
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences,
      };

      // Upsert preferences
      const { data, error } = await supabase
        .from(this.PREFERENCES_TABLE)
        .upsert({
          key: this.PREFERENCES_KEY,
          preferences: updatedPreferences,
          updated_at: new Date().toISOString(),
        })
        .select('preferences')
        .single();

      if (error) {
        throw new Error(`Failed to update email preferences: ${error.message}`);
      }

      return data.preferences;
    } catch (error) {
      console.error('Error updating email preferences:', error);
      throw error;
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(): Promise<GlobalEmailPreferences> {
    try {
      const { data, error } = await supabase
        .from(this.PREFERENCES_TABLE)
        .upsert({
          key: this.PREFERENCES_KEY,
          preferences: DEFAULT_EMAIL_PREFERENCES,
          updated_at: new Date().toISOString(),
        })
        .select('preferences')
        .single();

      if (error) {
        throw new Error(`Failed to reset email preferences: ${error.message}`);
      }

      return data.preferences;
    } catch (error) {
      console.error('Error resetting email preferences:', error);
      throw error;
    }
  }

  /**
   * Get specific preference value
   */
  async getPreference<K extends keyof GlobalEmailPreferences>(
    key: K
  ): Promise<GlobalEmailPreferences[K]> {
    const preferences = await this.getGlobalEmailPreferences();
    return preferences[key];
  }

  /**
   * Update specific preference value
   */
  async updatePreference<K extends keyof GlobalEmailPreferences>(
    key: K,
    value: GlobalEmailPreferences[K]
  ): Promise<GlobalEmailPreferences> {
    return this.updateGlobalEmailPreferences({ [key]: value } as Partial<GlobalEmailPreferences>);
  }

  /**
   * Check if email notifications are enabled
   */
  async areEmailNotificationsEnabled(): Promise<boolean> {
    return this.getPreference('emailNotificationsEnabled');
  }

  /**
   * Check if specific notification type is enabled
   */
  async isNotificationTypeEnabled(type: keyof GlobalEmailPreferences): Promise<boolean> {
    const preferences = await this.getGlobalEmailPreferences();
    return Boolean(preferences[type]);
  }

  /**
   * Get email timing preferences
   */
  async getEmailTimingPreferences(): Promise<{
    reminderTimeBeforeAppointment: number;
    dailyAgendaTime: string;
    timezone: string;
  }> {
    const preferences = await this.getGlobalEmailPreferences();
    return {
      reminderTimeBeforeAppointment: preferences.reminderTimeBeforeAppointment,
      dailyAgendaTime: preferences.dailyAgendaTime,
      timezone: preferences.timezone,
    };
  }

  /**
   * Get email content preferences
   */
  async getEmailContentPreferences(): Promise<{
    includeAppointmentDetails: boolean;
    includePatientContactInfo: boolean;
    includeGoogleMapsLink: boolean;
    includeStaffContactInfo: boolean;
  }> {
    const preferences = await this.getGlobalEmailPreferences();
    return {
      includeAppointmentDetails: preferences.includeAppointmentDetails,
      includePatientContactInfo: preferences.includePatientContactInfo,
      includeGoogleMapsLink: preferences.includeGoogleMapsLink,
      includeStaffContactInfo: preferences.includeStaffContactInfo,
    };
  }

  /**
   * Get SMTP configuration (sensitive data)
   */
  async getSMTPConfiguration(): Promise<{
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUsername?: string;
    fromEmail?: string;
    fromName?: string;
  }> {
    const preferences = await this.getGlobalEmailPreferences();
    return {
      smtpHost: preferences.smtpHost,
      smtpPort: preferences.smtpPort,
      smtpSecure: preferences.smtpSecure,
      smtpUsername: preferences.smtpUsername,
      fromEmail: preferences.fromEmail,
      fromName: preferences.fromName,
    };
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      const preferences = await this.getGlobalEmailPreferences();
      
      // Basic validation
      if (!preferences.smtpHost || !preferences.smtpPort || !preferences.fromEmail) {
        return {
          success: false,
          message: 'SMTP configuration is incomplete',
          error: 'Missing required SMTP settings',
        };
      }

      // Here you would typically send a test email
      // For now, we'll just validate the configuration
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(preferences.fromEmail)) {
        return {
          success: false,
          message: 'Invalid email address format',
          error: 'From email is not valid',
        };
      }

      return {
        success: true,
        message: 'Email configuration is valid',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to test email configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Export preferences as JSON
   */
  async exportPreferences(): Promise<string> {
    const preferences = await this.getGlobalEmailPreferences();
    return JSON.stringify(preferences, null, 2);
  }

  /**
   * Import preferences from JSON
   */
  async importPreferences(jsonData: string): Promise<GlobalEmailPreferences> {
    try {
      const preferences = JSON.parse(jsonData) as Partial<GlobalEmailPreferences>;
      
      // Validate imported preferences
      const validation = validateEmailPreferences(preferences);
      if (!validation.isValid) {
        throw new Error(`Invalid preferences: ${JSON.stringify(validation.errors)}`);
      }

      return this.updateGlobalEmailPreferences(preferences);
    } catch (error) {
      throw new Error(`Failed to import preferences: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }
}

// Export singleton instance
export const emailPreferencesService = new EmailPreferencesService();
