import type { UserRole } from '@/constants/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get the current user's role
 * Currently returns 'admin' by default
 * Ready to integrate with real authentication system later
 */
export function useUserRole(): UserRole {
  const { user } = useAuth();

  // TODO: When user roles are implemented in AuthContext, return actual role
  // For now, return 'admin' to show all navigation items

  // Example of how it will work in the future:
  // if (user?.role) {
  //   return user.role as UserRole;
  // }

  // Default to admin role (shows everything)
  return 'admin';
}

/**
 * Hook to check if role-based filtering should be enabled
 * Set to false by default - will be enabled when roles are fully implemented
 */
export function useRoleFilteringEnabled(): boolean {
  // TODO: Enable this when user roles are ready
  return false;
}
