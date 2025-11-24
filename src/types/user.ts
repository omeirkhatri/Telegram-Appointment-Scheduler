// User types for lead management system

// User role type
export type UserRole = 'admin' | 'manager';

// User profile interface (extends Supabase auth.users)
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Create user profile type
export interface CreateUserProfile {
  id: string; // Must match auth.users.id
  email: string;
  full_name: string;
  role?: UserRole;
  is_active?: boolean;
}

// Update user profile type
export interface UpdateUserProfile {
  email?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

// User filters for search
export interface UserFilters {
  role?: UserRole[];
  is_active?: boolean;
  search?: string; // Search in full_name, email
}

// User statistics
export interface UserStatistics {
  total_users: number;
  active_users: number;
  users_by_role: Record<UserRole, number>;
  recent_activity: {
    user_id: string;
    user_name: string;
    last_activity: string;
    activity_count: number;
  }[];
}

// Helper functions
export function getUserDisplayName(user: UserProfile): string {
  return user.full_name || user.email;
}

export function getUserRoleColor(role: UserRole): string {
  const colors = {
    admin: 'bg-red-100 text-red-800',
    manager: 'bg-blue-100 text-blue-800',
  };
  return colors[role];
}

export function getUserInitials(user: UserProfile): string {
  const name = user.full_name || user.email;
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Permission helpers
export function canManageUsers(user: UserProfile): boolean {
  return user.role === 'admin';
}

export function canSyncGoogleSheets(user: UserProfile): boolean {
  return user.role === 'admin';
}

export function canDeleteLeads(user: UserProfile): boolean {
  return user.role === 'admin';
}

export function canEditLead(user: UserProfile, lead?: { assigned_to_user_id?: string }): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'manager') {
    // Managers can edit leads assigned to them or unassigned leads
    return !lead?.assigned_to_user_id || lead.assigned_to_user_id === user.id;
  }
  return false;
}

export function canConvertLead(user: UserProfile): boolean {
  return user.role === 'admin' || user.role === 'manager';
}

// Validation helpers
export function validateUserProfileData(data: CreateUserProfile | UpdateUserProfile): string[] {
  const errors: string[] = [];

  if ('email' in data && data.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }
  }

  if ('full_name' in data && data.full_name) {
    if (data.full_name.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }
    if (data.full_name.trim().length > 100) {
      errors.push('Full name must be less than 100 characters');
    }
  }

  if ('role' in data && data.role) {
    if (!['admin', 'manager'].includes(data.role)) {
      errors.push('Invalid role');
    }
  }

  return errors;
}

