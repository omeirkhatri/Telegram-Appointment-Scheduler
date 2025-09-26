/**
 * Transportation Segments Configuration
 *
 * This module provides centralized configuration management for transportation segments,
 * including feature flags, environment settings, and rollout controls.
 */


// =============================================================================
// CONFIGURATION INTERFACES
// =============================================================================

export interface TransportationSegmentsConfig {
  // Feature flags
  enabled: boolean;
  uiEnabled: boolean;
  calendarEnabled: boolean;
  notificationsEnabled: boolean;
  mapsEnabled: boolean;
  driverBoardEnabled: boolean;
  reportingEnabled: boolean;
  overridesEnabled: boolean;
  travelTimeEnabled: boolean;

  // Configuration settings
  defaultBufferMinutes: number;
  minTravelGapMinutes: number;
  maxDailySegmentsPerDriver: number;
  overrideReminderHours: number;

  // Google Maps Distance Matrix settings
  distanceMatrixEnabled: boolean;
  distanceMatrixQuotaLimit: number;
  distanceMatrixCacheTtlHours: number;
  distanceMatrixFallbackEnabled: boolean;
}

// =============================================================================
// CONFIGURATION VALUES
// =============================================================================

export const transportationSegmentsConfig: TransportationSegmentsConfig = {
  // Feature flags - controlled by environment variables
  enabled: process.env.TRANSPORTATION_SEGMENTS_ENABLED === 'true',
  uiEnabled: process.env.TRANSPORTATION_SEGMENTS_UI_ENABLED === 'true',
  calendarEnabled: process.env.TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED === 'true',
  notificationsEnabled: process.env.TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED === 'true',
  mapsEnabled: process.env.TRANSPORTATION_SEGMENTS_MAPS_ENABLED === 'true',
  driverBoardEnabled: process.env.TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED === 'true',
  reportingEnabled: process.env.TRANSPORTATION_SEGMENTS_REPORTING_ENABLED === 'true',
  overridesEnabled: process.env.TRANSPORTATION_SEGMENTS_OVERRIDES_ENABLED === 'true',
  travelTimeEnabled: process.env.TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED === 'true',

  // Configuration settings with defaults
  defaultBufferMinutes: parseInt(process.env.TRANSPORTATION_SEGMENTS_DEFAULT_BUFFER_MINUTES || '20', 10),
  minTravelGapMinutes: parseInt(process.env.TRANSPORTATION_SEGMENTS_MIN_TRAVEL_GAP_MINUTES || '15', 10),
  maxDailySegmentsPerDriver: parseInt(process.env.TRANSPORTATION_SEGMENTS_MAX_DAILY_SEGMENTS_PER_DRIVER || '20', 10),
  overrideReminderHours: parseInt(process.env.TRANSPORTATION_SEGMENTS_OVERRIDE_REMINDER_HOURS || '2', 10),

  // Google Maps Distance Matrix settings
  distanceMatrixEnabled: process.env.GOOGLE_MAPS_DISTANCE_MATRIX_ENABLED === 'true',
  distanceMatrixQuotaLimit: parseInt(process.env.GOOGLE_MAPS_DISTANCE_MATRIX_QUOTA_LIMIT || '1000', 10),
  distanceMatrixCacheTtlHours: parseInt(process.env.GOOGLE_MAPS_DISTANCE_MATRIX_CACHE_TTL_HOURS || '1', 10),
  distanceMatrixFallbackEnabled: process.env.GOOGLE_MAPS_DISTANCE_MATRIX_FALLBACK_ENABLED === 'true',
};

// =============================================================================
// CONFIGURATION UTILITIES
// =============================================================================

/**
 * Check if transportation segments are enabled
 */
export function isTransportationSegmentsEnabled(): boolean {
  return transportationSegmentsConfig.enabled;
}

/**
 * Check if transportation segments UI is enabled
 */
export function isTransportationSegmentsUIEnabled(): boolean {
  return transportationSegmentsConfig.enabled && transportationSegmentsConfig.uiEnabled;
}

/**
 * Check if transportation segments calendar integration is enabled
 */
export function isTransportationSegmentsCalendarEnabled(): boolean {
  return transportationSegmentsConfig.enabled && transportationSegmentsConfig.calendarEnabled;
}

/**
 * Check if transportation segments notifications are enabled
 */
export function isTransportationSegmentsNotificationsEnabled(): boolean {
  return transportationSegmentsConfig.enabled && transportationSegmentsConfig.notificationsEnabled;
}

/**
 * Check if transportation segments maps integration is enabled
 */
