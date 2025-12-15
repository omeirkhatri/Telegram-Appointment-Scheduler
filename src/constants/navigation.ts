import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Settings,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'driver' | 'staff' | 'viewer';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  roles?: UserRole[]; // If undefined, visible to all roles
  featureFlag?: string; // Optional feature flag to check
}

/**
 * Main navigation items for the application
 * Each item can optionally specify required roles for access control
 */
export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: Activity,
    // No roles specified = visible to all
  },
  {
    id: 'patients',
    label: 'Patients',
    href: '/patients',
    icon: Users,
    roles: ['admin', 'doctor', 'nurse', 'staff'],
  },
  {
    id: 'staff',
    label: 'Staff',
    href: '/staff',
    icon: UserCheck,
    roles: ['admin'],
  },
  {
    id: 'appointments',
    label: 'Appointments',
    href: '/appointments',
    icon: CalendarDays,
    roles: ['admin', 'doctor', 'nurse', 'staff'],
  },
  {
    id: 'metrics',
    label: 'Metrics',
    href: '/metrics',
    icon: BarChart3,
    roles: ['admin'],
    featureFlag: 'driver_assignment_overhaul_analytics',
  },
  {
    id: 'escalations',
    label: 'Escalations',
    href: '/escalations',
    icon: AlertTriangle,
    roles: ['admin', 'staff'],
    featureFlag: 'driver_assignment_overhaul_escalation',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

/**
 * Get navigation items for a specific user role
 * @param userRole - The current user's role
 * @param enableRoleFiltering - Whether to filter by role (set to false to show all)
 * @returns Filtered navigation items
 */
export function getNavigationItems(
  userRole: UserRole = 'admin',
  enableRoleFiltering: boolean = false
): NavigationItem[] {
  // For now, return all items without feature flag filtering to avoid hydration issues
  // Feature flags can be checked in the components that use these items
  if (!enableRoleFiltering) {
    return NAVIGATION_ITEMS;
  }

  // Filter by role when enabled
  return NAVIGATION_ITEMS.filter(item => {
    // Check role access
    const hasRoleAccess = !item.roles || item.roles.includes(userRole);
    return hasRoleAccess;
  });
}

/**
 * Check if a user has access to a specific navigation item
 */
export function hasAccessToRoute(
  itemId: string,
  userRole: UserRole = 'admin',
  enableRoleFiltering: boolean = false
): boolean {
  const item = NAVIGATION_ITEMS.find(i => i.id === itemId);
  if (!item) return false;

  if (!enableRoleFiltering) return true;

  return !item.roles || item.roles.includes(userRole);
}
