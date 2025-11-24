/**
 * Calendar Verification Service
 *
 * This service manages the calendar verification process for staff members.
 * It creates test events, tracks RSVP responses, and manages verification status.
 */

import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import {
    CalendarErrorCode,
    CalendarVerificationEvent,
    CalendarVerificationFilters,
    CalendarVerificationStatus,
    VerificationEventStatus,
    VerifyCalendarRequest,
    isVerificationExpired
} from '@/types/calendar';
// Import server-only calendar service dynamically when required

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface VerificationTestEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  attendeeEmail: string;
}

export interface VerificationResult {
  success: boolean;
  verificationStatus: CalendarVerificationStatus;
  errorCode?: CalendarErrorCode;
  errorMessage?: string;
  verificationEventId?: string;
}

export interface VerificationStatus {
  staffId: string;
  googleCalendarId: string;
  verificationStatus: CalendarVerificationStatus;
  verificationDate?: string;
  errorCode?: CalendarErrorCode;
  errorMessage?: string;
  lastAttempt?: string;
  attemptsRemaining: number;
}

export interface VerificationOptions {
  maxAttempts?: number;
  timeoutHours?: number;
  sendEmail?: boolean;
  retryOnFailure?: boolean;
}

// =============================================================================
// CALENDAR VERIFICATION SERVICE CLASS
// =============================================================================

export class CalendarVerificationService {
  private googleCalendarService: any;
  private readonly defaultOptions: VerificationOptions = {
    maxAttempts: 3,
    timeoutHours: 24,
    sendEmail: true,
    retryOnFailure: true
  };

  constructor() {
    // Lazily load on first use instead of top-level import
    this.googleCalendarService = null as any;
  }

