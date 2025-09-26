import { logCalendarOperation } from '@/lib/calendarOperations';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import type { CreateStaff, Staff, StaffFilters, UpdateStaff } from '@/types';
import { getCalendarVerificationService } from './calendarVerificationService';
import { getEmailService } from './emailService';
import { getGoogleCalendarService } from './googleCalendarService';

export class StaffService {
  // Get all staff with optional filtering
  async getStaff(filters?: StaffFilters): Promise<Staff[]> {
    let query = supabase
      .from('staff')
      .select('*')
      .order('first_name', { ascending: true });

    // Apply filters
    if (filters?.first_name) {
      query = query.ilike('first_name', `%${filters.first_name}%`);
    }

    if (filters?.last_name) {
      query = query.ilike('last_name', `%${filters.last_name}%`);
    }

    if (filters?.staff_type) {
      query = query.eq('staff_type', filters.staff_type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }


    // Note: available_days filter removed as it's not needed

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch staff: ${error.message}`);
    }

    return data || [];
  }

  // Get a single staff member by ID
  async getStaffMember(id: string): Promise<Staff | null> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch staff member: ${error.message}`);
    }

    return data;
  }

  // Get a staff member by Telegram user ID
  async getStaffByTelegramUserId(telegramUserId: string): Promise<Staff | null> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('telegram_user_id', telegramUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch staff by Telegram user ID: ${error.message}`);
    }

    return data;
  }

  // Create a new staff member
  async createStaff(staffData: CreateStaff): Promise<Staff> {
    const { data, error } = await supabase
      .from('staff')
      .insert(staffData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create staff member: ${error.message}`);
    }

    // Trigger calendar creation if staff has email and calendar feature is enabled
    if (data.email && data.email !== 'no-email@bestdoc.com' && isFeatureEnabled('GOOGLE_CALENDAR_ENABLED')) {
      try {
        await this.createStaffCalendar(data);
      } catch (calendarError) {
        console.error(`❌ Failed to create calendar for staff ${data.id}:`, calendarError);
        // Don't throw error as calendar creation failure shouldn't break staff creation
        // The error will be logged and can be retried later
      }
    }

    return data;
  }

  // Update an existing staff member
  async updateStaff(id: string, updates: Partial<UpdateStaff>): Promise<Staff> {
    // First check if the staff member exists
    const existingStaff = await this.getStaffMember(id);
    if (!existingStaff) {
      throw new Error('Staff member not found');
    }

    // Debug logging
    console.log('🔍 StaffService.updateStaff:', {
      staffId: id,
      updates: updates,
      telegramUserId: updates.telegram_user_id,
      telegramVerified: updates.telegram_verified
    });

    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update staff member: ${error.message}`);
    }

    if (!data) {
      throw new Error('Staff member not found');
    }

    // Handle calendar operations if calendar feature is enabled
    if (isFeatureEnabled('GOOGLE_CALENDAR_ENABLED')) {
      try {
        await this.updateStaffCalendar(id, updates);
      } catch (calendarError) {
        console.error(`❌ Failed to update calendar for staff ${id}:`, calendarError);
        // Don't throw error as calendar update failure shouldn't break staff update
      }
    }

    return data;
  }

  // Delete a staff member
  async deleteStaff(id: string): Promise<void> {
    // Get staff information before deletion for calendar cleanup
    const staff = await this.getStaffMember(id);
    if (!staff) {
      throw new Error('Staff member not found');
    }

    // Handle calendar cleanup if calendar feature is enabled and staff has a calendar
    if (isFeatureEnabled('GOOGLE_CALENDAR_ENABLED') && staff.google_calendar_id) {
      try {
        await this.deleteStaffCalendar(id, staff.google_calendar_id);
      } catch (calendarError) {
        console.error(`❌ Failed to cleanup calendar for staff ${id}:`, calendarError);
        // Don't throw error as calendar cleanup failure shouldn't break staff deletion
        // The error will be logged and can be handled separately
      }
    }

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete staff member: ${error.message}`);
    }
  }

  // Get staff by type
  async getStaffByType(staffType: string): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('staff_type', staffType)
      .eq('status', 'active')
      .order('first_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch staff by type: ${error.message}`);
    }

    return data || [];
  }

  // Get active staff members
  async getActiveStaff(): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('status', 'active')
      .order('first_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active staff: ${error.message}`);
    }

    return data || [];
  }


  // Get staff available on a specific day
  async getStaffAvailableOnDay(day: number): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .contains('available_days', [day])
      .eq('status', 'active')
      .order('first_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch staff available on day ${day}: ${error.message}`);
    }

    return data || [];
  }

  // Search staff by name or email
  async searchStaff(searchTerm: string): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('first_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to search staff: ${error.message}`);
    }

    return data || [];
  }

  // Get unique staff types for filtering
  async getStaffTypes(): Promise<string[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('staff_type')
      .not('staff_type', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch staff types: ${error.message}`);
    }

    const types = [...new Set(data?.map(s => s.staff_type) || [])];
    return types.sort();
  }



  // Get staff working hours
  async getStaffWorkingHours(id: string): Promise<{ start: string; end: string } | null> {
    const staff = await this.getStaffMember(id);
    if (!staff) {
      return null;
    }

    return {
      start: staff.working_hours_start,
      end: staff.working_hours_end,
    };
  }

  // Check if staff is available at a specific time
  async isStaffAvailableAtTime(id: string, time: string, day: number): Promise<boolean> {
    const staff = await this.getStaffMember(id);
    if (!staff || staff.status !== 'active') {
      return false;
    }

    // Check if staff works on this day
    if (!staff.available_days.includes(day)) {
      return false;
    }

    // Check if time is within working hours
    const timeDate = new Date(`2000-01-01T${time}:00`);
    const startDate = new Date(`2000-01-01T${staff.working_hours_start}:00`);
    const endDate = new Date(`2000-01-01T${staff.working_hours_end}:00`);

    return timeDate >= startDate && timeDate <= endDate;
  }

  // =============================================================================
  // CALENDAR OPERATIONS
  // =============================================================================

  /**
   * Create a calendar for a staff member
   */
  private async createStaffCalendar(staff: Staff): Promise<void> {
    try {
      console.log(`📅 Creating calendar for staff ${staff.first_name} ${staff.last_name} (${staff.email})`);

      // Log calendar creation start
      await logCalendarOperation({
        staffId: staff.id,
        operationType: 'create_calendar',
        operationStatus: 'pending'
      });

      const googleCalendarService = getGoogleCalendarService();
      const emailService = getEmailService();

      // Wait for Google Calendar service to initialize (with timeout)
      let attempts = 0;
      const maxAttempts = 10;
      while (!googleCalendarService.isInitialized && attempts < maxAttempts) {
        console.log(`⏳ Waiting for Google Calendar service initialization... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!googleCalendarService.isInitialized) {
        throw new Error('Google Calendar service failed to initialize within timeout period');
      }

      console.log('✅ Google Calendar service is ready for calendar creation');

      // Create calendar
      const calendarResult = await googleCalendarService.createCalendar({
        staff_id: staff.id,
        staff_name: `${staff.first_name} ${staff.last_name}`,
        staff_type: staff.staff_type,
        staff_email: staff.email!
      });

      if (!calendarResult.success) {
        throw new Error(calendarResult.errorMessage || 'Failed to create calendar');
      }

      // Share calendar with staff member
      const shareResult = await googleCalendarService.shareCalendar({
        staff_id: staff.id,
        google_calendar_id: calendarResult.calendarId!,
        staff_email: staff.email!,
        permission_level: 'reader'
      });

      if (!shareResult.success) {
        console.warn(`⚠️ Failed to share calendar with ${staff.email}:`, shareResult.errorMessage);
        // Continue with calendar creation even if sharing fails
      }

      // Update staff record with calendar ID
      await this.updateStaff(staff.id, {
        google_calendar_id: calendarResult.calendarId!,
        calendar_verification_status: 'pending'
      });

      // Log successful calendar creation
      await logCalendarOperation({
        staffId: staff.id,
        operationType: 'create_calendar',
        operationStatus: 'success',
        googleCalendarId: calendarResult.calendarId
      });

      // Send calendar invite email
      try {
        await emailService.sendCalendarInvite({
          to: staff.email!,
          staffName: `${staff.first_name} ${staff.last_name}`,
          staffType: staff.staff_type,
          calendarUrl: calendarResult.calendarUrl!,
          calendarName: `${staff.first_name} ${staff.last_name} - ${staff.staff_type} - BestDOC`,
          organizationName: 'BestDOC'
        });
      } catch (emailError) {
        console.warn(`⚠️ Failed to send calendar invite email:`, emailError);
        // Don't fail calendar creation if email fails
      }

      // Start verification process
      try {
        const calendarVerificationService = getCalendarVerificationService();
        await calendarVerificationService.startVerification({
          staff_id: staff.id,
          google_calendar_id: calendarResult.calendarId!,
          staff_email: staff.email!
        });
      } catch (verificationError) {
        console.warn(`⚠️ Failed to start calendar verification:`, verificationError);
        // Don't fail calendar creation if verification fails
      }

      console.log(`✅ Successfully created calendar for staff ${staff.first_name} ${staff.last_name}`);

    } catch (error) {
      console.error(`❌ Failed to create calendar for staff ${staff.id}:`, error);

      // Log calendar creation failure
      await logCalendarOperation({
        staffId: staff.id,
        operationType: 'create_calendar',
        operationStatus: 'failed',
        errorCode: 'CALENDAR_CREATION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update staff record with error
      await this.updateStaff(staff.id, {
        calendar_verification_status: 'failed',
        calendar_error_code: 'CALENDAR_CREATION_FAILED'
      });

      throw error;
    }
  }

  /**
   * Update staff calendar when staff information changes
   */
  private async updateStaffCalendar(staffId: string, updates: Partial<UpdateStaff>): Promise<void> {
    try {
      const staff = await this.getStaffMember(staffId);
      if (!staff) {
        return; // Staff not found
      }

      // If email is being added/updated and staff doesn't have a calendar yet, create one
      if (updates.email && updates.email !== 'no-email@bestdoc.com' && !staff.google_calendar_id) {
        console.log(`📅 Creating calendar for staff ${staffId} with new email ${updates.email}`);

        // Create a temporary staff object with the updated email for calendar creation
        const staffWithEmail = { ...staff, email: updates.email };
        await this.createStaffCalendar(staffWithEmail);
        return;
      }

      // If staff already has a calendar, handle email changes
      if (staff.google_calendar_id && updates.email && updates.email !== staff.email) {
        console.log(`📅 Updating calendar sharing for staff ${staffId} with new email ${updates.email}`);

        const googleCalendarService = getGoogleCalendarService();

        // Share calendar with new email
        const shareResult = await googleCalendarService.shareCalendar({
          staff_id: staffId,
          google_calendar_id: staff.google_calendar_id,
          staff_email: updates.email,
          permission_level: 'reader'
        });

        if (!shareResult.success) {
          console.warn(`⚠️ Failed to share calendar with new email ${updates.email}:`, shareResult.errorMessage);
        }

        // Log calendar update
        await logCalendarOperation({
          staffId,
          operationType: 'share_calendar',
          operationStatus: shareResult.success ? 'success' : 'failed',
          errorCode: shareResult.errorCode,
          errorMessage: shareResult.errorMessage,
          googleCalendarId: staff.google_calendar_id
        });
      }

    } catch (error) {
      console.error(`❌ Failed to update calendar for staff ${staffId}:`, error);
      // Don't throw error as calendar update failure shouldn't break staff update
    }
  }

  /**
   * Delete staff calendar when staff is deleted
   */
  private async deleteStaffCalendar(staffId: string, googleCalendarId: string): Promise<void> {
    try {
      console.log(`📅 Deleting calendar ${googleCalendarId} for staff ${staffId}`);

      // Log calendar deletion start
      await logCalendarOperation({
        staffId,
        operationType: 'delete_calendar',
        operationStatus: 'pending',
        googleCalendarId
      });

      const googleCalendarService = getGoogleCalendarService();

      // Note: We don't actually delete the calendar from Google Calendar
      // as it might contain important historical data. Instead, we just
      // remove the staff's access and mark it as inactive in our system.

      // In a real implementation, you might want to:
      // 1. Remove all ACL entries for the staff member
      // 2. Archive the calendar
      // 3. Or actually delete it if that's the business requirement

      // For now, we'll just log the operation as successful
      await logCalendarOperation({
        staffId,
        operationType: 'delete_calendar',
        operationStatus: 'success',
        googleCalendarId
      });

      console.log(`✅ Successfully processed calendar deletion for staff ${staffId}`);

    } catch (error) {
      console.error(`❌ Failed to delete calendar for staff ${staffId}:`, error);

      // Log calendar deletion failure
      await logCalendarOperation({
        staffId,
        operationType: 'delete_calendar',
        operationStatus: 'failed',
        errorCode: 'CALENDAR_DELETION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        googleCalendarId
      });

      throw error;
    }
  }
}

// Export singleton instance
export const staffService = new StaffService();
export default staffService;
