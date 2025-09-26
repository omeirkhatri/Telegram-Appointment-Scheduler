/**
 * Manual Calendar Verification API Endpoint
 *
 * Handles manual verification actions for staff members.
 * Provides options to: Send Email Again, Mark as Verified, Change Email
 */

import { apiErrorHandler, generateRequestId, ValidationError } from '@/lib/apiErrorHandler';
import { supabase } from '@/lib/supabase';
import { getCalendarVerificationService } from '@/services/calendarVerificationService';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const ManualVerifyRequestSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID format'),
  action: z.enum(['send_email_again', 'mark_verified', 'change_email']),
  new_email: z.string().email('Invalid email format').optional()
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /api/calendar/manual-verify - Manual verification actions
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = ManualVerifyRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const { staff_id, action, new_email } = validationResult.data;

    // Get staff member details
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staff_id)
      .single();

    if (staffError || !staff) {
      throw new Error('Staff member not found');
    }

    // Check if staff has email
    if (!staff.email || staff.email === 'no-email@bestdoc.com') {
      throw new Error('Staff member does not have a valid email address');
    }

    // For change_email action, we don't need a calendar ID
    if (action !== 'change_email' && !staff.google_calendar_id) {
      throw new Error('Staff member does not have a Google Calendar ID');
    }

    let result: any = {};

    switch (action) {
      case 'send_email_again':
        // Send verification email again
        if (!staff.google_calendar_id) {
          throw new Error('Staff member does not have a Google Calendar ID. Please set up calendar integration first.');
        }

        const verificationService = getCalendarVerificationService();
        const verifyResult = await verificationService.startVerification({
          staff_id,
          google_calendar_id: staff.google_calendar_id,
          staff_email: staff.email
        });

        if (!verifyResult.success) {
          throw new Error(verifyResult.errorMessage || 'Failed to send verification email');
        }

        result = {
          action: 'send_email_again',
          message: 'Verification email sent successfully',
          verification_status: verifyResult.verificationStatus,
          verification_event_id: verifyResult.verificationEventId
        };
        break;

      case 'mark_verified':
        // Manually mark as verified
        const verificationDate = new Date().toISOString();
        
        // For staff without calendar IDs, we need to handle the constraint differently
        if (!staff.google_calendar_id) {
          // First set the status to 'pending' to bypass the constraint
          const { error: statusError } = await supabase
            .from('staff')
            .update({
              calendar_verification_status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('id', staff_id);

          if (statusError) {
            console.error('Status update error:', statusError);
            throw new Error(`Failed to update verification status: ${statusError.message}`);
          }

          // Then update both status and date
          const { error: finalError } = await supabase
            .from('staff')
            .update({
              calendar_verification_status: 'verified',
              calendar_verification_date: verificationDate,
              updated_at: new Date().toISOString()
            })
            .eq('id', staff_id);

          if (finalError) {
            console.error('Final update error:', finalError);
            throw new Error(`Failed to mark staff as verified: ${finalError.message}`);
          }
        } else {
          // For staff with calendar IDs, we can update both at once
          const { error: updateError } = await supabase
            .from('staff')
            .update({
              calendar_verification_status: 'verified',
              calendar_verification_date: verificationDate,
              updated_at: new Date().toISOString()
            })
            .eq('id', staff_id);

          if (updateError) {
            console.error('Database update error:', updateError);
            throw new Error(`Failed to mark staff as verified: ${updateError.message}`);
          }
        }

        result = {
          action: 'mark_verified',
          message: 'Staff member marked as verified successfully',
          verification_status: 'verified',
          verification_date: new Date().toISOString()
        };
        break;

      case 'change_email':
        if (!new_email) {
          throw new Error('New email address is required for change_email action');
        }

        // Validate new email format
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(new_email)) {
          throw new Error('Invalid email format');
        }

        // Check if email is already in use by another staff member
        const { data: existingStaff, error: checkError } = await supabase
          .from('staff')
          .select('id, email')
          .eq('email', new_email)
          .neq('id', staff_id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw new Error('Failed to check email availability');
        }

        if (existingStaff) {
          throw new Error('Email address is already in use by another staff member');
        }

        // Update email and reset verification status
        const { error: emailUpdateError } = await supabase
          .from('staff')
          .update({
            email: new_email,
            calendar_verification_status: 'not_required',
            calendar_verification_date: null,
            calendar_error_code: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', staff_id);

        if (emailUpdateError) {
          throw new Error('Failed to update email address');
        }

        result = {
          action: 'change_email',
          message: 'Email address updated successfully. Calendar verification will need to be restarted.',
          new_email,
          verification_status: 'not_required'
        };
        break;

      default:
        throw new Error('Invalid action specified');
    }

    return apiErrorHandler.createSuccessResponse(result, 'Manual verification action completed successfully');

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Manual calendar verification');
  }
}
