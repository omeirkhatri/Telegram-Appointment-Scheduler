import type { NavigationItem, UserRole } from '@/constants/navigation';
import { getNavigationItems } from '@/constants/navigation';

/**
 * Filter navigation items based on user role
 * @param items - Array of navigation items
 * @param userRole - Current user's role
 * @param enableRoleFiltering - Whether to actually filter by role
 * @returns Filtered navigation items
 */
export function filterNavigationByRole(
  items: NavigationItem[],
  userRole: UserRole = 'admin',
  enableRoleFiltering: boolean = false
): NavigationItem[] {
  if (!enableRoleFiltering) {
    // When filtering is disabled, return all items
    return items;
  }

  // Filter items based on role permissions
  return items.filter(item => {
    // If no roles specified, item is visible to everyone
    if (!item.roles || item.roles.length === 0) {
      return true;
    }

    // Check if user's role is in the allowed roles
    return item.roles.includes(userRole);
  });
}

/**
 * Get the active navigation item based on current path
 * @param items - Array of navigation items
 * @param currentPath - Current URL path
 * @returns The active navigation item or undefined
 */
export function getActiveNavigationItem(
  items: NavigationItem[],
  currentPath: string
): NavigationItem | undefined {
  // Exact match first
  const exactMatch = items.find(item => item.href === currentPath);
  if (exactMatch) return exactMatch;

  // For root path '/', only match exact
  if (currentPath === '/') {
    return items.find(item => item.href === '/');
  }

  // Find the longest matching path (for nested routes)
  const matches = items.filter(item => {
    if (item.href === '/') return false; // Skip root for partial matching
    return currentPath.startsWith(item.href);
  });

  if (matches.length === 0) return undefined;

  // Return the item with the longest href (most specific match)
  return matches.reduce((longest, current) => {
    return current.href.length > longest.href.length ? current : longest;
  });
}

/**
 * Get filtered and sorted navigation items for the current user
 * @param userRole - Current user's role
 * @param enableRoleFiltering - Whether role filtering is enabled
 * @returns Filtered navigation items
 */
export function getUserNavigationItems(
  userRole: UserRole = 'admin',
  enableRoleFiltering: boolean = false
): NavigationItem[] {
  return getNavigationItems(userRole, enableRoleFiltering);
}
