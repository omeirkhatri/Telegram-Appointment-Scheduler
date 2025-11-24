/**
 * Feature flags for Google Calendar functionality
 *
 * This module provides centralized feature flag management for calendar-related features,
 * allowing for gradual rollout and easy feature toggling without code changes.
 */

import { config } from './env';

// =============================================================================
// FEATURE FLAG DEFINITIONS
// =============================================================================

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'calendar' | 'verification' | 'sync' | 'ui' | 'api';
  environment: 'development' | 'staging' | 'production' | 'all';
  dependencies?: string[];
  experimental?: boolean;
}

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Core Calendar Features
  GOOGLE_CALENDAR_ENABLED: {
    key: 'GOOGLE_CALENDAR_ENABLED',
    name: 'Google Calendar Integration',
    description: 'Enable Google Calendar integration for staff calendar management',
    enabled: true, // Always enabled if service account is configured
    category: 'calendar',
    environment: 'all',
  },

  CALENDAR_CREATION: {
    key: 'CALENDAR_CREATION',
    name: 'Calendar Creation',
    description: 'Allow creation of new calendars for staff members',
    enabled: true,
    category: 'calendar',
    environment: 'all',
    dependencies: ['GOOGLE_CALENDAR_ENABLED'],
  },

  CALENDAR_SHARING: {
    key: 'CALENDAR_SHARING',
    name: 'Calendar Sharing',
    description: 'Enable sharing of calendars with staff members',
    enabled: true,
    category: 'calendar',
    environment: 'all',
    dependencies: ['GOOGLE_CALENDAR_ENABLED', 'CALENDAR_CREATION'],
  },

  CALENDAR_DELETION: {
    key: 'CALENDAR_DELETION',
    name: 'Calendar Deletion',
    description: 'Allow deletion of staff calendars when staff is removed',
    enabled: true,
    category: 'calendar',
    environment: 'all',
    dependencies: ['GOOGLE_CALENDAR_ENABLED'],
  },

  // Verification Features
  CALENDAR_VERIFICATION: {
    key: 'CALENDAR_VERIFICATION',
    name: 'Calendar Verification',
    description: 'Enable calendar verification process for new staff calendars',
    enabled: config.googleCalendar?.verificationEnabled ?? false,
    category: 'verification',
    environment: 'all',
    dependencies: ['GOOGLE_CALENDAR_ENABLED', 'CALENDAR_CREATION'],
  },

  VERIFICATION_EMAIL: {
    key: 'VERIFICATION_EMAIL',
    name: 'Verification Email',
    description: 'Send verification emails to staff members for calendar setup',
    enabled: config.googleCalendar?.verificationEnabled ?? false,
    category: 'verification',
    environment: 'all',
    dependencies: ['CALENDAR_VERIFICATION'],
  },

  VERIFICATION_TEST_EVENT: {
    key: 'VERIFICATION_TEST_EVENT',
    name: 'Verification Test Event',
    description: 'Create test events during calendar verification process',
    enabled: config.googleCalendar?.verificationEnabled ?? false,
    category: 'verification',
    environment: 'all',
    dependencies: ['CALENDAR_VERIFICATION'],
  },

  // Sync Features
  APPOINTMENT_SYNC: {
    key: 'APPOINTMENT_SYNC',
    name: 'Appointment Sync',
    description: 'Sync appointments to staff calendars automatically',
    enabled: config.googleCalendar?.syncEnabled ?? false,
    category: 'sync',
    environment: 'all',
    dependencies: ['GOOGLE_CALENDAR_ENABLED', 'CALENDAR_SHARING'],
  },

  APPOINTMENT_UPDATE_SYNC: {
    key: 'APPOINTMENT_UPDATE_SYNC',
    name: 'Appointment Update Sync',
    description: 'Sync appointment updates to staff calendars',
    enabled: config.googleCalendar?.syncEnabled ?? false,
    category: 'sync',
    environment: 'all',
    dependencies: ['APPOINTMENT_SYNC'],
  },

  APPOINTMENT_DELETE_SYNC: {
    key: 'APPOINTMENT_DELETE_SYNC',
    name: 'Appointment Delete Sync',
    description: 'Remove appointments from staff calendars when deleted',
    enabled: config.googleCalendar?.syncEnabled ?? false,
    category: 'sync',
    environment: 'all',
    dependencies: ['APPOINTMENT_SYNC'],
  },

  BULK_SYNC: {
    key: 'BULK_SYNC',
    name: 'Bulk Sync',
    description: 'Enable bulk synchronization of multiple appointments',
    enabled: config.googleCalendar?.syncEnabled ?? false,
    category: 'sync',
    environment: 'all',
    dependencies: ['APPOINTMENT_SYNC'],
  },

  // UI Features
  CALENDAR_STATUS_UI: {
    key: 'CALENDAR_STATUS_UI',
    name: 'Calendar Status UI',
    description: 'Show calendar status and verification state in staff interface',
    enabled: true,
    category: 'ui',
    environment: 'all',
    dependencies: ['GOOGLE_CALENDAR_ENABLED'],
  },

  CALENDAR_RETRY_UI: {
    key: 'CALENDAR_RETRY_UI',
    name: 'Calendar Retry UI',
    description: 'Show retry buttons for failed calendar operations',
    enabled: true,
    category: 'ui',
    environment: 'all',
    dependencies: ['CALENDAR_STATUS_UI'],
  },

  CALENDAR_FILTERS: {
    key: 'CALENDAR_FILTERS',
    name: 'Calendar Filters',
    description: 'Enable filtering staff by calendar status',
    enabled: true,
    category: 'ui',
    environment: 'all',
    dependencies: ['CALENDAR_STATUS_UI'],
  },

  CALENDAR_ERROR_DISPLAY: {
    key: 'CALENDAR_ERROR_DISPLAY',
    name: 'Calendar Error Display',
    description: 'Show detailed error information for calendar operations',
    enabled: true,
    category: 'ui',
    environment: 'all',
    dependencies: ['CALENDAR_STATUS_UI'],
  },

  // API Features
  CALENDAR_API_ENDPOINTS: {
    key: 'CALENDAR_API_ENDPOINTS',
    name: 'Calendar API Endpoints',
    description: 'Enable calendar-related API endpoints',
    enabled: true,
    category: 'api',
    environment: 'all',
    dependencies: ['GOOGLE_CALENDAR_ENABLED'],
  },

  CALENDAR_WEBHOOKS: {
    key: 'CALENDAR_WEBHOOKS',
    name: 'Calendar Webhooks',
    description: 'Enable webhook notifications for calendar events',
    enabled: true,
    category: 'api',
    environment: 'all',
    dependencies: ['CALENDAR_API_ENDPOINTS'],
    experimental: true,
  },

  CALENDAR_ANALYTICS: {
    key: 'CALENDAR_ANALYTICS',
    name: 'Calendar Analytics',
    description: 'Track calendar usage and performance metrics',
    enabled: true,
    category: 'api',
    environment: 'all',
    dependencies: ['CALENDAR_API_ENDPOINTS'],
    experimental: true,
  },

  // Advanced Features
  CALENDAR_TEMPLATES: {
    key: 'CALENDAR_TEMPLATES',
    name: 'Calendar Templates',
    description: 'Use predefined templates for calendar creation',
    enabled: true,
    category: 'calendar',
    environment: 'all',
    dependencies: ['CALENDAR_CREATION'],
    experimental: true,
  },

  CALENDAR_BACKUP: {
    key: 'CALENDAR_BACKUP',
    name: 'Calendar Backup',
    description: 'Automatically backup calendar data',
    enabled: true,
    category: 'calendar',
    environment: 'all',
    dependencies: ['GOOGLE_CALENDAR_ENABLED'],
    experimental: true,
  },

  CALENDAR_MIGRATION: {
    key: 'CALENDAR_MIGRATION',
    name: 'Calendar Migration',
    description: 'Migrate existing calendars to new format',
    enabled: true,
    category: 'calendar',
    environment: 'all',
    dependencies: ['GOOGLE_CALENDAR_ENABLED'],
    experimental: true,
  },

  // Transportation Segments Features
  TRANSPORTATION_SEGMENTS_ENABLED: {
    key: 'TRANSPORTATION_SEGMENTS_ENABLED',
    name: 'Transportation Segments',
    description: 'Enable transportation segments for driver scheduling',
    enabled: true, // Enabled for driver board functionality
    category: 'api',
    environment: 'all',
    experimental: true,
  },

  TRANSPORTATION_SEGMENTS_UI: {
    key: 'TRANSPORTATION_SEGMENTS_UI',
    name: 'Transportation Segments UI',
    description: 'Enable transportation segments UI components and forms',
    enabled: true,
    category: 'ui',
    environment: 'all',
    dependencies: ['TRANSPORTATION_SEGMENTS_ENABLED'],
    experimental: true,
  },

  TRANSPORTATION_SEGMENTS_CALENDAR: {
    key: 'TRANSPORTATION_SEGMENTS_CALENDAR',
    name: 'Transportation Segments Calendar',
    description: 'Enable calendar integration for transportation segments',
    enabled: false,
    category: 'calendar',
    environment: 'all',
    dependencies: ['TRANSPORTATION_SEGMENTS_ENABLED', 'GOOGLE_CALENDAR_ENABLED'],
    experimental: true,
  },

  TRANSPORTATION_SEGMENTS_NOTIFICATIONS: {
    key: 'TRANSPORTATION_SEGMENTS_NOTIFICATIONS',
    name: 'Transportation Segments Notifications',
    description: 'Enable Telegram notifications for transportation segments',
    enabled: false,
    category: 'api',
    environment: 'all',
    dependencies: ['TRANSPORTATION_SEGMENTS_ENABLED'],
    experimental: true,
  },

  TRANSPORTATION_SEGMENTS_MAPS: {
    key: 'TRANSPORTATION_SEGMENTS_MAPS',
    name: 'Transportation Segments Maps',
    description: 'Enable map integration for transportation segments',
    enabled: false,
    category: 'ui',
    environment: 'all',
    dependencies: ['TRANSPORTATION_SEGMENTS_ENABLED'],
    experimental: true,
  },

  TRANSPORTATION_SEGMENTS_DRIVER_BOARD: {
    key: 'TRANSPORTATION_SEGMENTS_DRIVER_BOARD',
    name: 'Transportation Segments Driver Board',
    description: 'Enable driver board for transportation segments',
    enabled: true,
    category: 'ui',
    environment: 'all',
    dependencies: ['TRANSPORTATION_SEGMENTS_ENABLED'],
    experimental: true,
  },

  TRANSPORTATION_SEGMENTS_REPORTING: {
    key: 'TRANSPORTATION_SEGMENTS_REPORTING',
    name: 'Transportation Segments Reporting',
    description: 'Enable reporting and analytics for transportation segments',
    enabled: true,
    category: 'api',
    environment: 'all',
    dependencies: ['TRANSPORTATION_SEGMENTS_ENABLED'],
    experimental: true,
  },

  TRANSPORTATION_SEGMENTS_OVERRIDES: {
    key: 'TRANSPORTATION_SEGMENTS_OVERRIDES',
    name: 'Transportation Segments Overrides',
    description: 'Enable manual override functionality for transportation segments',
    enabled: false,
    category: 'api',
    environment: 'all',
    dependencies: ['TRANSPORTATION_SEGMENTS_ENABLED'],
    experimental: true,
  },

  TRANSPORTATION_SEGMENTS_TRAVEL_TIME: {
    key: 'TRANSPORTATION_SEGMENTS_TRAVEL_TIME',
    name: 'Transportation Segments Travel Time',
    description: 'Enable travel time calculations for transportation segments',
    enabled: false,
    category: 'api',
    environment: 'all',
    dependencies: ['TRANSPORTATION_SEGMENTS_ENABLED'],
    experimental: true,
  },

  // Driver Assignment Overhaul Features
  DRIVER_ASSIGNMENT_OVERHAUL: {
    key: 'DRIVER_ASSIGNMENT_OVERHAUL',
    name: 'Driver Assignment Overhaul',
    description: 'Enable new driver assignment workflow with assign-now/assign-later modes, capacity planner, and assistive assignment engine',
    enabled: config.driverAssignmentOverhaul?.enabled ?? false,
    category: 'api',
    environment: 'all',
    dependencies: ['TRANSPORTATION_SEGMENTS_ENABLED'],
    experimental: true,
  },

  DRIVER_ASSIGNMENT_OVERHAUL_UI: {
    key: 'DRIVER_ASSIGNMENT_OVERHAUL_UI',
    name: 'Driver Assignment Overhaul UI',
    description: 'Enable new UI components for driver assignment overhaul (assignment mode toggle, capacity planner, unassigned queue)',
    enabled: config.driverAssignmentOverhaul?.uiEnabled ?? false,
    category: 'ui',
    environment: 'all',
    dependencies: ['DRIVER_ASSIGNMENT_OVERHAUL', 'TRANSPORTATION_SEGMENTS_UI'],
    experimental: true,
  },

  DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: {
    key: 'DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER',
    name: 'Driver Assignment Overhaul Capacity Planner',
    description: 'Enable capacity planner dashboard with driver lanes, unassigned queue, and insights panel',
    enabled: config.driverAssignmentOverhaul?.capacityPlannerEnabled ?? false,
    category: 'ui',
    environment: 'all',
    dependencies: ['DRIVER_ASSIGNMENT_OVERHAUL_UI'],
    experimental: true,
  },

  DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: {
    key: 'DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE',
    name: 'Driver Assignment Overhaul Assistive Engine',
    description: 'Enable assistive assignment engine with driver scoring, recommendations, and override tracking',
    enabled: config.driverAssignmentOverhaul?.assistiveEngineEnabled ?? false,
    category: 'api',
    environment: 'all',
    dependencies: ['DRIVER_ASSIGNMENT_OVERHAUL'],
    experimental: true,
  },

  DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: {
    key: 'DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS',
    name: 'Driver Assignment Overhaul Analytics',
    description: 'Enable analytics and metrics collection for driver assignment overhaul features',
    enabled: config.driverAssignmentOverhaul?.analyticsEnabled ?? false,
    category: 'api',
    environment: 'all',
    dependencies: ['DRIVER_ASSIGNMENT_OVERHAUL'],
    experimental: true,
  },

  DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: {
    key: 'DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION',
    name: 'Driver Assignment Overhaul Escalation',
    description: 'Enable six-hour escalation alerts and monitoring for unassigned segments',
    enabled: config.driverAssignmentOverhaul?.escalationEnabled ?? false,
    category: 'api',
    environment: 'all',
    dependencies: ['DRIVER_ASSIGNMENT_OVERHAUL'],
    experimental: true,
  },
};

