/**
 * Rollout Configuration for Driver Assignment Overhaul
 *
 * This module provides centralized rollout configuration management for the driver assignment overhaul,
 * including environment-specific settings, gradual rollout support, and deployment checklists.
 */

import { isDriverAssignmentOverhaulEnabled } from './featureFlags';

// =============================================================================
// ROLLOUT CONFIGURATION INTERFACES
// =============================================================================

export interface RolloutConfig {
  // Environment settings
  environment: 'development' | 'staging' | 'production';

  // Rollout phases
  phases: RolloutPhase[];

  // Feature-specific settings
  features: FeatureRolloutConfig;

  // Monitoring and safety
  monitoring: MonitoringConfig;

  // Rollback settings
  rollback: RollbackConfig;
}

export interface RolloutPhase {
  name: string;
  description: string;
  enabled: boolean;
  startDate?: string;
  endDate?: string;
  targetPercentage: number;
  features: string[];
  prerequisites: string[];
  successCriteria: string[];
  rollbackTriggers: string[];
}

export interface FeatureRolloutConfig {
  assignmentMode: {
    enabled: boolean;
    defaultMode: 'assign_now' | 'assign_later';
    allowOverride: boolean;
  };
  capacityPlanner: {
    enabled: boolean;
    defaultView: '24h' | '48h' | '72h';
    showInsights: boolean;
  };
  assistiveEngine: {
    enabled: boolean;
    confidenceThreshold: number;
    maxRecommendations: number;
  };
  analytics: {
    enabled: boolean;
    collectionInterval: number;
    retentionDays: number;
  };
  escalation: {
    enabled: boolean;
    deadlineHours: number;
    notificationChannels: string[];
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: string[];
  alertThresholds: Record<string, number>;
  reportingInterval: number;
}

export interface RollbackConfig {
  enabled: boolean;
  automatic: boolean;
  triggers: string[];
  procedures: string[];
}

// =============================================================================
// ROLLOUT CONFIGURATION VALUES
// =============================================================================

export const rolloutConfig: RolloutConfig = {
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',

  phases: [
    {
      name: 'Phase 1: Foundation',
      description: 'Enable core assignment mode functionality with basic UI',
      enabled: true,
      targetPercentage: 100,
      features: ['DRIVER_ASSIGNMENT_OVERHAUL', 'DRIVER_ASSIGNMENT_OVERHAUL_UI'],
      prerequisites: ['Database migrations completed', 'Feature flags configured'],
      successCriteria: ['Assignment mode toggle functional', 'Segments created without driver'],
      rollbackTriggers: ['High error rate', 'User complaints', 'Performance degradation']
    },
    {
      name: 'Phase 2: Capacity Planner',
      description: 'Enable capacity planner dashboard and unassigned queue',
      enabled: false,
      targetPercentage: 50,
      features: ['DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER'],
      prerequisites: ['Phase 1 stable', 'User training completed'],
      successCriteria: ['Capacity planner accessible', 'Unassigned queue functional'],
      rollbackTriggers: ['UI performance issues', 'Data inconsistency']
    },
    {
      name: 'Phase 3: Assistive Engine',
      description: 'Enable driver scoring and recommendation engine',
      enabled: false,
      targetPercentage: 25,
      features: ['DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE'],
      prerequisites: ['Phase 2 stable', 'Driver data quality verified'],
      successCriteria: ['Recommendations generated', 'Override tracking functional'],
      rollbackTriggers: ['Inaccurate recommendations', 'High override rate']
    },
    {
      name: 'Phase 4: Analytics & Escalation',
      description: 'Enable analytics collection and escalation monitoring',
      enabled: false,
      targetPercentage: 10,
      features: ['DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS', 'DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION'],
      prerequisites: ['Phase 3 stable', 'Monitoring infrastructure ready'],
      successCriteria: ['Analytics data collected', 'Escalation alerts functional'],
      rollbackTriggers: ['Data privacy issues', 'Alert fatigue']
    }
  ],

  features: {
    assignmentMode: {
      enabled: isDriverAssignmentOverhaulEnabled(),
      defaultMode: 'assign_now',
      allowOverride: true
    },
    capacityPlanner: {
      enabled: false,
      defaultView: '24h',
      showInsights: false
    },
    assistiveEngine: {
      enabled: false,
      confidenceThreshold: 70,
      maxRecommendations: 5
    },
    analytics: {
      enabled: false,
      collectionInterval: 300, // 5 minutes
      retentionDays: 90
    },
    escalation: {
      enabled: false,
      deadlineHours: 6,
      notificationChannels: ['telegram', 'email']
    }
  },

  monitoring: {
    enabled: true,
    metrics: [
      'assignment_mode_usage',
      'unassigned_segments_count',
      'override_rate',
      'escalation_count',
      'user_satisfaction'
    ],
    alertThresholds: {
      error_rate: 5, // 5%
      response_time: 2000, // 2 seconds
      unassigned_segments: 50,
      override_rate: 30 // 30%
    },
    reportingInterval: 3600 // 1 hour
  },

  rollback: {
    enabled: true,
    automatic: false,
    triggers: [
      'Critical system errors',
      'Data corruption',
      'Performance degradation > 50%',
      'User satisfaction < 3.0'
    ],
    procedures: [
      'Disable feature flags',
      'Revert to legacy workflow',
      'Notify stakeholders',
      'Investigate root cause'
    ]
  }
};

// =============================================================================
// ROLLOUT UTILITIES
// =============================================================================

/**
 * Check if a rollout phase is active
 */
export function isPhaseActive(phaseName: string): boolean {
  const phase = rolloutConfig.phases.find(p => p.name === phaseName);
  return phase?.enabled ?? false;
}

/**
 * Get current active phases
 */
export function getActivePhases(): RolloutPhase[] {
  return rolloutConfig.phases.filter(phase => phase.enabled);
}

/**
 * Check if a feature is enabled in current rollout
 */
export function isFeatureEnabledInRollout(featureName: string): boolean {
  const activePhases = getActivePhases();
  return activePhases.some(phase => phase.features.includes(featureName));
}

/**
 * Get rollout status summary
 */
export function getRolloutStatus(): {
  environment: string;
  activePhases: number;
  totalPhases: number;
  enabledFeatures: string[];
  nextPhase?: RolloutPhase;
} {
  const activePhases = getActivePhases();
  const enabledFeatures = activePhases.flatMap(phase => phase.features);
  const nextPhase = rolloutConfig.phases.find(phase => !phase.enabled);

  return {
    environment: rolloutConfig.environment,
    activePhases: activePhases.length,
    totalPhases: rolloutConfig.phases.length,
    enabledFeatures,
    nextPhase
  };
}

/**
 * Validate rollout configuration
 */
export function validateRolloutConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check phase dependencies
  for (let i = 1; i < rolloutConfig.phases.length; i++) {
    const currentPhase = rolloutConfig.phases[i];
    const previousPhase = rolloutConfig.phases[i - 1];

    if (currentPhase.enabled && !previousPhase.enabled) {
      errors.push(`Phase "${currentPhase.name}" cannot be enabled before "${previousPhase.name}"`);
    }
  }