export function isTransportationSegmentsMapsEnabled(): boolean {
  return transportationSegmentsConfig.enabled && transportationSegmentsConfig.mapsEnabled;
}

/**
 * Check if transportation segments driver board is enabled
 */
export function isTransportationSegmentsDriverBoardEnabled(): boolean {
  return transportationSegmentsConfig.enabled && transportationSegmentsConfig.driverBoardEnabled;
}

/**
 * Check if transportation segments reporting is enabled
 */
export function isTransportationSegmentsReportingEnabled(): boolean {
  return transportationSegmentsConfig.enabled && transportationSegmentsConfig.reportingEnabled;
}

/**
 * Check if transportation segments overrides are enabled
 */
export function isTransportationSegmentsOverridesEnabled(): boolean {
  return transportationSegmentsConfig.enabled && transportationSegmentsConfig.overridesEnabled;
}

/**
 * Check if transportation segments travel time calculations are enabled
 */
export function isTransportationSegmentsTravelTimeEnabled(): boolean {
  return transportationSegmentsConfig.enabled && transportationSegmentsConfig.travelTimeEnabled;
}

/**
 * Get transportation segments configuration
 */
export function getTransportationSegmentsConfig(): TransportationSegmentsConfig {
  return { ...transportationSegmentsConfig };
}

/**
 * Get default buffer minutes for transportation segments
 */
export function getDefaultBufferMinutes(): number {
  return transportationSegmentsConfig.defaultBufferMinutes;
}

/**
 * Get minimum travel gap minutes between segments
 */
export function getMinTravelGapMinutes(): number {
  return transportationSegmentsConfig.minTravelGapMinutes;
}

/**
 * Get maximum daily segments per driver
 */
export function getMaxDailySegmentsPerDriver(): number {
  return transportationSegmentsConfig.maxDailySegmentsPerDriver;
}

/**
 * Get override reminder hours
 */
export function getOverrideReminderHours(): number {
  return transportationSegmentsConfig.overrideReminderHours;
}

/**
 * Check if distance matrix API is enabled
 */
export function isDistanceMatrixEnabled(): boolean {
  return transportationSegmentsConfig.distanceMatrixEnabled;
}

/**
 * Get distance matrix quota limit
 */
export function getDistanceMatrixQuotaLimit(): number {
  return transportationSegmentsConfig.distanceMatrixQuotaLimit;
}

/**
 * Get distance matrix cache TTL in hours
 */
export function getDistanceMatrixCacheTtlHours(): number {
  return transportationSegmentsConfig.distanceMatrixCacheTtlHours;
}

/**
 * Check if distance matrix fallback is enabled
 */
export function isDistanceMatrixFallbackEnabled(): boolean {
  return transportationSegmentsConfig.distanceMatrixFallbackEnabled;
}

// =============================================================================
// ROLLOUT UTILITIES
// =============================================================================

/**
 * Get transportation segments rollout status
 */
export function getTransportationSegmentsRolloutStatus(): {
  enabled: boolean;
  features: {
    ui: boolean;
    calendar: boolean;
    notifications: boolean;
    maps: boolean;
    driverBoard: boolean;
    reporting: boolean;
    overrides: boolean;
    travelTime: boolean;
  };
  configuration: {
    defaultBufferMinutes: number;
    minTravelGapMinutes: number;
    maxDailySegmentsPerDriver: number;
    overrideReminderHours: number;
  };
  distanceMatrix: {
    enabled: boolean;
    quotaLimit: number;
    cacheTtlHours: number;
    fallbackEnabled: boolean;
  };
} {
  return {
    enabled: transportationSegmentsConfig.enabled,
    features: {
      ui: transportationSegmentsConfig.uiEnabled,
      calendar: transportationSegmentsConfig.calendarEnabled,
      notifications: transportationSegmentsConfig.notificationsEnabled,
      maps: transportationSegmentsConfig.mapsEnabled,
      driverBoard: transportationSegmentsConfig.driverBoardEnabled,
      reporting: transportationSegmentsConfig.reportingEnabled,
      overrides: transportationSegmentsConfig.overridesEnabled,
      travelTime: transportationSegmentsConfig.travelTimeEnabled,
    },
    configuration: {
      defaultBufferMinutes: transportationSegmentsConfig.defaultBufferMinutes,
      minTravelGapMinutes: transportationSegmentsConfig.minTravelGapMinutes,
      maxDailySegmentsPerDriver: transportationSegmentsConfig.maxDailySegmentsPerDriver,
      overrideReminderHours: transportationSegmentsConfig.overrideReminderHours,
    },
    distanceMatrix: {
      enabled: transportationSegmentsConfig.distanceMatrixEnabled,
      quotaLimit: transportationSegmentsConfig.distanceMatrixQuotaLimit,
      cacheTtlHours: transportationSegmentsConfig.distanceMatrixCacheTtlHours,
      fallbackEnabled: transportationSegmentsConfig.distanceMatrixFallbackEnabled,
    },
  };
}

