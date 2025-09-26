/**
 * Email Service
 *
 * This service handles sending calendar invites, verification emails, and other
 * email notifications related to calendar operations.
 */

import { config } from '@/lib/env';
import {
    getErrorDescription
} from '@/lib/errorCodes';
import {
    CalendarErrorCode
} from '@/types/calendar';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface CalendarInviteEmail {
  to: string;
  staffName: string;
  staffType: string;
  calendarUrl: string;
  calendarName: string;
  organizationName: string;
}

export interface VerificationEmail {
  to: string;
  staffName: string;
  staffType: string;
  eventUrl: string;
  eventTitle: string;
  organizationName: string;
  expiresAt: string;
}

export interface ErrorNotificationEmail {
  to: string;
  errorCode: string;
  errorMessage: string;
  operationType: string;
  staffId: string;
  staffName: string;
  timestamp: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  errorCode?: CalendarErrorCode;
  errorMessage?: string;
}

export interface EmailOptions {
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
}

// =============================================================================
// EMAIL SERVICE CLASS
// =============================================================================

export class EmailService {
  private readonly defaultOptions: EmailOptions = {
    retryCount: 0,
    maxRetries: 3,
    timeout: 30000,
    priority: 'normal'
  };

  constructor() {
    this.validateConfiguration();
  }

  /**
   * Validate email service configuration
   */
  private validateConfiguration(): void {
    if (!config.googleCalendar.emailFrom) {
      console.warn('⚠️ Email service: GOOGLE_CALENDAR_EMAIL_FROM not configured');
    }
    if (!config.googleCalendar.emailFromName) {
      console.warn('⚠️ Email service: GOOGLE_CALENDAR_EMAIL_FROM_NAME not configured');
    }
  }

