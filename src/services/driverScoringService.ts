/**
 * Driver Scoring Service
 *
 * Implements comprehensive scoring algorithm for driver recommendations
 * combining travel feasibility, availability, specialization, and preferences.
 *
 * Based on PRD requirements for assistive assignment engine.
 */

import { isDriverAssignmentOverhaulAssistiveEngineEnabled } from '@/lib/featureFlags';
import type { Staff } from '@/types/staff';
import type { TransportationSegment, TransportationSegmentLocation } from '@/types/transportationSegment';
import { calculateDistance } from '@/utils/coordinateHelpers';
import { getDistanceMatrix } from '@/utils/google/distanceMatrix';

// Scoring weights (must sum to 1.0)
export const SCORING_WEIGHTS = {
  TRAVEL_FEASIBILITY: 0.35,  // Distance, time, route efficiency
  AVAILABILITY: 0.30,        // Schedule conflicts, buffer time
  SPECIALIZATION: 0.20,      // Staff type, specialization match
  PREFERENCES: 0.15,         // Historical performance, preferences
} as const;

// Scoring factor ranges (0-100 scale)
export const SCORE_RANGES = {
  TRAVEL_FEASIBILITY: {
    EXCELLENT: 90,  // < 5km, < 15min
    GOOD: 75,       // 5-15km, 15-30min
    FAIR: 60,       // 15-30km, 30-45min
    POOR: 40,       // 30-50km, 45-60min
    VERY_POOR: 20,  // > 50km, > 60min
  },
  AVAILABILITY: {
    EXCELLENT: 95,  // No conflicts, > 60min buffer
    GOOD: 80,       // No conflicts, 30-60min buffer
    FAIR: 60,       // No conflicts, 15-30min buffer
    POOR: 30,       // Tight schedule, < 15min buffer
    VERY_POOR: 0,   // Direct conflicts
  },
  SPECIALIZATION: {
    EXCELLENT: 100, // Perfect match
    GOOD: 80,       // Good match
    FAIR: 60,       // Partial match
    POOR: 30,       // Poor match
    VERY_POOR: 0,   // No match
  },
  PREFERENCES: {
    EXCELLENT: 90,  // High performance, preferred
    GOOD: 70,       // Good performance
    FAIR: 50,       // Average performance
    POOR: 30,       // Below average
    VERY_POOR: 10,  // Poor performance
  },
} as const;

export interface DriverScoringContext {
  segment: TransportationSegment;
  allSegments: TransportationSegment[];
  drivers: Staff[];
  patientLocation?: TransportationSegmentLocation;
  officeLocation?: TransportationSegmentLocation;
}

export interface DriverScore {
  driverId: string;
  overallScore: number; // 0-100
  factors: {
    travelFeasibility: {
      score: number;
      distanceKm?: number;
      estimatedMinutes?: number;
      reasons: string[];
    };
    availability: {
      score: number;
      conflicts: number;
      bufferMinutes?: number;
      reasons: string[];
    };
    specialization: {
      score: number;
      matchType: 'perfect' | 'good' | 'partial' | 'poor' | 'none';
      reasons: string[];
    };
    preferences: {
      score: number;
      performanceRating: number;
      reasons: string[];
    };
  };
  tags: string[];
  rank: number;
}

export interface DriverRecommendation {
  driver: Staff;
  score: DriverScore;
  recommendation: {
    confidence: 'high' | 'medium' | 'low';
    primaryReason: string;
    alternativeModes?: string[];
  };
}

export class DriverScoringService {
  private static instance: DriverScoringService;

  public static getInstance(): DriverScoringService {
    if (!DriverScoringService.instance) {
      DriverScoringService.instance = new DriverScoringService();
    }
    return DriverScoringService.instance;
  }

  /**
   * Generate comprehensive driver recommendations with scoring
   */
  async generateDriverRecommendations(
    context: DriverScoringContext
  ): Promise<DriverRecommendation[]> {
    // Check if assistive engine is enabled
    if (!isDriverAssignmentOverhaulAssistiveEngineEnabled()) {
      throw new Error('Driver scoring service is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE is not enabled.');
    }

    const { segment, allSegments, drivers } = context;

    if (!segment.planned_start || !segment.planned_end) {
      throw new Error('Segment must have planned start and end times for scoring');
    }

    // Filter to active drivers only
    const activeDrivers = drivers.filter(driver =>
      driver.status === 'active' &&
      driver.staff_type === 'driver' &&
      driver.id !== segment.driver_id // Exclude already assigned driver
    );

    if (activeDrivers.length === 0) {
      return [];
    }

    // Score each driver
    const scoredDrivers = await Promise.all(
      activeDrivers.map(async (driver) => {
        const score = await this.scoreDriver(driver, context);
        return {
          driver,
          score,
        };
      })
    );

    // Sort by overall score (descending)
    scoredDrivers.sort((a, b) => b.score.overallScore - a.score.overallScore);

    // Assign ranks and generate recommendations
    return scoredDrivers.map((item, index) => {
      item.score.rank = index + 1;

      return {
        driver: item.driver,
        score: item.score,
        recommendation: this.generateRecommendation(item.score, item.driver),
      };
    });
  }

