import { WebhookService } from './webhookService';

// Mock the services
jest.mock('@/services/googleCalendarService', () => ({
  googleCalendarService: {
    testCalendarConnection: jest.fn(),
    setupCalendarWebhook: jest.fn(),
    stopCalendarWebhook: jest.fn(),
  },
}));

jest.mock('@/services/staffService', () => ({
  staffService: {
    getStaffMember: jest.fn(),
    getStaffMembers: jest.fn(),
  },
}));

describe('WebhookService', () => {
  let webhookService: WebhookService;

  beforeEach(() => {
    jest.clearAllMocks();
    webhookService = new WebhookService();
  });

  describe('setupWebhookForStaff', () => {
    it('should set up webhook successfully for staff with calendar', async () => {
      const { staffService } = require('@/services/staffService');
      const { googleCalendarService } = require('@/services/googleCalendarService');

      // Mock staff member
      staffService.getStaffMember.mockResolvedValue({
        id: 'staff-1',
        first_name: 'Dr. Sarah',
        last_name: 'Smith',
        google_calendar_id: 'dr.sarah@medicare.com',
      });

      // Mock calendar access test
      googleCalendarService.testCalendarConnection.mockResolvedValue(true);

      // Mock webhook setup
      googleCalendarService.setupCalendarWebhook.mockResolvedValue('webhook-123');

      const result = await webhookService.setupWebhookForStaff('staff-1');

      expect(result.success).toBe(true);
      expect(result.webhookId).toBe('webhook-123');
      expect(staffService.getStaffMember).toHaveBeenCalledWith('staff-1');
      expect(googleCalendarService.testCalendarConnection).toHaveBeenCalledWith('dr.sarah@medicare.com');
      expect(googleCalendarService.setupCalendarWebhook).toHaveBeenCalled();
    });

    it('should fail when staff member not found', async () => {
      const { staffService } = require('@/services/staffService');

      staffService.getStaffMember.mockResolvedValue(null);

      const result = await webhookService.setupWebhookForStaff('staff-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Staff member not found');
    });

    it('should fail when staff has no Google Calendar ID', async () => {
      const { staffService } = require('@/services/staffService');

      staffService.getStaffMember.mockResolvedValue({
        id: 'staff-1',
        first_name: 'Dr. Sarah',
        last_name: 'Smith',
        google_calendar_id: null,
      });

      const result = await webhookService.setupWebhookForStaff('staff-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Staff member has no Google Calendar ID configured');
    });

    it('should fail when cannot access calendar', async () => {
      const { staffService } = require('@/services/staffService');
      const { googleCalendarService } = require('@/services/googleCalendarService');

      staffService.getStaffMember.mockResolvedValue({
        id: 'staff-1',
        first_name: 'Dr. Sarah',
        last_name: 'Smith',
        google_calendar_id: 'dr.sarah@medicare.com',
      });

      googleCalendarService.testCalendarConnection.mockResolvedValue(false);

      const result = await webhookService.setupWebhookForStaff('staff-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot access staff calendar');
    });

    it('should handle service errors', async () => {
      const { staffService } = require('@/services/staffService');

      staffService.getStaffMember.mockRejectedValue(new Error('Service error'));

      const result = await webhookService.setupWebhookForStaff('staff-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });
  });

  describe('removeWebhookForStaff', () => {
    it('should remove webhook successfully', async () => {
      const { staffService } = require('@/services/staffService');
      const { googleCalendarService } = require('@/services/googleCalendarService');

      staffService.getStaffMember.mockResolvedValue({
        id: 'staff-1',
        first_name: 'Dr. Sarah',
        last_name: 'Smith',
        google_calendar_id: 'dr.sarah@medicare.com',
      });

      // Mock webhook info retrieval (would be from database in real implementation)
      const webhookServiceSpy = jest.spyOn(webhookService as any, 'getWebhookInfo');
      webhookServiceSpy.mockResolvedValue({
        webhookId: 'webhook-123',
        calendarId: 'dr.sarah@medicare.com',
      });

      const result = await webhookService.removeWebhookForStaff('staff-1');

      expect(result.success).toBe(true);
      expect(googleCalendarService.stopCalendarWebhook).toHaveBeenCalledWith(
        'dr.sarah@medicare.com',
        'webhook-123'
      );
    });

    it('should fail when staff member not found', async () => {
      const { staffService } = require('@/services/staffService');

      staffService.getStaffMember.mockResolvedValue(null);

      const result = await webhookService.removeWebhookForStaff('staff-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Staff member or calendar not found');
    });

    it('should fail when no webhook found', async () => {
      const { staffService } = require('@/services/staffService');

      staffService.getStaffMember.mockResolvedValue({
        id: 'staff-1',
        first_name: 'Dr. Sarah',
        last_name: 'Smith',
        google_calendar_id: 'dr.sarah@medicare.com',
      });

      const webhookServiceSpy = jest.spyOn(webhookService as any, 'getWebhookInfo');
      webhookServiceSpy.mockResolvedValue(null);

      const result = await webhookService.removeWebhookForStaff('staff-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No webhook found for staff member');
    });
  });

  describe('refreshWebhookForStaff', () => {
    it('should refresh webhook successfully', async () => {
      const { staffService } = require('@/services/staffService');
      const { googleCalendarService } = require('@/services/googleCalendarService');

      staffService.getStaffMember.mockResolvedValue({
        id: 'staff-1',
        first_name: 'Dr. Sarah',
        last_name: 'Smith',
        google_calendar_id: 'dr.sarah@medicare.com',
      });

      // Mock webhook info retrieval
      const webhookServiceSpy = jest.spyOn(webhookService as any, 'getWebhookInfo');
      webhookServiceSpy.mockResolvedValue({
        webhookId: 'webhook-123',
        calendarId: 'dr.sarah@medicare.com',
      });

      // Mock calendar access test
      googleCalendarService.testCalendarConnection.mockResolvedValue(true);

      // Mock webhook setup
      googleCalendarService.setupCalendarWebhook.mockResolvedValue('webhook-456');

      const result = await webhookService.refreshWebhookForStaff('staff-1');

      expect(result.success).toBe(true);
      expect(result.webhookId).toBe('webhook-456');
      expect(googleCalendarService.stopCalendarWebhook).toHaveBeenCalled();
      expect(googleCalendarService.setupCalendarWebhook).toHaveBeenCalled();
    });
  });

  describe('setupWebhooksForAllStaff', () => {
    it('should set up webhooks for all staff with calendar integration', async () => {
      const { staffService } = require('@/services/staffService');
      const { googleCalendarService } = require('@/services/googleCalendarService');

      staffService.getStaffMembers.mockResolvedValue([
        {
          id: 'staff-1',
          first_name: 'Dr. Sarah',
          last_name: 'Smith',
          google_calendar_id: 'dr.sarah@medicare.com',
        },
        {
          id: 'staff-2',
          first_name: 'Nurse',
          last_name: 'Johnson',
          google_calendar_id: 'nurse.johnson@medicare.com',
        },
      ]);

      googleCalendarService.testCalendarConnection.mockResolvedValue(true);
      googleCalendarService.setupCalendarWebhook
        .mockResolvedValueOnce('webhook-1')
        .mockResolvedValueOnce('webhook-2');

      const result = await webhookService.setupWebhooksForAllStaff();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.results[0].webhookId).toBe('webhook-1');
      expect(result.results[1].webhookId).toBe('webhook-2');
    });

    it('should handle partial failures', async () => {
      const { staffService } = require('@/services/staffService');
      const { googleCalendarService } = require('@/services/googleCalendarService');

      staffService.getStaffMembers.mockResolvedValue([
        {
          id: 'staff-1',
          first_name: 'Dr. Sarah',
          last_name: 'Smith',
          google_calendar_id: 'dr.sarah@medicare.com',
        },
        {
          id: 'staff-2',
          first_name: 'Nurse',
          last_name: 'Johnson',
          google_calendar_id: 'nurse.johnson@medicare.com',
        },
      ]);

      googleCalendarService.testCalendarConnection
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      googleCalendarService.setupCalendarWebhook.mockResolvedValue('webhook-1');

      const result = await webhookService.setupWebhooksForAllStaff();

      expect(result.success).toBe(true); // At least one succeeded
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });
  });

  describe('getWebhookStatusForAllStaff', () => {
    it('should return webhook status for all staff', async () => {
      const { staffService } = require('@/services/staffService');

      staffService.getStaffMembers.mockResolvedValue([
        {
          id: 'staff-1',
          first_name: 'Dr. Sarah',
          last_name: 'Smith',
          google_calendar_id: 'dr.sarah@medicare.com',
        },
        {
          id: 'staff-2',
          first_name: 'Nurse',
          last_name: 'Johnson',
          google_calendar_id: null,
        },
      ]);

      const result = await webhookService.getWebhookStatusForAllStaff();

      expect(result).toHaveLength(2);
      expect(result[0].staffId).toBe('staff-1');
      expect(result[0].staffName).toBe('Dr. Sarah Smith');
      expect(result[0].hasGoogleCalendar).toBe(true);
      expect(result[0].hasWebhook).toBe(false); // No webhook info stored in test
      expect(result[1].hasGoogleCalendar).toBe(false);
    });
  });

  describe('testWebhookConnectivity', () => {
    it('should test connectivity successfully', async () => {
      const { staffService } = require('@/services/staffService');
      const { googleCalendarService } = require('@/services/googleCalendarService');

      staffService.getStaffMember.mockResolvedValue({
        id: 'staff-1',
        first_name: 'Dr. Sarah',
        last_name: 'Smith',
        google_calendar_id: 'dr.sarah@medicare.com',
      });

      googleCalendarService.testCalendarConnection.mockResolvedValue(true);

      const webhookServiceSpy = jest.spyOn(webhookService as any, 'getWebhookInfo');
      webhookServiceSpy.mockResolvedValue({
        webhookId: 'webhook-123',
        calendarId: 'dr.sarah@medicare.com',
      });

      const result = await webhookService.testWebhookConnectivity('staff-1');

      expect(result.success).toBe(true);
      expect(result.calendarAccess).toBe(true);
      expect(result.webhookSetup).toBe(true);
    });

    it('should fail when staff member not found', async () => {
      const { staffService } = require('@/services/staffService');

      staffService.getStaffMember.mockResolvedValue(null);

      const result = await webhookService.testWebhookConnectivity('staff-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Staff member not found');
    });

    it('should handle missing calendar access', async () => {
      const { staffService } = require('@/services/staffService');
      const { googleCalendarService } = require('@/services/googleCalendarService');

      staffService.getStaffMember.mockResolvedValue({
        id: 'staff-1',
        first_name: 'Dr. Sarah',
        last_name: 'Smith',
        google_calendar_id: 'dr.sarah@medicare.com',
      });

      googleCalendarService.testCalendarConnection.mockResolvedValue(false);

      const result = await webhookService.testWebhookConnectivity('staff-1');

      expect(result.success).toBe(false);
      expect(result.calendarAccess).toBe(false);
      expect(result.webhookSetup).toBe(false);
    });
  });

  describe('getWebhookExpirationWarnings', () => {
    it('should return expiration warnings for expiring webhooks', async () => {
      const { staffService } = require('@/services/staffService');

      staffService.getStaffMembers.mockResolvedValue([
        {
          id: 'staff-1',
          first_name: 'Dr. Sarah',
          last_name: 'Smith',
          google_calendar_id: 'dr.sarah@medicare.com',
        },
      ]);

      const webhookServiceSpy = jest.spyOn(webhookService as any, 'getWebhookInfo');
      webhookServiceSpy.mockResolvedValue({
        webhookId: 'webhook-123',
        calendarId: 'dr.sarah@medicare.com',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      });

      const result = await webhookService.getWebhookExpirationWarnings();

      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe('staff-1');
      expect(result[0].staffName).toBe('Dr. Sarah Smith');
      expect(result[0].daysUntilExpiry).toBeLessThanOrEqual(3);
    });

    it('should not return warnings for non-expiring webhooks', async () => {
      const { staffService } = require('@/services/staffService');

      staffService.getStaffMembers.mockResolvedValue([
        {
          id: 'staff-1',
          first_name: 'Dr. Sarah',
          last_name: 'Smith',
          google_calendar_id: 'dr.sarah@medicare.com',
        },
      ]);

      const webhookServiceSpy = jest.spyOn(webhookService as any, 'getWebhookInfo');
      webhookServiceSpy.mockResolvedValue({
        webhookId: 'webhook-123',
        calendarId: 'dr.sarah@medicare.com',
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      });

      const result = await webhookService.getWebhookExpirationWarnings();

      expect(result).toHaveLength(0);
    });
  });
});
