import { supabase } from '@/lib/supabase';
import type { CreateUserProfile, UpdateUserProfile, UserFilters, UserProfile } from '@/types/user';

export class UserService {
  /**
   * Get current user profile from Supabase auth
   */
  static async getCurrentUser(): Promise<UserProfile> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }

    return profile;
  }

  /**
   * Get user profile by ID
   */
  static async getUserById(id: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all active users
   */
  static async getActiveUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      throw new Error(`Failed to get active users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get users with filters
   */
  static async getUsers(filters?: UserFilters): Promise<UserProfile[]> {
    let query = supabase
      .from('user_profiles')
      .select('*');

    if (filters?.role && filters.role.length > 0) {
      query = query.in('role', filters.role);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('full_name');

    if (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create user profile
   */
  static async createUserProfile(data: CreateUserProfile): Promise<UserProfile> {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .insert({
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role || 'manager',
        is_active: data.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`);
    }

    return profile;
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(id: string, data: UpdateUserProfile): Promise<UserProfile> {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    return profile;
  }

  /**
   * Deactivate user (soft delete)
   */
  static async deactivateUser(id: string): Promise<UserProfile> {
    return this.updateUserProfile(id, { is_active: false });
  }

  /**
   * Activate user
   */
  static async activateUser(id: string): Promise<UserProfile> {
    return this.updateUserProfile(id, { is_active: true });
  }

  /**
   * Get user statistics
   */
  static async getUserStatistics(): Promise<{
    total_users: number;
    active_users: number;
    users_by_role: Record<string, number>;
  }> {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('role, is_active');

    if (error) {
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }

    const total_users = users.length;
    const active_users = users.filter(user => user.is_active).length;

    const users_by_role = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_users,
      active_users,
      users_by_role,
    };
  }

  /**
   * Check if user has permission to perform action
   */
  static async checkPermission(userId: string, action: string): Promise<boolean> {
    const user = await this.getUserById(userId);

    switch (action) {
      case 'manage_users':
        return user.role === 'admin';
      case 'sync_google_sheets':
        return user.role === 'admin';
      case 'delete_leads':
        return user.role === 'admin';
      case 'convert_leads':
        return user.role === 'admin' || user.role === 'manager';
      default:
        return false;
    }
  }
}



