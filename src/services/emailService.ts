import { emailTemplateEngine } from '@/lib/emailTemplateEngine';
import { config } from '@/lib/env';
import { retryWithBackoff } from '@/lib/retryUtils';
import type {
    AgendaEmailData,
    EmailConfig,
    EmailResult,
    EmailService as IEmailService
} from '@/types/email';
import { formatDubaiDate } from '@/utils/timezone';
import { v4 as uuidv4 } from 'uuid';
import { emailDeliveryService } from './emailDeliveryService';

export class EmailService implements IEmailService {
  private readonly smtpConfig: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };

  constructor() {
    // Validate SMTP configuration
    if (!config.email.isConfigured()) {
      throw new Error('SMTP configuration is incomplete. Please check your environment variables.');
    }

    this.smtpConfig = {
      host: config.email.host!,
      port: config.email.port!,
      user: config.email.user!,
      pass: config.email.pass!,
    };
  }

  /**
   * Send email using SMTP with delivery tracking and retry mechanisms
   */
  async sendEmail(emailConfig: EmailConfig, options?: {
    emailType?: string;
    staffId?: string;
    jobExecutionId?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  }): Promise<EmailResult> {
    const emailId = uuidv4();
    const startTime = Date.now();

    try {
      // Log the delivery attempt
      const deliveryLog = await emailDeliveryService.logDeliveryAttempt({
        emailId,
        staffId: options?.staffId,
        jobExecutionId: options?.jobExecutionId,
        emailType: options?.emailType || 'general',
        recipientEmail: emailConfig.to,
        subject: emailConfig.subject,
        status: 'pending',
        priority: options?.priority || 'medium',
        retryCount: 0,
        maxRetries: 3,
        deliveryAttempts: [],
        metadata: {
          ...options?.metadata,
          from: emailConfig.from,
          replyTo: emailConfig.replyTo,
        },
      });

      // Send email with retry mechanism
      const result = await retryWithBackoff(
        async () => {
          const response = await this.sendViaSMTP(emailConfig);
          return response;
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
        }
      );

      const responseTime = Date.now() - startTime;

      if (result.success) {
        // Update delivery status to sent
        await emailDeliveryService.updateDeliveryStatus(deliveryLog.id, 'sent');

        // Add successful delivery attempt
        await emailDeliveryService.addDeliveryAttempt(deliveryLog.id, {
          attemptNumber: 1,
          attemptedAt: new Date(),
          status: 'success',
          responseTimeMs: responseTime,
          metadata: { messageId: result.data.messageId },
        });

        console.log(`✅ Email sent successfully to ${emailConfig.to}`, {
          emailId,
          messageId: result.data.messageId,
          responseTime,
        });

        return {
          success: true,
          messageId: result.data.messageId,
        };
      } else {
        // Update delivery status to failed
        await emailDeliveryService.updateDeliveryStatus(deliveryLog.id, 'failed', result.error?.message);

        // Add failed delivery attempt
        await emailDeliveryService.addDeliveryAttempt(deliveryLog.id, {
          attemptNumber: 1,
          attemptedAt: new Date(),
          status: 'failed',
          errorMessage: result.error?.message,
          responseTimeMs: responseTime,
        });

        console.error(`❌ Failed to send email to ${emailConfig.to}:`, result.error);
        return {
          success: false,
          error: result.error?.message || 'Unknown error occurred',
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      console.error('Failed to send email:', error);

      // Try to update delivery status if we have a log
      try {
        const deliveryLogs = await emailDeliveryService.getDeliveryLogs({
          emailType: options?.emailType,
        }, 1);

        const recentLog = deliveryLogs.find(log => log.emailId === emailId);
        if (recentLog) {
          await emailDeliveryService.updateDeliveryStatus(recentLog.id, 'failed', errorMessage);
        }
      } catch (logError) {
        console.error('Failed to update delivery log:', logError);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send daily agenda to a specific staff member
   */
  async sendDailyAgenda(staffId: string, date: Date, jobExecutionId?: string): Promise<EmailResult> {
    try {
      // This would typically fetch staff data and appointments
      // For now, we'll create a mock implementation
      const agendaData = await this.generateAgendaData(staffId, date);
      const html = emailTemplateEngine.renderAgendaTemplate(agendaData);

      const emailConfig: EmailConfig = {
        to: agendaData.staffEmail!,
        subject: agendaData.subject,
        html,
        from: `MediCare Scheduler <${this.smtpConfig.user}>`,
        replyTo: this.smtpConfig.user,
      };

      return await this.sendEmail(emailConfig, {
        emailType: 'daily_agenda',
        staffId,
        jobExecutionId,
        priority: 'high',
        metadata: {
          date: date.toISOString(),
          agendaData,
        },
      });
    } catch (error) {
      console.error(`Failed to send daily agenda to staff ${staffId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send daily agenda',
      };
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string, template: string): Promise<EmailResult> {
    try {
      const testData: AgendaEmailData = {
        subject: 'Test Email - MediCare Scheduler',
        content: '',
        date: formatDubaiDate(new Date()),
        staffName: 'Test User',
        staffEmail: to,
        appointments: [
          {
            id: 'test-1',
            startTime: '09:00',
            endTime: '10:00',
            appointmentType: 'doctor_on_call',
            appointmentTypeDisplay: 'Doctor On Call',
            patientName: 'Test Patient',
            patientPhone: '+971501234567',
            patientAddress: '123 Test Street, Dubai',
            notes: 'This is a test appointment',
          }
        ],
        totalAppointments: 1,
        multipleAppointments: false,
      };

      const html = emailTemplateEngine.renderAgendaTemplate(testData);

      const emailConfig: EmailConfig = {
        to,
        subject: testData.subject,
        html,
        from: `MediCare Scheduler <${this.smtpConfig.user}>`,
        replyTo: this.smtpConfig.user,
      };

      return await this.sendEmail(emailConfig, {
        emailType: 'test',
        priority: 'low',
        metadata: {
          template,
          testData,
        },
      });
    } catch (error) {
      console.error('Failed to send test email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test email',
      };
    }
  }

  /**
   * Validate email configuration
   */
  validateEmailConfig(): boolean {
    try {
      return config.email.isConfigured();
    } catch {
      return false;
    }
  }

  /**
   * Send email via SMTP (mock implementation)
   * In production, this would use nodemailer or similar
   */
  private async sendViaSMTP(emailConfig: EmailConfig): Promise<{ messageId: string }> {
    // Mock SMTP implementation
    // In a real implementation, you would use nodemailer:
    /*
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransporter({
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: this.smtpConfig.port === 465,
      auth: {
        user: this.smtpConfig.user,
        pass: this.smtpConfig.pass,
      },
    });

    const info = await transporter.sendMail({
      from: emailConfig.from || this.smtpConfig.user,
      to: emailConfig.to,
      subject: emailConfig.subject,
      html: emailConfig.html,
      text: emailConfig.text,
      replyTo: emailConfig.replyTo,
    });

    return { messageId: info.messageId };
    */

    // For now, simulate successful email sending
    console.log('📧 Email would be sent:', {
      to: emailConfig.to,
      subject: emailConfig.subject,
      from: emailConfig.from,
    });

    return {
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Generate agenda data for a staff member
   * This is a mock implementation - in production, it would fetch real data
   */
  private async generateAgendaData(staffId: string, date: Date): Promise<AgendaEmailData> {
    // Mock data - in production, this would fetch from database
    const mockAppointments = [
      {
        id: '1',
        startTime: '09:00',
        endTime: '10:00',
        appointmentType: 'doctor_on_call',
        appointmentTypeDisplay: 'Doctor On Call',
        patientName: 'Ahmed Al-Rashid',
        patientPhone: '+971501234567',
        patientAddress: 'Villa 123, Jumeirah, Dubai',
        staffName: 'Dr. Sarah Johnson',
        notes: 'Regular checkup',
      },
      {
        id: '2',
        startTime: '14:00',
        endTime: '14:45',
        appointmentType: 'lab_test',
        appointmentTypeDisplay: 'Lab Test',
        patientName: 'Fatima Hassan',
        patientPhone: '+971507654321',
        patientAddress: 'Apartment 45, Downtown, Dubai',
        staffName: 'Nurse Maryam',
        notes: 'Blood test - fasting required',
      },
    ];

    return {
      subject: `Your Schedule for ${formatDubaiDate(date)}`,
      content: '',
      date: formatDubaiDate(date),
      staffName: 'Dr. Sarah Johnson',
      staffEmail: 'dr.sarah@medicare.com',
      appointments: mockAppointments,
      totalAppointments: mockAppointments.length,
      multipleAppointments: mockAppointments.length !== 1,
    };
  }

  /**
   * Get SMTP configuration status
   */
  getSMTPStatus(): {
    configured: boolean;
    host?: string;
    port?: number;
    user?: string;
  } {
    return {
      configured: this.validateEmailConfig(),
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      user: this.smtpConfig.user,
    };
  }

  /**
   * Test SMTP connection
   */
  async testSMTPConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock connection test
      // In production, you would actually test the SMTP connection
      console.log('Testing SMTP connection to:', this.smtpConfig.host);

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Send bulk emails (for daily agenda to all staff)
   */
  async sendBulkEmails(emailConfigs: EmailConfig[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Send emails sequentially to avoid overwhelming the SMTP server
    for (const config of emailConfigs) {
      const result = await this.sendEmail(config);
      results.push(result);

      // Add small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Get email delivery statistics
   */
  getDeliveryStats(results: EmailResult[]): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  } {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100,
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