  /**
   * Start verification process for a staff member's calendar
   */
  async startVerification(
    request: VerifyCalendarRequest,
    options: VerificationOptions = {}
  ): Promise<VerificationResult> {
    try {
      // Check if verification is enabled
      if (!isFeatureEnabled('CALENDAR_VERIFICATION')) {
        return {
          success: false,
          verificationStatus: 'failed',
          errorCode: 'FEATURE_DISABLED',
          errorMessage: 'Calendar verification is disabled'
        };
      }

      // Check if Google Calendar service is properly configured
      if (!this.googleCalendarService) {
        return {
          success: false,
          verificationStatus: 'failed',
          errorCode: 'GOOGLE_API_UNAVAILABLE',
          errorMessage: 'Google Calendar service is not available'
        };
      }

      // Wait for Google Calendar service to initialize (with timeout)
      let attempts = 0;
      const maxAttempts = 10;
      while (!this.googleCalendarService.isInitialized && attempts < maxAttempts) {
        console.log(`⏳ Waiting for Google Calendar service initialization in verification... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!this.googleCalendarService.isInitialized) {
        return {
          success: false,
          verificationStatus: 'failed',
          errorCode: 'GOOGLE_API_UNAVAILABLE',
          errorMessage: 'Google Calendar service failed to initialize within timeout period'
        };
      }

      const opts = { ...this.defaultOptions, ...options };

      // Check if verification is already in progress or completed
      const existingVerification = await this.getVerificationStatus(request.staff_id);
      if (existingVerification && existingVerification.verificationStatus === 'verified') {
        return {
          success: true,
          verificationStatus: 'verified',
          verificationEventId: existingVerification.verificationEventId
        };
      }

      if (existingVerification && existingVerification.verificationStatus === 'pending') {
        // Check if verification has expired
        if (existingVerification.expiresAt && isVerificationExpired(existingVerification.expiresAt)) {
          await this.markVerificationAsFailed(request.staff_id, 'VERIFICATION_TIMEOUT');
          return {
            success: false,
            verificationStatus: 'failed',
            errorCode: 'VERIFICATION_TIMEOUT',
            errorMessage: 'Verification process timed out'
          };
        }

        return {
          success: true,
          verificationStatus: 'pending',
          verificationEventId: existingVerification.verificationEventId
        };
      }

      // Create verification test event
      const testEvent = await this.createVerificationTestEvent(request, opts);
      if (!testEvent.success) {
        return {
          success: false,
          verificationStatus: 'failed',
          errorCode: testEvent.errorCode,
          errorMessage: testEvent.errorMessage
        };
      }

      // Store verification event in database
      const verificationEvent = await this.storeVerificationEvent(
        request,
        testEvent.eventId!,
        opts
      );

      // Send verification email if enabled
      if (opts.sendEmail) {
        await this.sendVerificationEmail(request, testEvent.eventUrl!);
      }

      // Update staff verification status
      await this.updateStaffVerificationStatus(
        request.staff_id,
        'pending',
        verificationEvent.id
      );

      return {
        success: true,
        verificationStatus: 'pending',
        verificationEventId: verificationEvent.id
      };

    } catch (error) {
      console.error(`❌ Failed to start verification for staff ${request.staff_id}:`, error);

      return {
        success: false,
        verificationStatus: 'failed',
        errorCode: 'VERIFICATION_EVENT_CREATION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check verification status and update if needed
   */
  async checkVerificationStatus(staffId: string): Promise<VerificationStatus> {
    try {
      const verification = await this.getVerificationStatus(staffId);

      if (!verification) {
        return {
          staffId,
          googleCalendarId: '',
          verificationStatus: 'not_required',
          attemptsRemaining: 0
        };
      }

      // Check if verification has expired
      if (verification.expiresAt && isVerificationExpired(verification.expiresAt)) {
        await this.markVerificationAsFailed(staffId, 'VERIFICATION_TIMEOUT');
        return {
          staffId,
          googleCalendarId: verification.googleCalendarId,
          verificationStatus: 'failed',
          errorCode: 'VERIFICATION_TIMEOUT',
          errorMessage: 'Verification process timed out',
          lastAttempt: verification.updatedAt,
          attemptsRemaining: 0
        };
      }

      // Check RSVP status if verification is pending
      if (verification.verificationStatus === 'pending') {
        const rsvpStatus = await this.checkRSVPStatus(verification.googleEventId);
        if (rsvpStatus === 'accepted') {
          await this.markVerificationAsCompleted(staffId, verification.id);
          return {
            staffId,
            googleCalendarId: verification.googleCalendarId,
            verificationStatus: 'verified',
            verificationDate: new Date().toISOString(),
            lastAttempt: verification.updatedAt,
            attemptsRemaining: verification.maxVerificationAttempts - verification.verificationAttempts
          };
        }
      }

      return {
        staffId,
        googleCalendarId: verification.googleCalendarId,
        verificationStatus: verification.verificationStatus as CalendarVerificationStatus,
        verificationDate: verification.verifiedAt,
        errorCode: verification.errorCode,
        errorMessage: verification.errorMessage,
        lastAttempt: verification.updatedAt,
        attemptsRemaining: verification.maxVerificationAttempts - verification.verificationAttempts
      };

    } catch (error) {
      console.error(`❌ Failed to check verification status for staff ${staffId}:`, error);

      return {
        staffId,
        googleCalendarId: '',
        verificationStatus: 'failed',
        errorCode: 'RSVP_CHECK_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        attemptsRemaining: 0
      };
    }
  }

  /**
   * Retry verification process
   */
  async retryVerification(
    staffId: string,
    options: VerificationOptions = {}
  ): Promise<VerificationResult> {
    try {
      // Get current verification status
      const verification = await this.getVerificationStatus(staffId);

      if (!verification) {
        throw new Error('No verification found for staff member');
      }

      if (verification.verificationStatus === 'verified') {
        return {
          success: true,
          verificationStatus: 'verified',
          verificationEventId: verification.id
        };
      }

      // Check if we can retry
      if (verification.verificationAttempts >= verification.maxVerificationAttempts) {
        return {
          success: false,
          verificationStatus: 'failed',
          errorCode: 'VERIFICATION_TIMEOUT',
          errorMessage: 'Maximum verification attempts exceeded'
        };
      }

      // Create new verification test event
      const testEvent = await this.createVerificationTestEvent(
        {
          staff_id: staffId,
          google_calendar_id: verification.googleCalendarId,
          staff_email: verification.attendeeEmail
        },
        options
      );

      if (!testEvent.success) {
        return {
          success: false,
          verificationStatus: 'failed',
          errorCode: testEvent.errorCode,
          errorMessage: testEvent.errorMessage
        };
      }

      // Update verification event
      await this.updateVerificationEvent(verification.id, {
        google_event_id: testEvent.eventId!,
        verification_status: 'created',
        verification_attempts: verification.verificationAttempts + 1,
        expires_at: new Date(Date.now() + (options.timeoutHours || 24) * 60 * 60 * 1000).toISOString()
      });

      // Send verification email if enabled
      if (options.sendEmail !== false) {
        await this.sendVerificationEmail(
          {
            staff_id: staffId,
            google_calendar_id: verification.googleCalendarId,
            staff_email: verification.attendeeEmail
          },
          testEvent.eventUrl!
        );
      }

      return {
        success: true,
        verificationStatus: 'pending',
        verificationEventId: verification.id
      };

    } catch (error) {
      console.error(`❌ Failed to retry verification for staff ${staffId}:`, error);

      return {
        success: false,
        verificationStatus: 'failed',
        errorCode: 'VERIFICATION_EVENT_CREATION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cancel verification process
   */
  async cancelVerification(staffId: string): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      const verification = await this.getVerificationStatus(staffId);

      if (!verification) {
        return { success: true }; // Nothing to cancel
      }

      // Delete the verification test event from Google Calendar
      if (verification.googleEventId) {
        try {
          await this.googleCalendarService.deleteEvent(
            verification.googleCalendarId,
            verification.googleEventId
          );
        } catch (error) {
          console.warn(`Failed to delete verification event: ${error}`);
        }
      }

      // Update verification status to failed
      await this.updateVerificationEvent(verification.id, {
        verification_status: 'expired',
        expires_at: new Date().toISOString()
      });

      // Update staff verification status
      await this.updateStaffVerificationStatus(staffId, 'not_required');

      return { success: true };

    } catch (error) {
      console.error(`❌ Failed to cancel verification for staff ${staffId}:`, error);

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get verification events with filtering
   */
  async getVerificationEvents(filters: CalendarVerificationFilters = {}): Promise<CalendarVerificationEvent[]> {
    try {
      let query = supabase
        .from('calendar_verification_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.staff_id) {
        query = query.eq('staff_id', filters.staff_id);
      }

      if (filters.verification_status) {
        query = query.eq('verification_status', filters.verification_status);
      }

      if (filters.attendee_email) {
        query = query.eq('attendee_email', filters.attendee_email);
      }

      if (filters.expires_after) {
        query = query.gte('expires_at', filters.expires_after);
      }

      if (filters.expires_before) {
        query = query.lte('expires_at', filters.expires_before);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch verification events: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('❌ Failed to get verification events:', error);
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Create verification test event in Google Calendar
   */
  private async createVerificationTestEvent(
    request: VerifyCalendarRequest,
    options: VerificationOptions
  ): Promise<{ success: boolean; eventId?: string; eventUrl?: string; errorCode?: CalendarErrorCode; errorMessage?: string }> {
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes duration

      const testEvent = {
        staff_id: request.staff_id,
        google_calendar_id: request.google_calendar_id,
        event_title: 'BestDOC Calendar Verification Test',
        event_description: `This is a test event to verify your calendar access. This event will be automatically deleted after verification.`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
        // Note: Removed attendees array as service accounts cannot invite attendees
      };

      if (!this.googleCalendarService) {
        const { getGoogleCalendarService } = await import('./googleCalendarService');
        this.googleCalendarService = getGoogleCalendarService();
      }
      const result = await this.googleCalendarService.createEvent(testEvent);

      if (!result.success) {
        return {
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        };
      }

      return {
        success: true,
        eventId: result.eventId,
        eventUrl: result.eventUrl
      };

    } catch (error) {
      console.error('❌ Failed to create verification test event:', error);

      return {
        success: false,
        errorCode: 'VERIFICATION_EVENT_CREATION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Store verification event in database
   */
  private async storeVerificationEvent(
    request: VerifyCalendarRequest,
    googleEventId: string,
    options: VerificationOptions
  ): Promise<CalendarVerificationEvent> {
    const expiresAt = new Date(Date.now() + (options.timeoutHours || 24) * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('calendar_verification_events')
      .insert({
        staff_id: request.staff_id,
        google_calendar_id: request.google_calendar_id,
        google_event_id: googleEventId,
        event_title: 'BestDOC Calendar Verification Test',
        event_description: 'Test event for calendar verification',
        event_start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        event_end_time: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        attendee_email: request.staff_email,
        verification_status: 'created',
        verification_attempts: 1,
        max_verification_attempts: options.maxAttempts || 3,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store verification event: ${error.message}`);
    }

    return data;
  }

  /**
   * Get verification status for a staff member
   */
  private async getVerificationStatus(staffId: string): Promise<CalendarVerificationEvent | null> {
    const { data, error } = await supabase
      .from('calendar_verification_events')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Failed to get verification status for staff ${staffId}:`, error);
      return null;
    }

    return data;
  }

  /**
   * Check RSVP status of verification event
   */
  private async checkRSVPStatus(googleEventId: string): Promise<VerificationEventStatus> {
    try {
      // This would need to be implemented based on Google Calendar API
      // For now, we'll return a placeholder
      // In a real implementation, you would query the event attendees
      return 'created';
    } catch (error) {
      console.error('❌ Failed to check RSVP status:', error);
      return 'failed';
    }
  }

  /**
   * Mark verification as completed
   */
  private async markVerificationAsCompleted(staffId: string, verificationEventId: string): Promise<void> {
    try {
      // Update verification event
      await supabase
        .from('calendar_verification_events')
        .update({
          verification_status: 'accepted',
          verified_at: new Date().toISOString()
        })
        .eq('id', verificationEventId);

      // Update staff verification status
      await this.updateStaffVerificationStatus(staffId, 'verified');

    } catch (error) {
      console.error('❌ Failed to mark verification as completed:', error);
      throw error;
    }
  }

  /**
   * Mark verification as failed
   */
  private async markVerificationAsFailed(staffId: string, errorCode: CalendarErrorCode): Promise<void> {
    try {
      // Update staff verification status
      await this.updateStaffVerificationStatus(staffId, 'failed', errorCode);

    } catch (error) {
      console.error('❌ Failed to mark verification as failed:', error);
      throw error;
    }
  }

  /**
   * Update verification event
   */
  private async updateVerificationEvent(
    verificationEventId: string,
    updates: Partial<CalendarVerificationEvent>
  ): Promise<void> {
    const { error } = await supabase
      .from('calendar_verification_events')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', verificationEventId);

    if (error) {
      throw new Error(`Failed to update verification event: ${error.message}`);
    }
  }

  /**
   * Update staff verification status
   */
  private async updateStaffVerificationStatus(
    staffId: string,
    status: CalendarVerificationStatus,
    errorCode?: CalendarErrorCode
  ): Promise<void> {
    const { error } = await supabase
      .from('staff')
      .update({
        calendar_verification_status: status,
        calendar_verification_date: status === 'verified' ? new Date().toISOString() : null,
        calendar_error_code: errorCode || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId);

    if (error) {
      throw new Error(`Failed to update staff verification status: ${error.message}`);
    }
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(
    request: VerifyCalendarRequest,
    eventUrl: string
  ): Promise<void> {
    try {
      // This would integrate with the EmailService
      // For now, we'll just log the action
      console.log(`📧 Verification email would be sent to ${request.staff_email} with event URL: ${eventUrl}`);
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      // Don't throw error as email sending is not critical for verification
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let calendarVerificationServiceInstance: CalendarVerificationService | null = null;

/**
 * Get the singleton instance of CalendarVerificationService
 */
export function getCalendarVerificationService(): CalendarVerificationService {
  if (!calendarVerificationServiceInstance) {
    calendarVerificationServiceInstance = new CalendarVerificationService();
  }
  return calendarVerificationServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetCalendarVerificationService(): void {
  calendarVerificationServiceInstance = null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default CalendarVerificationService;