  // Check feature dependencies
  const enabledFeatures = getActivePhases().flatMap(phase => phase.features);
  if (enabledFeatures.includes('DRIVER_ASSIGNMENT_OVERHAUL_UI') && !enabledFeatures.includes('DRIVER_ASSIGNMENT_OVERHAUL')) {
    errors.push('DRIVER_ASSIGNMENT_OVERHAUL_UI requires DRIVER_ASSIGNMENT_OVERHAUL to be enabled');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get deployment checklist for current environment
 */
export function getDeploymentChecklist(): {
  preDeployment: string[];
  deployment: string[];
  postDeployment: string[];
  rollback: string[];
} {
  const isProduction = rolloutConfig.environment === 'production';

  return {
    preDeployment: [
      'Run database migrations',
      'Update feature flags configuration',
      'Verify environment variables',
      'Run full test suite',
      'Review code changes',
      'Backup current system state',
      ...(isProduction ? [
        'Schedule maintenance window',
        'Notify stakeholders',
        'Prepare rollback plan'
      ] : [])
    ],

    deployment: [
      'Deploy application code',
      'Update feature flags',
      'Verify deployment health',
      'Run smoke tests',
      'Monitor system metrics',
      ...(isProduction ? [
        'Enable gradual rollout',
        'Monitor user feedback',
        'Check error rates'
      ] : [])
    ],

    postDeployment: [
      'Verify feature functionality',
      'Check system performance',
      'Monitor error logs',
      'Collect user feedback',
      'Update documentation',
      'Schedule follow-up review',
      ...(isProduction ? [
        'Monitor business metrics',
        'Prepare success report',
        'Plan next phase rollout'
      ] : [])
    ],

    rollback: [
      'Disable feature flags',
      'Revert to previous version',
      'Restore database backup if needed',
      'Verify system stability',
      'Notify stakeholders',
      'Document rollback reason',
      'Investigate root cause',
      'Plan remediation'
    ]
  };
}

/**
 * Check if system is ready for rollout
 */
export function isSystemReadyForRollout(): { ready: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check feature flag configuration
  if (!isDriverAssignmentOverhaulEnabled()) {
    issues.push('DRIVER_ASSIGNMENT_OVERHAUL feature flag is disabled');
  }

  // Check environment configuration
  if (!process.env.DATABASE_URL) {
    issues.push('DATABASE_URL environment variable not set');
  }

  if (!process.env.SUPABASE_URL) {
    issues.push('SUPABASE_URL environment variable not set');
  }

  // Check rollout configuration
  const validation = validateRolloutConfig();
  if (!validation.valid) {
    issues.push(...validation.errors);
  }

  return {
    ready: issues.length === 0,
    issues
  };
}

/**
 * Get rollout progress percentage
 */
export function getRolloutProgress(): number {
  const activePhases = getActivePhases();
  return (activePhases.length / rolloutConfig.phases.length) * 100;
}

/**
 * Get next rollout steps
 */
export function getNextRolloutSteps(): string[] {
  const status = getRolloutStatus();
  const steps: string[] = [];

  if (status.nextPhase) {
    steps.push(`Enable Phase: ${status.nextPhase.name}`);
    steps.push(`Prerequisites: ${status.nextPhase.prerequisites.join(', ')}`);
    steps.push(`Target: ${status.nextPhase.targetPercentage}% rollout`);
  } else {
    steps.push('All phases completed - consider full rollout');
  }

  return steps;
}

// Export configuration for external use
export { rolloutConfig as DRIVER_ASSIGNMENT_OVERHAUL_ROLLOUT_CONFIG };