// =============================================================================
// FEATURE FLAG UTILITIES
// =============================================================================

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  const flag = FEATURE_FLAGS[flagKey];
  if (!flag) {
    console.warn(`Feature flag '${flagKey}' not found`);
    return false;
  }

  // Check dependencies first
  if (flag.dependencies) {
    for (const dependency of flag.dependencies) {
      if (!isFeatureEnabled(dependency)) {
        return false;
      }
    }
  }

  return flag.enabled;
}

/**
 * Check if a feature flag is enabled for a specific environment
 */
export function isFeatureEnabledForEnvironment(flagKey: string, environment: string): boolean {
  const flag = FEATURE_FLAGS[flagKey];
  if (!flag) {
    return false;
  }

  if (flag.environment !== 'all' && flag.environment !== environment) {
    return false;
  }

  return isFeatureEnabled(flagKey);
}

/**
 * Get all enabled feature flags
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => isFeatureEnabled(flag.key));
}

/**
 * Get all feature flags by category
 */
export function getFeaturesByCategory(category: string): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => flag.category === category);
}

/**
 * Get all experimental features
 */
export function getExperimentalFeatures(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => flag.experimental === true);
}

/**
 * Get feature flag information
 */
export function getFeatureFlag(flagKey: string): FeatureFlag | undefined {
  return FEATURE_FLAGS[flagKey];
}

