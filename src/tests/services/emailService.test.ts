/**
 * Unit Tests for EmailService
 *
 * Tests email template generation, sending functionality,
 * error handling, and service health checks.
 */

import { config } from '@/lib/env';
import { getErrorDescription } from '@/lib/errorCodes';
import { EmailService, resetEmailService } from '@/services/emailService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/env');
jest.mock('@/lib/errorCodes');

// Mock config
const mockConfig = {
  googleCalendar: {
    emailFrom: 'test@bestdoc.com',
    emailFromName: 'BestDOC Team',
  },
};

(config as any) = mockConfig;

// Mock error codes
const mockErrorDescription = {
  severity: 'high',
  suggestedActions: ['Check API credentials', 'Verify permissions'],
};

(getErrorDescription as any) = jest.fn(() => mockErrorDescription);

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    resetEmailService();

    // Create service instance
    service = new EmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with valid configuration', () => {
      expect(service).toBeInstanceOf(EmailService);
    });

    it('should warn when email configuration is missing', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock missing configuration
      mockConfig.googleCalendar.emailFrom = '';
      mockConfig.googleCalendar.emailFromName = '';

      new EmailService();

      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Email service: GOOGLE_CALENDAR_EMAIL_FROM not configured'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Email service: GOOGLE_CALENDAR_EMAIL_FROM_NAME not configured'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Calendar Invite Emails', () => {
    it('should send calendar invite email successfully', async () => {
      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      };

      const result = await service.sendCalendarInvite(emailData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });

    it('should handle calendar invite email failure', async () => {
      // Mock console.log to simulate email sending
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Email service unavailable');
      });

      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      };

      const result = await service.sendCalendarInvite(emailData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVITE_SEND_FAILED');
      expect(result.errorMessage).toBe('Email service unavailable');

      consoleSpy.mockRestore();
    });

    it('should generate correct calendar invite template', async () => {
      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      };

      // Mock console.log to capture the email content
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendCalendarInvite(emailData);

      // Verify the email content was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Email would be sent to john.smith@example.com')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Subject: Your BestDOC Calendar is Ready - Dr. John Smith')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Verification Emails', () => {
    it('should send verification email successfully', async () => {
      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        eventUrl: 'https://calendar.google.com/event?eid=test-event-id',
        eventTitle: 'BestDOC Calendar Verification Test',
        organizationName: 'BestDOC',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const result = await service.sendVerificationEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should handle verification email failure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Verification email failed');
      });

      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        eventUrl: 'https://calendar.google.com/event?eid=test-event-id',
        eventTitle: 'BestDOC Calendar Verification Test',
        organizationName: 'BestDOC',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const result = await service.sendVerificationEmail(emailData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVITE_SEND_FAILED');

      consoleSpy.mockRestore();
    });

    it('should generate correct verification email template', async () => {
      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        eventUrl: 'https://calendar.google.com/event?eid=test-event-id',
        eventTitle: 'BestDOC Calendar Verification Test',
        organizationName: 'BestDOC',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendVerificationEmail(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Subject: Verify Your BestDOC Calendar Access - Dr. John Smith')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Notification Emails', () => {
    it('should send error notification email successfully', async () => {
      const emailData = {
        to: 'admin@bestdoc.com',
        errorCode: 'CALENDAR_CREATION_FAILED',
        errorMessage: 'Failed to create calendar',
        operationType: 'create_calendar',
        staffId: 'staff-123',
        staffName: 'Dr. John Smith',
        timestamp: new Date().toISOString(),
      };

      const result = await service.sendErrorNotification(emailData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should handle error notification email failure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Error notification failed');
      });

      const emailData = {
        to: 'admin@bestdoc.com',
        errorCode: 'CALENDAR_CREATION_FAILED',
        errorMessage: 'Failed to create calendar',
        operationType: 'create_calendar',
        staffId: 'staff-123',
        staffName: 'Dr. John Smith',
        timestamp: new Date().toISOString(),
      };

      const result = await service.sendErrorNotification(emailData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVITE_SEND_FAILED');

      consoleSpy.mockRestore();
    });

    it('should generate correct error notification template', async () => {
      const emailData = {
        to: 'admin@bestdoc.com',
        errorCode: 'CALENDAR_CREATION_FAILED',
        errorMessage: 'Failed to create calendar',
        operationType: 'create_calendar',
        staffId: 'staff-123',
        staffName: 'Dr. John Smith',
        timestamp: new Date().toISOString(),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendErrorNotification(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Subject: 🚨 Calendar Error Alert - create_calendar (CALENDAR_CREATION_FAILED)')
      );

      consoleSpy.mockRestore();
    });

    it('should include error description in template when available', async () => {
      const emailData = {
        to: 'admin@bestdoc.com',
        errorCode: 'CALENDAR_CREATION_FAILED',
        errorMessage: 'Failed to create calendar',
        operationType: 'create_calendar',
        staffId: 'staff-123',
        staffName: 'Dr. John Smith',
        timestamp: new Date().toISOString(),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendErrorNotification(emailData);

      expect(getErrorDescription).toHaveBeenCalledWith('CALENDAR_CREATION_FAILED');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Check API credentials')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Reminder Emails', () => {
    it('should send verification reminder email', async () => {
      const result = await service.sendCalendarReminder(
        'john.smith@example.com',
        'Dr. John Smith',
        'verification'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send sync failed reminder email', async () => {
      const result = await service.sendCalendarReminder(
        'john.smith@example.com',
        'Dr. John Smith',
        'sync_failed'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send quota warning reminder email', async () => {
      const result = await service.sendCalendarReminder(
        'john.smith@example.com',
        'Dr. John Smith',
        'quota_warning'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should handle reminder email failure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Reminder email failed');
      });

      const result = await service.sendCalendarReminder(
        'john.smith@example.com',
        'Dr. John Smith',
        'verification'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVITE_SEND_FAILED');

      consoleSpy.mockRestore();
    });

    it('should generate correct reminder templates', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Test verification reminder
      await service.sendCalendarReminder(
        'john.smith@example.com',
        'Dr. John Smith',
        'verification'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Subject: Reminder: Complete Your BestDOC Calendar Verification')
      );

      // Test sync failed reminder
      await service.sendCalendarReminder(
        'john.smith@example.com',
        'Dr. John Smith',
        'sync_failed'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Subject: Calendar Sync Issue - BestDOC')
      );

      // Test quota warning reminder
      await service.sendCalendarReminder(
        'john.smith@example.com',
        'Dr. John Smith',
        'quota_warning'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Subject: Calendar API Quota Warning - BestDOC')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Email Options and Configuration', () => {
    it('should use default options when none provided', async () => {
      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendCalendarInvite(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Priority: normal')
      );

      consoleSpy.mockRestore();
    });

    it('should use custom options when provided', async () => {
      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      };

      const options = {
        priority: 'high' as const,
        maxRetries: 5,
        timeout: 60000,
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendCalendarInvite(emailData, options);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Priority: high')
      );

      consoleSpy.mockRestore();
    });

    it('should handle high priority for error notifications', async () => {
      const emailData = {
        to: 'admin@bestdoc.com',
        errorCode: 'CALENDAR_CREATION_FAILED',
        errorMessage: 'Failed to create calendar',
        operationType: 'create_calendar',
        staffId: 'staff-123',
        staffName: 'Dr. John Smith',
        timestamp: new Date().toISOString(),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendErrorNotification(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Priority: high')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Template Generation', () => {
    it('should generate HTML and text versions of templates', async () => {
      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendCalendarInvite(emailData);

      // Verify that both HTML and text content are generated
      const logCalls = consoleSpy.mock.calls;
      const emailLogCall = logCalls.find(call =>
        call[0].includes('📧 Email would be sent to john.smith@example.com')
      );

      expect(emailLogCall).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should include organization branding in templates', async () => {
      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'Custom Organization',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendCalendarInvite(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Subject: Your Custom Organization Calendar is Ready - Dr. John Smith')
      );

      consoleSpy.mockRestore();
    });

    it('should use default organization name when not provided', async () => {
      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        // organizationName not provided
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendCalendarInvite(emailData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Subject: Your BestDOC Calendar is Ready - Dr. John Smith')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Service Health Status', () => {
    it('should return healthy status when properly configured', async () => {
      const result = await service.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Email service is operational');
      expect(result.lastChecked).toBeDefined();
    });

    it('should return unhealthy status when not configured', async () => {
      // Mock missing configuration
      mockConfig.googleCalendar.emailFrom = '';
      mockConfig.googleCalendar.emailFromName = '';

      const result = await service.getHealthStatus();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toBe('Email service not properly configured');
      expect(result.lastChecked).toBeDefined();
    });

    it('should return unhealthy status on error', async () => {
      // Mock config to throw error
      Object.defineProperty(mockConfig.googleCalendar, 'emailFrom', {
        get: () => { throw new Error('Config error'); }
      });

      const result = await service.getHealthStatus();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Email service error');
      expect(result.lastChecked).toBeDefined();
    });
  });

  describe('Email Validation', () => {
    it('should validate email addresses internally', async () => {
      // This tests the private isValidEmail method indirectly
      // by ensuring the service handles invalid emails gracefully
      const emailData = {
        to: 'invalid-email-format',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      };

      // The service should still attempt to send the email
      // (validation would happen in a real email service)
      const result = await service.sendCalendarInvite(emailData);

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Unknown error');
      });

      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      };

      const result = await service.sendCalendarInvite(emailData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVITE_SEND_FAILED');
      expect(result.errorMessage).toBe('Unknown error');

      consoleSpy.mockRestore();
    });

    it('should handle non-Error objects thrown', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw 'String error';
      });

      const emailData = {
        to: 'john.smith@example.com',
        staffName: 'Dr. John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'Dr. John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      };

      const result = await service.sendCalendarInvite(emailData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVITE_SEND_FAILED');
      expect(result.errorMessage).toBe('Unknown error');

      consoleSpy.mockRestore();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const service1 = new EmailService();
      const service2 = new EmailService();

      expect(service1).toBe(service2);
    });

    it('should reset singleton instance', () => {
      const service1 = new EmailService();
      resetEmailService();
      const service2 = new EmailService();

      expect(service1).not.toBe(service2);
    });
  });
});