  /**
   * Score a single driver across all factors
   */
  private async scoreDriver(
    driver: Staff,
    context: DriverScoringContext
  ): Promise<DriverScore> {
    const { segment, allSegments } = context;

    // Calculate individual factor scores
    const travelFeasibility = await this.scoreTravelFeasibility(driver, context);
    const availability = this.scoreAvailability(driver, segment, allSegments);
    const specialization = this.scoreSpecialization(driver, segment);
    const preferences = this.scorePreferences(driver, segment);

    // Calculate weighted overall score
    const overallScore = Math.round(
      travelFeasibility.score * SCORING_WEIGHTS.TRAVEL_FEASIBILITY +
      availability.score * SCORING_WEIGHTS.AVAILABILITY +
      specialization.score * SCORING_WEIGHTS.SPECIALIZATION +
      preferences.score * SCORING_WEIGHTS.PREFERENCES
    );

    // Generate tags based on scores
    const tags = this.generateTags(travelFeasibility, availability, specialization, preferences);

    return {
      driverId: driver.id,
      overallScore,
      factors: {
        travelFeasibility,
        availability,
        specialization,
        preferences,
      },
      tags,
      rank: 0, // Will be set by caller
    };
  }

  /**
   * Score travel feasibility based on distance and estimated travel time
   */
  private async scoreTravelFeasibility(
    driver: Staff,
    context: DriverScoringContext
  ): Promise<DriverScore['factors']['travelFeasibility']> {
    const { segment, patientLocation, officeLocation } = context;
    const reasons: string[] = [];

    // Determine pickup location
    let pickupLocation: TransportationSegmentLocation | undefined;

    if (segment.pickup_location) {
      pickupLocation = segment.pickup_location;
    } else if (segment.pickup_location_type === 'office' && officeLocation) {
      pickupLocation = officeLocation;
    }

    if (!pickupLocation || !patientLocation) {
      return {
        score: 0,
        reasons: ['Missing location data for travel calculation'],
      };
    }

    try {
      // Try to get accurate travel time from Google Distance Matrix
      const distanceResult = await getDistanceMatrix(
        { lat: pickupLocation.lat, lng: pickupLocation.lng },
        { lat: patientLocation.lat, lng: patientLocation.lng },
        {
          mode: 'driving',
          departureTime: new Date(segment.planned_start),
        }
      );

      let distanceKm: number;
      let estimatedMinutes: number;

      if (distanceResult.status === 'success') {
        distanceKm = distanceResult.distanceKilometers;
        estimatedMinutes = distanceResult.durationMinutes;
        reasons.push(`Google Maps: ${distanceKm.toFixed(1)}km, ${estimatedMinutes}min`);
      } else {
        // Fallback to straight-line distance calculation
        distanceKm = calculateDistance(
          { latitude: pickupLocation.lat, longitude: pickupLocation.lng },
          { latitude: patientLocation.lat, longitude: patientLocation.lng }
        );
        // Estimate travel time as 1.5x straight-line distance (accounting for roads)
        estimatedMinutes = Math.round(distanceKm * 1.5);
        reasons.push(`Estimated: ${distanceKm.toFixed(1)}km, ~${estimatedMinutes}min`);
      }

      // Score based on distance and time
      let score: number;

      if (distanceKm < 5 && estimatedMinutes < 15) {
        score = SCORE_RANGES.TRAVEL_FEASIBILITY.EXCELLENT;
        reasons.push('Excellent: Very close and quick');
      } else if (distanceKm < 15 && estimatedMinutes < 30) {
        score = SCORE_RANGES.TRAVEL_FEASIBILITY.GOOD;
        reasons.push('Good: Reasonable distance and time');
      } else if (distanceKm < 30 && estimatedMinutes < 45) {
        score = SCORE_RANGES.TRAVEL_FEASIBILITY.FAIR;
        reasons.push('Fair: Moderate distance and time');
      } else if (distanceKm <= 50 && estimatedMinutes <= 60) {
        score = SCORE_RANGES.TRAVEL_FEASIBILITY.POOR;
        reasons.push('Poor: Long distance and time');
      } else {
        score = SCORE_RANGES.TRAVEL_FEASIBILITY.VERY_POOR;
        reasons.push('Very poor: Very long distance and time');
      }

      return {
        score,
        distanceKm,
        estimatedMinutes,
        reasons,
      };
    } catch (error) {
      console.error('Error calculating travel feasibility:', error);
      return {
        score: 0,
        reasons: ['Error calculating travel feasibility'],
      };
    }
  }