/**
 * Check if a feature is experimental
 */
export function isExperimentalFeature(flagKey: string): boolean {
  const flag = FEATURE_FLAGS[flagKey];
  return flag?.experimental === true;
}

/**
 * Get all dependencies for a feature flag
 */
export function getFeatureDependencies(flagKey: string): string[] {
  const flag = FEATURE_FLAGS[flagKey];
  return flag?.dependencies ?? [];
}

/**
 * Check if all dependencies are satisfied for a feature flag
 */
export function areDependenciesSatisfied(flagKey: string): boolean {
  const dependencies = getFeatureDependencies(flagKey);
  return dependencies.every(dep => isFeatureEnabled(dep));
}

/**
 * Get feature flags that depend on a specific flag
 */
export function getDependentFeatures(flagKey: string): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag =>
    flag.dependencies?.includes(flagKey)
  );
}

/**
 * Validate feature flag configuration
 */
export function validateFeatureFlags(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, flag] of Object.entries(FEATURE_FLAGS)) {
    // Check for circular dependencies
    if (hasCircularDependency(key, new Set())) {
      errors.push(`Circular dependency detected for feature flag: ${key}`);
    }

    // Check if dependencies exist
    if (flag.dependencies) {
      for (const dep of flag.dependencies) {
        if (!FEATURE_FLAGS[dep]) {
          errors.push(`Feature flag '${key}' depends on non-existent flag: ${dep}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check for circular dependencies in feature flags
 */
function hasCircularDependency(flagKey: string, visited: Set<string>): boolean {
  if (visited.has(flagKey)) {
    return true;
  }

  visited.add(flagKey);
  const flag = FEATURE_FLAGS[flagKey];

  if (flag?.dependencies) {
    for (const dep of flag.dependencies) {
      if (hasCircularDependency(dep, new Set(visited))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get feature flag status summary
 */
export function getFeatureFlagSummary(): {
  total: number;
  enabled: number;
  disabled: number;
  experimental: number;
  byCategory: Record<string, { total: number; enabled: number; disabled: number; }>;
} {
  const flags = Object.values(FEATURE_FLAGS);
  const enabled = flags.filter(flag => isFeatureEnabled(flag.key));
  const experimental = flags.filter(flag => flag.experimental === true);

  const byCategory: Record<string, { total: number; enabled: number; disabled: number; }> = {};

  for (const flag of flags) {
    if (!byCategory[flag.category]) {
      byCategory[flag.category] = { total: 0, enabled: 0, disabled: 0 };
    }

    byCategory[flag.category].total++;
    if (isFeatureEnabled(flag.key)) {
      byCategory[flag.category].enabled++;
    } else {
      byCategory[flag.category].disabled++;
    }
  }

  return {
    total: flags.length,
    enabled: enabled.length,
    disabled: flags.length - enabled.length,
    experimental: experimental.length,
    byCategory
  };
}

/**
 * Runtime feature flag check with fallback
 */
export function withFeatureFlag<T>(
  flagKey: string,
  enabledCallback: () => T,
  disabledCallback?: () => T
): T {
  if (isFeatureEnabled(flagKey)) {
    return enabledCallback();
  }

  if (disabledCallback) {
    return disabledCallback();
  }

  throw new Error(`Feature '${flagKey}' is disabled and no fallback provided`);
}

/**
 * Conditional feature flag execution
 */
export function ifFeatureEnabled(flagKey: string, callback: () => void): void {
  if (isFeatureEnabled(flagKey)) {
    callback();
  }
}

// =============================================================================
// CALENDAR-SPECIFIC FEATURE FLAGS
// =============================================================================

/**
 * Check if Google Calendar integration is enabled
 */
export function isGoogleCalendarEnabled(): boolean {
  return isFeatureEnabled('GOOGLE_CALENDAR_ENABLED');
}

/**
 * Check if calendar creation is enabled
 */
export function isCalendarCreationEnabled(): boolean {
  return isFeatureEnabled('CALENDAR_CREATION');
}

/**
 * Check if calendar sharing is enabled
 */
export function isCalendarSharingEnabled(): boolean {
  return isFeatureEnabled('CALENDAR_SHARING');
}

/**
 * Check if calendar verification is enabled
 */
export function isCalendarVerificationEnabled(): boolean {
  return isFeatureEnabled('CALENDAR_VERIFICATION');
}

/**
 * Check if appointment sync is enabled
 */
export function isAppointmentSyncEnabled(): boolean {
  return isFeatureEnabled('APPOINTMENT_SYNC');
}

/**
 * Check if calendar status UI is enabled
 */
export function isCalendarStatusUIEnabled(): boolean {
  return isFeatureEnabled('CALENDAR_STATUS_UI');
}

/**
 * Check if calendar API endpoints are enabled
 */
export function areCalendarAPIEndpointsEnabled(): boolean {
  return isFeatureEnabled('CALENDAR_API_ENDPOINTS');
}

// =============================================================================
// TRANSPORTATION SEGMENTS FEATURE FLAGS
// =============================================================================

/**
 * Check if transportation segments are enabled
 */
export function isTransportationSegmentsEnabled(): boolean {
  return isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED');
}

/**
 * Check if transportation segments UI is enabled
 */
export function isTransportationSegmentsUIEnabled(): boolean {
  return isFeatureEnabled('TRANSPORTATION_SEGMENTS_UI');
}

/**
 * Check if transportation segments calendar integration is enabled
 */
export function isTransportationSegmentsCalendarEnabled(): boolean {
  return isFeatureEnabled('TRANSPORTATION_SEGMENTS_CALENDAR');
}

/**
 * Check if transportation segments notifications are enabled
 */
export function isTransportationSegmentsNotificationsEnabled(): boolean {
  return isFeatureEnabled('TRANSPORTATION_SEGMENTS_NOTIFICATIONS');
}

/**
 * Check if transportation segments maps integration is enabled
 */
export function isTransportationSegmentsMapsEnabled(): boolean {
  return isFeatureEnabled('TRANSPORTATION_SEGMENTS_MAPS');
}

/**
 * Check if transportation segments driver board is enabled
 */
export function isTransportationSegmentsDriverBoardEnabled(): boolean {
  return isFeatureEnabled('TRANSPORTATION_SEGMENTS_DRIVER_BOARD');
}

/**
 * Check if transportation segments reporting is enabled
 */
export function isTransportationSegmentsReportingEnabled(): boolean {
  return isFeatureEnabled('TRANSPORTATION_SEGMENTS_REPORTING');
}

/**
 * Check if transportation segments overrides are enabled
 */
export function isTransportationSegmentsOverridesEnabled(): boolean {
  return isFeatureEnabled('TRANSPORTATION_SEGMENTS_OVERRIDES');
}

/**
 * Check if transportation segments travel time calculations are enabled
 */
export function isTransportationSegmentsTravelTimeEnabled(): boolean {
  return isFeatureEnabled('TRANSPORTATION_SEGMENTS_TRAVEL_TIME');
}

// =============================================================================
// DRIVER ASSIGNMENT OVERHAUL FEATURE FLAGS
// =============================================================================

/**
 * Check if driver assignment overhaul is enabled
 */
export function isDriverAssignmentOverhaulEnabled(): boolean {
  return isFeatureEnabled('DRIVER_ASSIGNMENT_OVERHAUL');
}

/**
 * Check if driver assignment overhaul UI is enabled
 */
export function isDriverAssignmentOverhaulUIEnabled(): boolean {
  return isFeatureEnabled('DRIVER_ASSIGNMENT_OVERHAUL_UI');
}

/**
 * Check if driver assignment overhaul capacity planner is enabled
 */
export function isDriverAssignmentOverhaulCapacityPlannerEnabled(): boolean {
  return isFeatureEnabled('DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER');
}

/**
 * Check if driver assignment overhaul assistive engine is enabled
 */
export function isDriverAssignmentOverhaulAssistiveEngineEnabled(): boolean {
  return isFeatureEnabled('DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE');
}

/**
 * Check if driver assignment overhaul analytics is enabled
 */
export function isDriverAssignmentOverhaulAnalyticsEnabled(): boolean {
  return isFeatureEnabled('DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS');
}

/**
 * Check if driver assignment overhaul escalation is enabled
 */
export function isDriverAssignmentOverhaulEscalationEnabled(): boolean {
  return isFeatureEnabled('DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION');
}

// =============================================================================
// FEATURE FLAG VALIDATION ON STARTUP
// =============================================================================

/**
 * Validate feature flags on application startup
 */
export function validateFeatureFlagsOnStartup(): void {
  const validation = validateFeatureFlags();

  if (!validation.valid) {
    console.error('❌ Feature flag validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Feature flag configuration is invalid');
  }

  const summary = getFeatureFlagSummary();
  console.log('✅ Feature flags validated successfully');
  console.log(`📊 Feature flags summary: ${summary.enabled}/${summary.total} enabled`);
  console.log(`🧪 Experimental features: ${summary.experimental}`);

  // Log enabled features by category
  Object.entries(summary.byCategory).forEach(([category, stats]) => {
    console.log(`  ${category}: ${stats.enabled}/${stats.total} enabled`);
  });
}

// Export feature flag definitions for external use
export { FEATURE_FLAGS as CALENDAR_FEATURE_FLAGS };
