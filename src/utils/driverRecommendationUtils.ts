/**
 * Driver Recommendation Utilities
 *
 * Helper functions for computing ranked driver recommendations, filtering,
 * and processing recommendation data.
 *
 * Based on PRD requirements for assistive assignment engine.
 */

import type { DriverRecommendation } from '@/services/driverScoringService';

export interface RecommendationFilter {
  minScore?: number;
  maxDistance?: number; // in kilometers
  excludeConflicts?: boolean;
  requireSpecialization?: boolean;
  workingHoursOnly?: boolean;
  availableDaysOnly?: boolean;
}

export interface RecommendationSort {
  field: 'score' | 'distance' | 'availability' | 'specialization';
  direction: 'asc' | 'desc';
}

export interface RecommendationGroup {
  by: 'score_range' | 'specialization' | 'availability' | 'distance_range';
  ranges?: {
    excellent: number[];
    good: number[];
    fair: number[];
    poor: number[];
  };
}

/**
 * Filter driver recommendations based on criteria
 */
export function filterRecommendations(
  recommendations: DriverRecommendation[],
  filter: RecommendationFilter
): DriverRecommendation[] {
  return recommendations.filter(rec => {
    const { score } = rec;

    // Minimum score filter
    if (filter.minScore !== undefined && score.overallScore < filter.minScore) {
      return false;
    }

    // Maximum distance filter
    if (filter.maxDistance !== undefined) {
      const distance = score.factors.travelFeasibility.distanceKm;
      if (distance !== undefined && distance > filter.maxDistance) {
        return false;
      }
    }

    // Exclude conflicts filter
    if (filter.excludeConflicts && score.factors.availability.conflicts > 0) {
      return false;
    }

    // Require specialization filter
    if (filter.requireSpecialization &&
        (score.factors.specialization.matchType === 'none' ||
         score.factors.specialization.matchType === 'poor' ||
         score.factors.specialization.matchType === 'partial')) {
      return false;
    }

    // Working hours filter
    if (filter.workingHoursOnly) {
      const segmentStart = new Date(rec.driver.working_hours_start || '00:00');
      const segmentEnd = new Date(rec.driver.working_hours_end || '23:59');
      const now = new Date();
      if (now < segmentStart || now > segmentEnd) {
        return false;
      }
    }

    // Available days filter
    if (filter.availableDaysOnly && rec.driver.available_days) {
      const today = new Date().getDay();
      const adjustedDay = today === 0 ? 7 : today; // Convert Sunday to 7
      if (!rec.driver.available_days.includes(adjustedDay)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort driver recommendations by specified criteria
 */
export function sortRecommendations(
  recommendations: DriverRecommendation[],
  sort: RecommendationSort
): DriverRecommendation[] {
  return [...recommendations].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (sort.field) {
      case 'score':
        aValue = a.score.overallScore;
        bValue = b.score.overallScore;
        break;
      case 'distance':
        aValue = a.score.factors.travelFeasibility.distanceKm || Infinity;
        bValue = b.score.factors.travelFeasibility.distanceKm || Infinity;
        break;
      case 'availability':
        aValue = a.score.factors.availability.score;
        bValue = b.score.factors.availability.score;
        break;
      case 'specialization':
        aValue = a.score.factors.specialization.score;
        bValue = b.score.factors.specialization.score;
        break;
      default:
        return 0;
    }

    if (sort.direction === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
}

/**
 * Group driver recommendations by specified criteria
 */
export function groupRecommendations(
  recommendations: DriverRecommendation[],
  group: RecommendationGroup
): Record<string, DriverRecommendation[]> {
  const groups: Record<string, DriverRecommendation[]> = {};

  recommendations.forEach(rec => {
    let groupKey: string;

    switch (group.by) {
      case 'score_range':
        groupKey = getScoreRange(rec.score.overallScore);
        break;
      case 'specialization':
        groupKey = rec.score.factors.specialization.matchType;
        break;
      case 'availability':
        groupKey = getAvailabilityRange(rec.score.factors.availability.score);
        break;
      case 'distance_range':
        const distance = rec.score.factors.travelFeasibility.distanceKm || 0;
        groupKey = getDistanceRange(distance);
        break;
      default:
        groupKey = 'unknown';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(rec);
  });

  return groups;
}

/**
 * Get top N recommendations with optional filtering and sorting
 */
export function getTopRecommendations(
  recommendations: DriverRecommendation[],
  limit: number = 5,
  filter?: RecommendationFilter,
  sort?: RecommendationSort
): DriverRecommendation[] {
  let filtered = recommendations;

  // Apply filters
  if (filter) {
    filtered = filterRecommendations(recommendations, filter);
  }

  // Apply sorting
  if (sort) {
    filtered = sortRecommendations(filtered, sort);
  }

  // Return top N
  return filtered.slice(0, limit);
}

/**
 * Calculate recommendation statistics
 */
export function calculateRecommendationStats(
  recommendations: DriverRecommendation[]
): {
  total: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  specializationDistribution: Record<string, number>;
  availabilityDistribution: Record<string, number>;
  distanceStats: {
    min: number;
    max: number;
    average: number;
  };
} {
  if (recommendations.length === 0) {
    return {
      total: 0,
      averageScore: 0,
      scoreDistribution: {},
      specializationDistribution: {},
      availabilityDistribution: {},
      distanceStats: { min: 0, max: 0, average: 0 },
    };
  }

  const scores = recommendations.map(r => r.score.overallScore);
  const distances = recommendations
    .map(r => r.score.factors.travelFeasibility.distanceKm)
    .filter(d => d !== undefined) as number[];

  const scoreDistribution: Record<string, number> = {};
  const specializationDistribution: Record<string, number> = {};
  const availabilityDistribution: Record<string, number> = {};

  recommendations.forEach(rec => {
    // Score distribution
    const scoreRange = getScoreRange(rec.score.overallScore);
    scoreDistribution[scoreRange] = (scoreDistribution[scoreRange] || 0) + 1;

    // Specialization distribution
    const specType = rec.score.factors.specialization.matchType;
    specializationDistribution[specType] = (specializationDistribution[specType] || 0) + 1;

    // Availability distribution
    const availRange = getAvailabilityRange(rec.score.factors.availability.score);
    availabilityDistribution[availRange] = (availabilityDistribution[availRange] || 0) + 1;
  });

  return {
    total: recommendations.length,
    averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    scoreDistribution,
    specializationDistribution,
    availabilityDistribution,
    distanceStats: {
      min: distances.length > 0 ? Math.min(...distances) : 0,
      max: distances.length > 0 ? Math.max(...distances) : 0,
      average: distances.length > 0 ? distances.reduce((sum, d) => sum + d, 0) / distances.length : 0,
    },
  };
}

/**
 * Find alternative transport modes based on recommendation analysis
 */
export function suggestAlternativeModes(
  recommendations: DriverRecommendation[]
): {
  mode: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}[] {
  const alternatives: Array<{
    mode: string;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  }> = [];

  if (recommendations.length === 0) {
    return alternatives;
  }

  const stats = calculateRecommendationStats(recommendations);
  const topRecommendation = recommendations[0];

  // Suggest metro if all drivers are far away
  if (stats.distanceStats.average > 15) {
    alternatives.push({
      mode: 'metro',
      reason: `All drivers are far away (avg ${stats.distanceStats.average.toFixed(1)}km)`,
      confidence: 'high',
    });
  }

  // Suggest public transport if scores are low
  if (stats.averageScore < 50) {
    alternatives.push({
      mode: 'public_transport',
      reason: 'Low driver scores suggest public transport may be more efficient',
      confidence: 'medium',
    });
  }

  // Suggest taxi if there are conflicts
  const conflictedDrivers = recommendations.filter(r => r.score.factors.availability.conflicts > 0);
  if (conflictedDrivers.length > recommendations.length * 0.7) {
    alternatives.push({
      mode: 'taxi',
      reason: 'Most drivers have scheduling conflicts',
      confidence: 'high',
    });
  }

  // Suggest self-transport for short distances
  if (stats.distanceStats.average < 5) {
    alternatives.push({
      mode: 'self',
      reason: 'Short distance may be suitable for self-transport',
      confidence: 'medium',
    });
  }

  return alternatives;
}

/**
 * Generate recommendation summary text
 */
export function generateRecommendationSummary(
  recommendations: DriverRecommendation[]
): string {
  if (recommendations.length === 0) {
    return 'No driver recommendations available.';
  }

  const top = recommendations[0];
  const stats = calculateRecommendationStats(recommendations);

  const summary = [
    `Top recommendation: ${top.driver.first_name} ${top.driver.last_name} (${top.score.overallScore}/100)`,
    `${stats.total} drivers evaluated`,
    `Average score: ${stats.averageScore.toFixed(1)}/100`,
  ];

  if (top.score.factors.travelFeasibility.distanceKm) {
    summary.push(`Distance: ${top.score.factors.travelFeasibility.distanceKm.toFixed(1)}km`);
  }

  if (top.score.factors.availability.conflicts > 0) {
    summary.push(`⚠️ ${top.score.factors.availability.conflicts} scheduling conflicts`);
  }

  return summary.join(' • ');
}

// Helper functions

function getScoreRange(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 30) return 'poor';
  return 'very_poor';
}

function getAvailabilityRange(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 30) return 'poor';
  return 'very_poor';
}

function getDistanceRange(distance: number): string {
  if (distance < 5) return 'very_close';
  if (distance < 15) return 'close';
  if (distance < 30) return 'moderate';
  if (distance < 50) return 'far';
  return 'very_far';
}