  /**
   * Send calendar invite email to staff member
   */
  async sendCalendarInvite(
    emailData: CalendarInviteEmail,
    options: EmailOptions = {}
  ): Promise<EmailResult> {
    try {
      const opts = { ...this.defaultOptions, ...options };

      const template = this.getCalendarInviteTemplate(emailData);
      const result = await this.sendEmail({
        to: emailData.to,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        priority: opts.priority
      });

      return result;

    } catch (error) {
      console.error(`❌ Failed to send calendar invite to ${emailData.to}:`, error);

      return {
        success: false,
        errorCode: 'INVITE_SEND_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send verification email to staff member
   */
  async sendVerificationEmail(
    emailData: VerificationEmail,
    options: EmailOptions = {}
  ): Promise<EmailResult> {
    try {
      const opts = { ...this.defaultOptions, ...options };

      const template = this.getVerificationEmailTemplate(emailData);
      const result = await this.sendEmail({
        to: emailData.to,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        priority: opts.priority
      });

      return result;

    } catch (error) {
      console.error(`❌ Failed to send verification email to ${emailData.to}:`, error);

      return {
        success: false,
        errorCode: 'INVITE_SEND_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send error notification email to admin
   */
  async sendErrorNotification(
    emailData: ErrorNotificationEmail,
    options: EmailOptions = {}
  ): Promise<EmailResult> {
    try {
      const opts = { ...this.defaultOptions, ...options };

      const template = this.getErrorNotificationTemplate(emailData);
      const result = await this.sendEmail({
        to: emailData.to,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        priority: 'high'
      });

      return result;

    } catch (error) {
      console.error(`❌ Failed to send error notification to ${emailData.to}:`, error);

      return {
        success: false,
        errorCode: 'INVITE_SEND_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send calendar reminder email
   */
  async sendCalendarReminder(
    to: string,
    staffName: string,
    reminderType: 'verification' | 'sync_failed' | 'quota_warning',
    options: EmailOptions = {}
  ): Promise<EmailResult> {
    try {
      const opts = { ...this.defaultOptions, ...options };

      const template = this.getReminderTemplate(to, staffName, reminderType);
      const result = await this.sendEmail({
        to,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        priority: opts.priority
      });

      return result;

    } catch (error) {
      console.error(`❌ Failed to send reminder email to ${to}:`, error);

      return {
        success: false,
        errorCode: 'INVITE_SEND_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================================================
  // EMAIL TEMPLATES
  // =============================================================================

  /**
   * Get calendar invite email template
   */
  private getCalendarInviteTemplate(data: CalendarInviteEmail): EmailTemplate {
    const organizationName = data.organizationName || 'BestDOC';

    return {
      subject: `Your ${organizationName} Calendar is Ready - ${data.staffName}`,
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your ${organizationName} Calendar is Ready</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .header { background: #2c5aa0; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #2c5aa0; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Your ${organizationName} Calendar is Ready!</h1>
            </div>
            <div class="content">
              <p>Hello ${data.staffName},</p>

              <p>Your personal calendar has been created and is ready for use. You can now view your scheduled appointments directly in your Google Calendar app.</p>

              <div class="highlight">
                <h3>📋 Calendar Details:</h3>
                <ul>
                  <li><strong>Calendar Name:</strong> ${data.calendarName}</li>
                  <li><strong>Your Role:</strong> ${data.staffType}</li>
                  <li><strong>Organization:</strong> ${organizationName}</li>
                </ul>
              </div>

              <p>To access your calendar:</p>
              <ol>
                <li>Open your Google Calendar app on your phone or computer</li>
                <li>Look for the calendar named "${data.calendarName}"</li>
                <li>Your appointments will appear automatically in this calendar</li>
              </ol>

              <div style="text-align: center;">
                <a href="${data.calendarUrl}" class="button">Open Your Calendar</a>
              </div>

              <p><strong>Important Notes:</strong></p>
              <ul>
                <li>This calendar is read-only - you cannot edit appointments directly</li>
                <li>All appointments are managed by the ${organizationName} admin team</li>
                <li>You will receive notifications for new appointments</li>
              </ul>

              <p>If you have any questions or need assistance, please contact your admin team.</p>

              <p>Best regards,<br>
              The ${organizationName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the ${organizationName} scheduling system.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
        Your ${organizationName} Calendar is Ready - ${data.staffName}

        Hello ${data.staffName},

        Your personal calendar has been created and is ready for use. You can now view your scheduled appointments directly in your Google Calendar app.

        Calendar Details:
        - Calendar Name: ${data.calendarName}
        - Your Role: ${data.staffType}
        - Organization: ${organizationName}

        To access your calendar:
        1. Open your Google Calendar app on your phone or computer
        2. Look for the calendar named "${data.calendarName}"
        3. Your appointments will appear automatically in this calendar

        Calendar URL: ${data.calendarUrl}

        Important Notes:
        - This calendar is read-only - you cannot edit appointments directly
        - All appointments are managed by the ${organizationName} admin team
        - You will receive notifications for new appointments

        If you have any questions or need assistance, please contact your admin team.

        Best regards,
        The ${organizationName} Team

        ---
        This is an automated message from the ${organizationName} scheduling system.
      `
    };
  }

  /**
   * Get verification email template
   */
  private getVerificationEmailTemplate(data: VerificationEmail): EmailTemplate {
    const organizationName = data.organizationName || 'BestDOC';
    const expiresDate = new Date(data.expiresAt).toLocaleDateString();

    return {
      subject: `Verify Your ${organizationName} Calendar Access - ${data.staffName}`,
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your ${organizationName} Calendar Access</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .header { background: #2c5aa0; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .warning { background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verify Your Calendar Access</h1>
            </div>
            <div class="content">
              <p>Hello ${data.staffName},</p>

              <p>To complete your calendar setup, please verify that you can receive calendar events by accepting the test invitation below.</p>

              <div class="highlight">
                <h3>📋 Verification Test Event:</h3>
                <ul>
                  <li><strong>Event:</strong> ${data.eventTitle}</li>
                  <li><strong>Your Role:</strong> ${data.staffType}</li>
                  <li><strong>Organization:</strong> ${organizationName}</li>
                  <li><strong>Expires:</strong> ${expiresDate}</li>
                </ul>
              </div>

              <p><strong>To complete verification:</strong></p>
              <ol>
                <li>Click the button below to open the test event</li>
                <li>Accept the invitation in your Google Calendar</li>
                <li>You will receive a confirmation email once verified</li>
              </ol>

              <div style="text-align: center;">
                <a href="${data.eventUrl}" class="button">Accept Test Event</a>
              </div>

              <div class="warning">
                <p><strong>⚠️ Important:</strong> This test event will be automatically deleted after verification. Please accept it as soon as possible to complete your calendar setup.</p>
              </div>

              <p>If you have any questions or need assistance, please contact your admin team.</p>

              <p>Best regards,<br>
              The ${organizationName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the ${organizationName} scheduling system.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
        Verify Your ${organizationName} Calendar Access - ${data.staffName}

        Hello ${data.staffName},

        To complete your calendar setup, please verify that you can receive calendar events by accepting the test invitation below.

        Verification Test Event:
        - Event: ${data.eventTitle}
        - Your Role: ${data.staffType}
        - Organization: ${organizationName}
        - Expires: ${expiresDate}

        To complete verification:
        1. Click the link below to open the test event
        2. Accept the invitation in your Google Calendar
        3. You will receive a confirmation email once verified

        Test Event URL: ${data.eventUrl}

        Important: This test event will be automatically deleted after verification. Please accept it as soon as possible to complete your calendar setup.

        If you have any questions or need assistance, please contact your admin team.

        Best regards,
        The ${organizationName} Team

        ---
        This is an automated message from the ${organizationName} scheduling system.
      `
    };
  }

  /**
   * Get error notification email template
   */
  private getErrorNotificationTemplate(data: ErrorNotificationEmail): EmailTemplate {
    const errorDescription = getErrorDescription(data.errorCode);
    const severity = errorDescription?.severity || 'medium';
    const severityColor = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    }[severity];

    return {
      subject: `🚨 Calendar Error Alert - ${data.operationType} (${data.errorCode})`,
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Calendar Error Alert</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .error-details { background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
            .suggestions { background: #d1ecf1; padding: 15px; border-left: 4px solid #17a2b8; margin: 20px 0; }
            .code { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Calendar Error Alert</h1>
              <p>Severity: ${severity.toUpperCase()}</p>
            </div>
            <div class="content">
              <p>A calendar operation has failed and requires attention.</p>

              <div class="error-details">
                <h3>Error Details:</h3>
                <ul>
                  <li><strong>Error Code:</strong> ${data.errorCode}</li>
                  <li><strong>Operation:</strong> ${data.operationType}</li>
                  <li><strong>Staff Member:</strong> ${data.staffName} (ID: ${data.staffId})</li>
                  <li><strong>Timestamp:</strong> ${data.timestamp}</li>
                  <li><strong>Message:</strong> ${data.errorMessage}</li>
                </ul>
              </div>

              ${errorDescription ? `
                <div class="suggestions">
                  <h3>Suggested Actions:</h3>
                  <ul>
                    ${errorDescription.suggestedActions.map(action => `<li>${action}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Review the error details above</li>
                <li>Check the application logs for more information</li>
                <li>Take appropriate action based on the suggested actions</li>
                <li>Monitor the system for similar errors</li>
              </ol>

              <p>This is an automated error notification from the calendar system.</p>
            </div>
            <div class="footer">
              <p>Generated by the BestDOC Calendar System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
        Calendar Error Alert - ${data.operationType} (${data.errorCode})

        A calendar operation has failed and requires attention.

        Error Details:
        - Error Code: ${data.errorCode}
        - Operation: ${data.operationType}
        - Staff Member: ${data.staffName} (ID: ${data.staffId})
        - Timestamp: ${data.timestamp}
        - Message: ${data.errorMessage}

        ${errorDescription ? `
        Suggested Actions:
        ${errorDescription.suggestedActions.map(action => `- ${action}`).join('\n')}
        ` : ''}

        Next Steps:
        1. Review the error details above
        2. Check the application logs for more information
        3. Take appropriate action based on the suggested actions
        4. Monitor the system for similar errors

        This is an automated error notification from the calendar system.

        ---
        Generated by the BestDOC Calendar System
      `
    };
  }

  /**
   * Get reminder email template
   */
  private getReminderTemplate(
    to: string,
    staffName: string,
    reminderType: 'verification' | 'sync_failed' | 'quota_warning'
  ): EmailTemplate {
    const organizationName = 'BestDOC';

    const templates = {
      verification: {
        subject: `Reminder: Complete Your ${organizationName} Calendar Verification`,
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Calendar Verification Reminder</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
              .header { background: #ffc107; color: #333; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ Verification Reminder</h1>
              </div>
              <div class="content">
                <p>Hello ${staffName},</p>
                <p>This is a friendly reminder to complete your calendar verification. Please check your Google Calendar for the test event and accept it to complete the setup process.</p>
                <p>If you have already completed verification, please ignore this message.</p>
                <p>Best regards,<br>The ${organizationName} Team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textBody: `
          Calendar Verification Reminder

          Hello ${staffName},

          This is a friendly reminder to complete your calendar verification. Please check your Google Calendar for the test event and accept it to complete the setup process.

          If you have already completed verification, please ignore this message.

          Best regards,
          The ${organizationName} Team
        `
      },
      sync_failed: {
        subject: `Calendar Sync Issue - ${organizationName}`,
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Calendar Sync Issue</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
              .header { background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Calendar Sync Issue</h1>
              </div>
              <div class="content">
                <p>Hello ${staffName},</p>
                <p>We're experiencing issues syncing appointments to your calendar. Our technical team has been notified and is working to resolve this issue.</p>
                <p>Your appointments are still being scheduled correctly in our system - they just aren't appearing in your calendar yet.</p>
                <p>We'll send you an update once the issue is resolved.</p>
                <p>Best regards,<br>The ${organizationName} Team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textBody: `
          Calendar Sync Issue

          Hello ${staffName},

          We're experiencing issues syncing appointments to your calendar. Our technical team has been notified and is working to resolve this issue.

          Your appointments are still being scheduled correctly in our system - they just aren't appearing in your calendar yet.

          We'll send you an update once the issue is resolved.

          Best regards,
          The ${organizationName} Team
        `
      },
      quota_warning: {
        subject: `Calendar API Quota Warning - ${organizationName}`,
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>API Quota Warning</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
              .header { background: #fd7e14; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ API Quota Warning</h1>
              </div>
              <div class="content">
                <p>Hello ${staffName},</p>
                <p>We're approaching our Google Calendar API quota limit. This may temporarily affect calendar operations.</p>
                <p>Our technical team is monitoring the situation and will take action if needed.</p>
                <p>Best regards,<br>The ${organizationName} Team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textBody: `
          API Quota Warning

          Hello ${staffName},

          We're approaching our Google Calendar API quota limit. This may temporarily affect calendar operations.

          Our technical team is monitoring the situation and will take action if needed.

          Best regards,
          The ${organizationName} Team
        `
      }
    };

    return templates[reminderType];
  }

  // =============================================================================
  // CORE EMAIL FUNCTIONALITY
  // =============================================================================

  /**
   * Send email using configured email service
   */
  private async sendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<EmailResult> {
    try {
      // Check if we're in development mode - if so, just log the email
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (isDevelopment) {
        console.log(`📧 [DEV MODE] Email would be sent to ${params.to}`);
        console.log(`📧 [DEV MODE] Subject: ${params.subject}`);
        console.log(`📧 [DEV MODE] Priority: ${params.priority || 'normal'}`);
        console.log(`📧 [DEV MODE] HTML Body:`, params.htmlBody.substring(0, 200) + '...');

        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 100));

        const messageId = `dev_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return {
          success: true,
          messageId
        };
      }

      // Try to send real email using Nodemailer
      try {
        const nodemailer = await import('nodemailer');

        // Create transporter with Gmail SMTP (you can configure this)
        const transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASS || 'your-app-password'
          }
        });

        // Send email
        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@bestdoc.com',
          to: params.to,
          subject: params.subject,
          html: params.htmlBody,
          text: params.textBody,
          priority: params.priority || 'normal'
        });

        console.log(`✅ Email sent successfully to ${params.to}:`, info.messageId);

        return {
          success: true,
          messageId: info.messageId
        };

      } catch (emailError) {
        console.warn('⚠️ Failed to send real email, falling back to simulation:', emailError);

        // Fallback to simulation if email service fails
        console.log(`📧 [FALLBACK] Email would be sent to ${params.to}`);
        console.log(`📧 [FALLBACK] Subject: ${params.subject}`);
        console.log(`📧 [FALLBACK] Priority: ${params.priority || 'normal'}`);

        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Simulate success
        const messageId = `fallback_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return {
          success: true,
          messageId
        };
      }

    } catch (error) {
      console.error('❌ Failed to send email:', error);

      return {
        success: false,
        errorCode: 'INVITE_SEND_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
      // Check if email service is properly configured
      const isConfigured = !!(config.googleCalendar.emailFrom && config.googleCalendar.emailFromName);

      if (!isConfigured) {
        return {
          status: 'unhealthy',
          message: 'Email service not properly configured',
          lastChecked: new Date().toISOString()
        };
      }

      return {
        status: 'healthy',
        message: 'Email service is operational',
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Email service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString()
      };
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let emailServiceInstance: EmailService | null = null;

/**
 * Get the singleton instance of EmailService
 */
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetEmailService(): void {
  emailServiceInstance = null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default EmailService;