  /**
   * Score availability based on schedule conflicts and buffer time
   */
  private scoreAvailability(
    driver: Staff,
    segment: TransportationSegment,
    allSegments: TransportationSegment[]
  ): DriverScore['factors']['availability'] {
    const reasons: string[] = [];

    // Get driver's other segments
    const otherSegments = allSegments.filter(s =>
      s.driver_id === driver.id &&
      s.id !== segment.id &&
      s.status !== 'cancelled'
    );

    const segmentStart = new Date(segment.planned_start!);
    const segmentEnd = new Date(segment.planned_end!);

    let conflicts = 0;
    let minBufferMinutes = Infinity;

    // Check for conflicts and calculate buffer time
    for (const otherSegment of otherSegments) {
      if (!otherSegment.planned_start || !otherSegment.planned_end) {
        continue;
      }

      const otherStart = new Date(otherSegment.planned_start);
      const otherEnd = new Date(otherSegment.planned_end);

      // Check for time overlap
      const overlaps =
        (segmentStart >= otherStart && segmentStart < otherEnd) ||
        (segmentEnd > otherStart && segmentEnd <= otherEnd) ||
        (segmentStart <= otherStart && segmentEnd >= otherEnd);

      if (overlaps) {
        conflicts++;
        reasons.push(`Conflicts with ${otherSegment.segment_type} segment`);
      } else {
        // Calculate buffer time
        const gapBefore = Math.abs(segmentStart.getTime() - otherEnd.getTime()) / (1000 * 60);
        const gapAfter = Math.abs(otherStart.getTime() - segmentEnd.getTime()) / (1000 * 60);
        const minGap = Math.min(gapBefore, gapAfter);

        if (minGap < minBufferMinutes) {
          minBufferMinutes = minGap;
        }
      }
    }

    // Score based on conflicts and buffer time
    let score: number;

    if (conflicts > 0) {
      score = SCORE_RANGES.AVAILABILITY.VERY_POOR;
      reasons.push(`${conflicts} scheduling conflict${conflicts > 1 ? 's' : ''}`);
    } else if (minBufferMinutes >= 60) {
      score = SCORE_RANGES.AVAILABILITY.EXCELLENT;
      reasons.push(`Excellent: ${Math.round(minBufferMinutes)}min buffer`);
    } else if (minBufferMinutes >= 30) {
      score = SCORE_RANGES.AVAILABILITY.GOOD;
      reasons.push(`Good: ${Math.round(minBufferMinutes)}min buffer`);
    } else if (minBufferMinutes >= 15) {
      score = SCORE_RANGES.AVAILABILITY.FAIR;
      reasons.push(`Fair: ${Math.round(minBufferMinutes)}min buffer`);
    } else {
      score = SCORE_RANGES.AVAILABILITY.POOR;
      reasons.push(`Tight: ${Math.round(minBufferMinutes)}min buffer`);
    }

    return {
      score,
      conflicts,
      bufferMinutes: Number.isFinite(minBufferMinutes) ? minBufferMinutes : undefined,
      reasons,
    };
  }