/**
 * Validate transportation segments configuration
 */
export function validateTransportationSegmentsConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if main feature is enabled but no sub-features are enabled
  if (transportationSegmentsConfig.enabled) {
    const hasAnySubFeature =
      transportationSegmentsConfig.uiEnabled ||
      transportationSegmentsConfig.calendarEnabled ||
      transportationSegmentsConfig.notificationsEnabled ||
      transportationSegmentsConfig.mapsEnabled ||
      transportationSegmentsConfig.driverBoardEnabled ||
      transportationSegmentsConfig.reportingEnabled ||
      transportationSegmentsConfig.overridesEnabled ||
      transportationSegmentsConfig.travelTimeEnabled;

    if (!hasAnySubFeature) {
      errors.push('Transportation segments is enabled but no sub-features are enabled');
    }
  }

  // Check configuration values
  if (transportationSegmentsConfig.defaultBufferMinutes < 0) {
    errors.push('Default buffer minutes must be non-negative');
  }

  if (transportationSegmentsConfig.minTravelGapMinutes < 0) {
    errors.push('Minimum travel gap minutes must be non-negative');
  }

  if (transportationSegmentsConfig.maxDailySegmentsPerDriver <= 0) {
    errors.push('Maximum daily segments per driver must be positive');
  }

  if (transportationSegmentsConfig.overrideReminderHours < 0) {
    errors.push('Override reminder hours must be non-negative');
  }

  if (transportationSegmentsConfig.distanceMatrixQuotaLimit <= 0) {
    errors.push('Distance matrix quota limit must be positive');
  }

  if (transportationSegmentsConfig.distanceMatrixCacheTtlHours <= 0) {
    errors.push('Distance matrix cache TTL must be positive');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get transportation segments configuration summary for logging
 */
export function getTransportationSegmentsConfigSummary(): string {
  const status = getTransportationSegmentsRolloutStatus();

  let summary = `Transportation Segments Configuration:\n`;
  summary += `  Main Feature: ${status.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;

  if (status.enabled) {
    summary += `  Features:\n`;
    summary += `    UI: ${status.features.ui ? '✅' : '❌'}\n`;
    summary += `    Calendar: ${status.features.calendar ? '✅' : '❌'}\n`;
    summary += `    Notifications: ${status.features.notifications ? '✅' : '❌'}\n`;
    summary += `    Maps: ${status.features.maps ? '✅' : '❌'}\n`;
    summary += `    Driver Board: ${status.features.driverBoard ? '✅' : '❌'}\n`;
    summary += `    Reporting: ${status.features.reporting ? '✅' : '❌'}\n`;
    summary += `    Overrides: ${status.features.overrides ? '✅' : '❌'}\n`;
    summary += `    Travel Time: ${status.features.travelTime ? '✅' : '❌'}\n`;

    summary += `  Configuration:\n`;
    summary += `    Default Buffer: ${status.configuration.defaultBufferMinutes} minutes\n`;
    summary += `    Min Travel Gap: ${status.configuration.minTravelGapMinutes} minutes\n`;
    summary += `    Max Daily Segments: ${status.configuration.maxDailySegmentsPerDriver}\n`;
    summary += `    Override Reminder: ${status.configuration.overrideReminderHours} hours\n`;

    summary += `  Distance Matrix:\n`;
    summary += `    Enabled: ${status.distanceMatrix.enabled ? '✅' : '❌'}\n`;
    summary += `    Quota Limit: ${status.distanceMatrix.quotaLimit}\n`;
    summary += `    Cache TTL: ${status.distanceMatrix.cacheTtlHours} hours\n`;
    summary += `    Fallback: ${status.distanceMatrix.fallbackEnabled ? '✅' : '❌'}\n`;
  }

  return summary;
}

// =============================================================================
// CONFIGURATION VALIDATION ON STARTUP
// =============================================================================

/**
 * Validate transportation segments configuration on application startup
 */
export function validateTransportationSegmentsConfigOnStartup(): void {
  const validation = validateTransportationSegmentsConfig();

  if (!validation.valid) {
    console.error('❌ Transportation segments configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Transportation segments configuration is invalid');
  }

  console.log('✅ Transportation segments configuration validated successfully');
  console.log(getTransportationSegmentsConfigSummary());
}
