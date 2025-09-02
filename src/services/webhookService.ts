import { googleCalendarService } from './googleCalendarService';
import { staffService } from './staffService';

// Webhook management service for Google Calendar integration
export class WebhookService {
  private static readonly WEBHOOK_TTL = 2592000; // 30 days in seconds
  private static readonly WEBHOOK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  /**
   * Set up webhook for a staff member's calendar
   */
  async setupWebhookForStaff(staffId: string): Promise<{
    success: boolean;
    webhookId?: string;
    error?: string;
  }> {
    try {
      // Get staff member
      const staff = await staffService.getStaffMember(staffId);
      if (!staff) {
        return { success: false, error: 'Staff member not found' };
      }

      if (!staff.google_calendar_id) {
        return { success: false, error: 'Staff member has no Google Calendar ID configured' };
      }

      // Test calendar access
      const hasAccess = await googleCalendarService.testCalendarConnection(staff.google_calendar_id);
      if (!hasAccess) {
        return { success: false, error: 'Cannot access staff calendar' };
      }

      // Create webhook URL
      const webhookUrl = `${this.WEBHOOK_BASE_URL}/api/webhooks/calendar`;

      // Set up webhook with Google Calendar
      const webhookId = await googleCalendarService.setupCalendarWebhook(
        staff.google_calendar_id,
        webhookUrl
      );

      // Store webhook information (in a real implementation, this would be in a database)
      await this.storeWebhookInfo(staffId, webhookId, staff.google_calendar_id);

      console.log(`Webhook set up successfully for staff ${staffId}: ${webhookId}`);

      return {
        success: true,
        webhookId
      };
    } catch (error) {
      console.error('Error setting up webhook for staff:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove webhook for a staff member
   */
  async removeWebhookForStaff(staffId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get staff member
      const staff = await staffService.getStaffMember(staffId);
      if (!staff || !staff.google_calendar_id) {
        return { success: false, error: 'Staff member or calendar not found' };
      }

      // Get stored webhook information
      const webhookInfo = await this.getWebhookInfo(staffId);
      if (!webhookInfo) {
        return { success: false, error: 'No webhook found for staff member' };
      }

      // Stop webhook with Google Calendar
      await googleCalendarService.stopCalendarWebhook(
        staff.google_calendar_id,
        webhookInfo.webhookId
      );

      // Remove webhook information
      await this.removeWebhookInfo(staffId);

      console.log(`Webhook removed successfully for staff ${staffId}`);

      return { success: true };
    } catch (error) {
      console.error('Error removing webhook for staff:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Refresh webhook for a staff member (renew before expiration)
   */
  async refreshWebhookForStaff(staffId: string): Promise<{
    success: boolean;
    webhookId?: string;
    error?: string;
  }> {
    try {
      // Remove existing webhook
      const removeResult = await this.removeWebhookForStaff(staffId);
      if (!removeResult.success) {
        console.warn('Failed to remove existing webhook:', removeResult.error);
      }

      // Set up new webhook
      return await this.setupWebhookForStaff(staffId);
    } catch (error) {
      console.error('Error refreshing webhook for staff:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set up webhooks for all staff members with Google Calendar integration
   */
  async setupWebhooksForAllStaff(): Promise<{
    success: boolean;
    results: Array<{
      staffId: string;
      staffName: string;
      success: boolean;
      webhookId?: string;
      error?: string;
    }>;
  }> {
    try {
      // Get all staff members with Google Calendar integration
      const staffMembers = await staffService.getStaffMembers({
        has_google_calendar: true,
        status: 'active'
      });

      const results = [];

      for (const staff of staffMembers) {
        const result = await this.setupWebhookForStaff(staff.id);
        results.push({
          staffId: staff.id,
          staffName: `${staff.first_name} ${staff.last_name}`,
          success: result.success,
          webhookId: result.webhookId,
          error: result.error
        });
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`Set up webhooks for ${successCount}/${results.length} staff members`);

      return {
        success: successCount > 0,
        results
      };
    } catch (error) {
      console.error('Error setting up webhooks for all staff:', error);
      return {
        success: false,
        results: []
      };
    }
  }

  /**
   * Get webhook status for all staff members
   */
  async getWebhookStatusForAllStaff(): Promise<Array<{
    staffId: string;
    staffName: string;
    hasGoogleCalendar: boolean;
    hasWebhook: boolean;
    webhookId?: string;
    lastSync?: string;
  }>> {
    try {
      const staffMembers = await staffService.getStaffMembers({ status: 'active' });
      const statuses = [];

      for (const staff of staffMembers) {
        const webhookInfo = await this.getWebhookInfo(staff.id);

        statuses.push({
          staffId: staff.id,
          staffName: `${staff.first_name} ${staff.last_name}`,
          hasGoogleCalendar: !!staff.google_calendar_id,
          hasWebhook: !!webhookInfo,
          webhookId: webhookInfo?.webhookId,
          lastSync: webhookInfo?.lastSync
        });
      }

      return statuses;
    } catch (error) {
      console.error('Error getting webhook status for all staff:', error);
      return [];
    }
  }

  /**
   * Test webhook connectivity for a staff member
   */
  async testWebhookConnectivity(staffId: string): Promise<{
    success: boolean;
    calendarAccess: boolean;
    webhookSetup: boolean;
    error?: string;
  }> {
    try {
      const staff = await staffService.getStaffMember(staffId);
      if (!staff) {
        return {
          success: false,
          calendarAccess: false,
          webhookSetup: false,
          error: 'Staff member not found'
        };
      }

      // Test calendar access
      let calendarAccess = false;
      if (staff.google_calendar_id) {
        calendarAccess = await googleCalendarService.testCalendarConnection(staff.google_calendar_id);
      }

      // Check webhook setup
      const webhookInfo = await this.getWebhookInfo(staffId);
      const webhookSetup = !!webhookInfo;

      return {
        success: calendarAccess && webhookSetup,
        calendarAccess,
        webhookSetup
      };
    } catch (error) {
      console.error('Error testing webhook connectivity:', error);
      return {
        success: false,
        calendarAccess: false,
        webhookSetup: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Store webhook information (placeholder - would be in database in production)
   */
  private async storeWebhookInfo(staffId: string, webhookId: string, calendarId: string): Promise<void> {
    // In a real implementation, this would store in a database table
    // For now, we'll just log it
    console.log(`Storing webhook info: staff=${staffId}, webhook=${webhookId}, calendar=${calendarId}`);

    // Example database structure:
    // webhooks: {
    //   id: string;
    //   staff_id: string;
    //   webhook_id: string;
    //   calendar_id: string;
    //   created_at: string;
    //   expires_at: string;
    //   last_sync: string;
    // }
  }

  /**
   * Get webhook information (placeholder - would be from database in production)
   */
  private async getWebhookInfo(staffId: string): Promise<{
    webhookId: string;
    calendarId: string;
    createdAt: string;
    expiresAt: string;
    lastSync?: string;
  } | null> {
    // In a real implementation, this would query the database
    // For now, return null (no webhook found)
    return null;
  }

  /**
   * Remove webhook information (placeholder - would be from database in production)
   */
  private async removeWebhookInfo(staffId: string): Promise<void> {
    // In a real implementation, this would delete from database
    console.log(`Removing webhook info for staff: ${staffId}`);
  }

  /**
   * Update webhook last sync time
   */
  async updateWebhookLastSync(staffId: string): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Updating last sync time for staff: ${staffId}`);
  }

  /**
   * Get webhook expiration warnings
   */
  async getWebhookExpirationWarnings(): Promise<Array<{
    staffId: string;
    staffName: string;
    expiresAt: string;
    daysUntilExpiry: number;
  }>> {
    try {
      const staffMembers = await staffService.getStaffMembers({
        has_google_calendar: true,
        status: 'active'
      });

      const warnings = [];

      for (const staff of staffMembers) {
        const webhookInfo = await this.getWebhookInfo(staff.id);
        if (webhookInfo) {
          const expiresAt = new Date(webhookInfo.expiresAt);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= 7) { // Warn if expiring within 7 days
            warnings.push({
              staffId: staff.id,
              staffName: `${staff.first_name} ${staff.last_name}`,
              expiresAt: webhookInfo.expiresAt,
              daysUntilExpiry
            });
          }
        }
      }

      return warnings;
    } catch (error) {
      console.error('Error getting webhook expiration warnings:', error);
      return [];
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();
export default webhookService;