  /**
   * Score specialization based on staff type and specialization match
   */
  private scoreSpecialization(
    driver: Staff,
    segment: TransportationSegment
  ): DriverScore['factors']['specialization'] {
    const reasons: string[] = [];

    // Basic driver type check
    if (driver.staff_type !== 'driver') {
      return {
        score: 0,
        matchType: 'none',
        reasons: ['Not a driver'],
      };
    }

    // Check for specialization matches
    let matchType: DriverScore['factors']['specialization']['matchType'] = 'good';
    let score = SCORE_RANGES.SPECIALIZATION.GOOD;

    // Default good score for drivers
    reasons.push('Qualified driver');

    // Check for specific specializations that might be relevant
    if (driver.specialization) {
      const specialization = driver.specialization.toLowerCase();

      // Check for relevant specializations
      if (specialization.includes('medical') && specialization.includes('transport')) {
        matchType = 'perfect';
        score = SCORE_RANGES.SPECIALIZATION.EXCELLENT;
        reasons.push('Medical transport specialist');
      } else if (specialization.includes('transport') || specialization.includes('logistics')) {
        matchType = 'perfect';
        score = SCORE_RANGES.SPECIALIZATION.EXCELLENT;
        reasons.push('Transportation specialist');
      } else if (specialization.includes('elderly') || specialization.includes('senior')) {
        matchType = 'perfect';
        score = SCORE_RANGES.SPECIALIZATION.EXCELLENT;
        reasons.push('Elderly care specialist');
      } else if (specialization.includes('disability') || specialization.includes('accessibility')) {
        matchType = 'perfect';
        score = SCORE_RANGES.SPECIALIZATION.EXCELLENT;
        reasons.push('Accessibility specialist');
      } else {
        reasons.push(`Specialized in: ${driver.specialization}`);
      }
    }

    // Check segment type requirements
    if (segment.segment_type === 'metro_assist') {
      // Metro assistance might require specific skills
      if (driver.specialization?.toLowerCase().includes('metro') ||
          driver.specialization?.toLowerCase().includes('public')) {
        matchType = 'perfect';
        score = SCORE_RANGES.SPECIALIZATION.EXCELLENT;
        reasons.push('Metro assistance specialist');
      }
    }

    return {
      score,
      matchType,
      reasons,
    };
  }

  /**
   * Score preferences based on historical performance and preferences
   */
  private scorePreferences(
    driver: Staff,
    segment: TransportationSegment
  ): DriverScore['factors']['preferences'] {
    const reasons: string[] = [];

    // For now, use a default performance rating
    // In a real implementation, this would pull from historical data
    const performanceRating = 75; // Default to good performance

    let score: number;

    if (performanceRating >= 90) {
      score = SCORE_RANGES.PREFERENCES.EXCELLENT;
      reasons.push('Excellent historical performance');
    } else if (performanceRating >= 75) {
      score = SCORE_RANGES.PREFERENCES.GOOD;
      reasons.push('Good historical performance');
    } else if (performanceRating >= 60) {
      score = SCORE_RANGES.PREFERENCES.FAIR;
      reasons.push('Average historical performance');
    } else if (performanceRating >= 40) {
      score = SCORE_RANGES.PREFERENCES.POOR;
      reasons.push('Below average performance');
    } else {
      score = SCORE_RANGES.PREFERENCES.VERY_POOR;
      reasons.push('Poor historical performance');
    }

    // Check for working hours alignment
    const segmentStart = new Date(segment.planned_start!);
    const segmentHour = segmentStart.getHours();

    if (driver.working_hours_start && driver.working_hours_end) {
      const [startHour] = driver.working_hours_start.split(':').map(Number);
      const [endHour] = driver.working_hours_end.split(':').map(Number);

      if (segmentHour >= startHour && segmentHour < endHour) {
        reasons.push('Within working hours');
      } else {
        score = Math.max(score - 10, 0); // Penalize for outside working hours
        reasons.push('Outside working hours');
      }
    } else {
      // No working hours defined, assume always available
      reasons.push('No working hours defined');
    }

    // Check for day availability
    const segmentDay = segmentStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const adjustedDay = segmentDay === 0 ? 7 : segmentDay; // Convert Sunday to 7

    if (driver.available_days && driver.available_days.includes(adjustedDay)) {
      reasons.push('Available on this day');
    } else {
      score = Math.max(score - 15, 0); // Penalize for unavailable day
      reasons.push('Not available on this day');
    }

    return {
      score,
      performanceRating,
      reasons,
    };
  }

  /**
   * Generate descriptive tags based on scoring factors
   */
  private generateTags(
    travelFeasibility: DriverScore['factors']['travelFeasibility'],
    availability: DriverScore['factors']['availability'],
    specialization: DriverScore['factors']['specialization'],
    preferences: DriverScore['factors']['preferences']
  ): string[] {
    const tags: string[] = [];

    // Travel feasibility tags
    if (travelFeasibility.score >= 90) {
      tags.push('closest next leg');
    } else if (travelFeasibility.score >= 75) {
      tags.push('nearby');
    } else if (travelFeasibility.score <= 40) {
      tags.push('far distance');
    }

    // Availability tags
    if (availability.conflicts > 0) {
      tags.push('has conflicts');
    } else if (availability.bufferMinutes && availability.bufferMinutes < 30) {
      tags.push('tight schedule');
    } else if (availability.bufferMinutes && availability.bufferMinutes >= 60) {
      tags.push('good buffer');
    }

    // Specialization tags
    if (specialization.matchType === 'perfect') {
      tags.push('specialist');
    }

    // Preference tags
    if (preferences.score >= 90) {
      tags.push('top performer');
    } else if (preferences.score <= 30) {
      tags.push('needs improvement');
    }

    return tags;
  }

