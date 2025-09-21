import { supabase } from '@/lib/supabase';
import type { CreateStaff, Staff, StaffFilters, UpdateStaff } from '@/types';

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

    return data;
  }

  // Delete a staff member
  async deleteStaff(id: string): Promise<void> {
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
}

// Export singleton instance
export const staffService = new StaffService();
export default staffService;
