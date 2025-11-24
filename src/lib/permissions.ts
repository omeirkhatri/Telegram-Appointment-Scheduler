import type { Lead, UserProfile } from '@/types';

/**
 * Permission utilities for role-based access control
 */

// Check if user can edit a specific lead
export function canEditLead(user: UserProfile, lead?: Lead): boolean {
  if (user.role === 'admin') return true;

  if (user.role === 'manager') {
    // Managers can edit leads assigned to them or unassigned leads
    return !lead?.assigned_to_user_id || lead.assigned_to_user_id === user.id;
  }

  return false;
}

// Check if user can delete leads
export function canDeleteLeads(user: UserProfile): boolean {
  return user.role === 'admin';
}

// Check if user can convert leads
export function canConvertLeads(user: UserProfile): boolean {
  return user.role === 'admin' || user.role === 'manager';
}

// Check if user can manage users
export function canManageUsers(user: UserProfile): boolean {
  return user.role === 'admin';
}

// Check if user can sync Google Sheets
export function canSyncGoogleSheets(user: UserProfile): boolean {
  return user.role === 'admin';
}

// Check if user can view all leads
export function canViewAllLeads(user: UserProfile): boolean {
  return user.role === 'admin';
}

// Check if user can view assigned leads only
export function canViewAssignedLeads(user: UserProfile): boolean {
  return user.role === 'manager';
}

// Check if user can assign leads
export function canAssignLeads(user: UserProfile): boolean {
  return user.role === 'admin' || user.role === 'manager';
}

// Check if user can delete quotes
export function canDeleteQuotes(user: UserProfile): boolean {
  return user.role === 'admin';
}

// Check if user can view sync logs
export function canViewSyncLogs(user: UserProfile): boolean {
  return user.role === 'admin';
}

// Get user's accessible lead filters
export function getLeadFiltersForUser(user: UserProfile) {
  if (user.role === 'admin') {
    return {}; // Admins can see all leads
  }

  if (user.role === 'manager') {
    return {
      assigned_to_user_id: user.id, // Managers see their assigned leads
    };
  }

  return { assigned_to_user_id: user.id };
}

// Check if user can perform action on lead
export function canPerformLeadAction(
  user: UserProfile,
  action: 'view' | 'edit' | 'delete' | 'assign' | 'convert',
  lead?: Lead
): boolean {
  switch (action) {
    case 'view':
      return canViewAllLeads(user) || (lead && canViewAssignedLeads(user) && lead.assigned_to_user_id === user.id);
    case 'edit':
      return canEditLead(user, lead);
    case 'delete':
      return canDeleteLeads(user);
    case 'assign':
      return canAssignLeads(user);
    case 'convert':
      return canConvertLeads(user);
    default:
      return false;
  }
}

// Get user's role display name
export function getRoleDisplayName(role: 'admin' | 'manager'): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'manager':
      return 'Manager';
    default:
      return 'Unknown';
  }
}

// Get user's role color class
export function getRoleColorClass(role: 'admin' | 'manager'): string {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800';
    case 'manager':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Check if user has any of the specified roles
export function hasAnyRole(user: UserProfile, roles: ('admin' | 'manager')[]): boolean {
  return roles.includes(user.role);
}

// Check if user has all of the specified roles (useful for future multi-role support)
export function hasAllRoles(user: UserProfile, roles: ('admin' | 'manager')[]): boolean {
  return roles.every(role => user.role === role);
}

// Get user's permission summary
export function getUserPermissions(user: UserProfile) {
  return {
    canEditLead: (lead?: Lead) => canEditLead(user, lead),
    canDeleteLeads: canDeleteLeads(user),
    canConvertLeads: canConvertLeads(user),
    canManageUsers: canManageUsers(user),
    canSyncGoogleSheets: canSyncGoogleSheets(user),
    canViewAllLeads: canViewAllLeads(user),
    canViewAssignedLeads: canViewAssignedLeads(user),
    canAssignLeads: canAssignLeads(user),
    canDeleteQuotes: canDeleteQuotes(user),
    canViewSyncLogs: canViewSyncLogs(user),
    leadFilters: getLeadFiltersForUser(user),
    role: user.role,
    roleDisplayName: getRoleDisplayName(user.role),
    roleColorClass: getRoleColorClass(user.role),
  };
}