  /**
   * Generate recommendation summary with enhanced reasoning
   */
  private generateRecommendation(
    score: DriverScore,
    driver: Staff
  ): DriverRecommendation['recommendation'] {
    const { overallScore, factors } = score;

    let confidence: 'high' | 'medium' | 'low';
    let primaryReason: string;

    // Enhanced confidence calculation with more nuanced reasoning
    if (overallScore >= 85) {
      confidence = 'high';
      primaryReason = this.generateHighConfidenceReason(factors, driver);
    } else if (overallScore >= 70) {
      confidence = 'medium';
      primaryReason = this.generateMediumConfidenceReason(factors, driver);
    } else if (overallScore >= 50) {
      confidence = 'low';
      primaryReason = this.generateLowConfidenceReason(factors, driver);
    } else {
      confidence = 'low';
      primaryReason = 'Not recommended - significant conflicts or constraints';
    }

    // Enhanced alternative mode suggestions with specific reasoning
    const alternativeModes: string[] = [];

    if (factors.travelFeasibility.score <= 40) {
      if (factors.travelFeasibility.score <= 20) {
        alternativeModes.push('Long travel distance - consider metro assistance or closer driver');
      } else {
        alternativeModes.push('Moderate travel distance - metro may be more efficient');
      }
    }

    if (factors.availability.conflicts > 0) {
      if (factors.availability.conflicts >= 2) {
        alternativeModes.push('Multiple schedule conflicts - consider different driver');
      } else {
        alternativeModes.push('Tight schedule - ensure adequate buffer time');
      }
    }

    if (factors.specialization.score <= 40) {
      alternativeModes.push('Specialization mismatch - verify driver skills match requirements');
    }

    if (factors.preferences.score <= 40) {
      alternativeModes.push('Driver may be overloaded - consider workload distribution');
    }

    return {
      confidence,
      primaryReason,
      alternativeModes: alternativeModes.length > 0 ? alternativeModes : undefined,
    };
  }

  /**
   * Generate high confidence reasoning
   */
  private generateHighConfidenceReason(factors: DriverScore['factors'], driver: Staff): string {
    const reasons: string[] = [];

    if (factors.travelFeasibility.score >= 80) {
      reasons.push('optimal location');
    }
    if (factors.availability.score >= 80) {
      reasons.push('excellent availability');
    }
    if (factors.specialization.score >= 80) {
      reasons.push('perfect specialization match');
    }
    if (factors.preferences.score >= 80) {
      reasons.push('ideal workload balance');
    }

    return `Excellent match - ${reasons.join(', ')}`;
  }

  /**
   * Generate medium confidence reasoning
   */
  private generateMediumConfidenceReason(factors: DriverScore['factors'], driver: Staff): string {
    const strengths: string[] = [];
    const concerns: string[] = [];

    if (factors.travelFeasibility.score >= 70) {
      strengths.push('good location');
    } else if (factors.travelFeasibility.score < 50) {
      concerns.push('travel distance');
    }

    if (factors.availability.score >= 70) {
      strengths.push('good availability');
    } else if (factors.availability.score < 50) {
      concerns.push('schedule constraints');
    }

    if (factors.specialization.score >= 70) {
      strengths.push('suitable specialization');
    } else if (factors.specialization.score < 50) {
      concerns.push('specialization mismatch');
    }

    let reason = 'Good match';
    if (strengths.length > 0) {
      reason += ` with ${strengths.join(', ')}`;
    }
    if (concerns.length > 0) {
      reason += ` but consider ${concerns.join(', ')}`;
    }

    return reason;
  }

  /**
   * Generate low confidence reasoning
   */
  private generateLowConfidenceReason(factors: DriverScore['factors'], driver: Staff): string {
    const issues: string[] = [];

    if (factors.travelFeasibility.score < 50) {
      issues.push('long travel distance');
    }
    if (factors.availability.score < 50) {
      issues.push('schedule conflicts');
    }
    if (factors.specialization.score < 50) {
      issues.push('specialization mismatch');
    }
    if (factors.preferences.score < 50) {
      issues.push('workload concerns');
    }

    return `Acceptable but not optimal due to ${issues.join(', ')}`;
  }
}

// Export singleton instance
export const driverScoringService = DriverScoringService.getInstance();
