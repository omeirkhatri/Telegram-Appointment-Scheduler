/**
 * Driver Recommendation Service
 *
 * Provides utilities for computing ranked driver recommendations and persisting metadata.
 * Integrates with DriverScoringService to generate comprehensive recommendations.
 *
 * Based on PRD requirements for assistive assignment engine.
 */

import { isDriverAssignmentOverhaulAssistiveEngineEnabled } from '@/lib/featureFlags';
import type {
    TransportationRecommendationEntry,
    TransportationRecommendationMetadata,
    TransportationRecommendationOverride,
    TransportationSegment
} from '@/types/transportationSegment';
import { driverScoringService, type DriverRecommendation, type DriverScoringContext } from './driverScoringService';
import { staffService } from './staffService';
import { transportationSegmentService } from './transportationSegmentService';

export interface RecommendationRequest {
  segmentId: string;
  includeMetadata?: boolean;
  maxRecommendations?: number;
  forceRefresh?: boolean;
}

export interface RecommendationResult {
  segment: TransportationSegment;
  recommendations: DriverRecommendation[];
  metadata: TransportationRecommendationMetadata;
  cached: boolean;
  generatedAt: string;
}

export interface RecommendationCache {
  [segmentId: string]: {
    result: RecommendationResult;
    expiresAt: string;
  };
}

export class DriverRecommendationService {
  private static instance: DriverRecommendationService;
  private cache: RecommendationCache = {};
  private readonly CACHE_DURATION_MINUTES = 30; // Cache recommendations for 30 minutes

  public static getInstance(): DriverRecommendationService {
    if (!DriverRecommendationService.instance) {
      DriverRecommendationService.instance = new DriverRecommendationService();
    }
    return DriverRecommendationService.instance;
  }

  /**
   * Get driver recommendations for a segment with caching and metadata persistence
   */
  async getDriverRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    // Check if assistive engine is enabled
    if (!isDriverAssignmentOverhaulAssistiveEngineEnabled()) {
      throw new Error('Driver recommendation service is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE is not enabled.');
    }

    const { segmentId, includeMetadata = true, maxRecommendations = 10, forceRefresh = false } = request;

    // Check cache first (unless force refresh)
    if (!forceRefresh && this.isCacheValid(segmentId)) {
      const cached = this.cache[segmentId];
      if (cached) {
        return {
          ...cached.result,
          cached: true,
        };
      }
    }

    // Get segment and related data
    const segment = await transportationSegmentService.getTransportationSegment(segmentId);
    if (!segment) {
      throw new Error(`Transportation segment not found: ${segmentId}`);
    }

    // Get all segments for context
    const allSegments = await transportationSegmentService.getTransportationSegments({
      start_after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
      start_before: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next 7 days
    });

    // Get all active drivers
    const allStaff = await staffService.getActiveStaff();
    const drivers = allStaff.filter(staff => staff.staff_type === 'driver');

    // Create scoring context
    const context: DriverScoringContext = {
      segment,
      allSegments,
      drivers,
      patientLocation: segment.patient_location,
      officeLocation: await this.getOfficeLocation(),
    };

    // Generate recommendations using scoring service
    const recommendations = await driverScoringService.generateDriverRecommendations(context);

    // Limit recommendations
    const limitedRecommendations = recommendations.slice(0, maxRecommendations);

    // Generate metadata
    const metadata = includeMetadata ? this.generateRecommendationMetadata(
      limitedRecommendations,
      segment,
      context
    ) : {};

    // Create result
    const result: RecommendationResult = {
      segment,
      recommendations: limitedRecommendations,
      metadata,
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    // Cache the result
    this.cacheResult(segmentId, result);

    // Persist metadata to database if requested
    if (includeMetadata) {
      await this.persistRecommendationMetadata(segmentId, metadata);
    }

    return result;
  }

  /**
   * Update segment with recommended drivers and metadata
   */
  async updateSegmentRecommendations(
    segmentId: string,
    recommendations: DriverRecommendation[]
  ): Promise<void> {
    // Check if assistive engine is enabled
    if (!isDriverAssignmentOverhaulAssistiveEngineEnabled()) {
      throw new Error('Driver recommendation service is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE is not enabled.');
    }
    const recommendedDriverIds = recommendations.map(r => r.driver.id);
    const metadata = this.generateRecommendationMetadata(recommendations, null, null);

    await transportationSegmentService.updateTransportationSegment({
      id: segmentId,
      recommended_driver_ids: recommendedDriverIds,
      recommendation_metadata: metadata,
    });

    // Invalidate cache
    this.invalidateCache(segmentId);
  }

  /**
   * Record an override when dispatcher selects a non-recommended driver
   */
  async recordOverride(
    segmentId: string,
    selectedDriverId: string,
    recommendedDriverId: string | null,
    reason: string,
    note?: string
  ): Promise<void> {
    const segment = await transportationSegmentService.getTransportationSegment(segmentId);
    if (!segment) {
      throw new Error(`Transportation segment not found: ${segmentId}`);
    }

    const override: TransportationRecommendationOverride = {
      driver_id: selectedDriverId,
      recommended_driver_id: recommendedDriverId,
      reason,
      note,
      recorded_at: new Date().toISOString(),
    };

    // Update metadata with override
    const updatedMetadata: TransportationRecommendationMetadata = {
      ...segment.recommendation_metadata,
      override,
    };

    await transportationSegmentService.updateTransportationSegment({
      id: segmentId,
      recommendation_metadata: updatedMetadata,
    });

    // Invalidate cache
    this.invalidateCache(segmentId);
  }

  /**
   * Get recommendations for multiple segments in batch
   */
  async getBatchRecommendations(segmentIds: string[]): Promise<Map<string, RecommendationResult>> {
    const results = new Map<string, RecommendationResult>();

    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < segmentIds.length; i += batchSize) {
      const batch = segmentIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (segmentId) => {
        try {
          const result = await this.getDriverRecommendations({ segmentId });
          return { segmentId, result };
        } catch (error) {
          console.error(`Failed to get recommendations for segment ${segmentId}:`, error);
          return { segmentId, result: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ segmentId, result }) => {
        if (result) {
          results.set(segmentId, result);
        }
      });
    }

    return results;
  }

  /**
   * Clear all cached recommendations
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: Object.keys(this.cache).length,
      entries: Object.keys(this.cache),
    };
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(segmentId: string): boolean {
    const cached = this.cache[segmentId];
    if (!cached) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(cached.expiresAt);
    return now < expiresAt;
  }

  /**
   * Cache a recommendation result
   */
  private cacheResult(segmentId: string, result: RecommendationResult): void {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CACHE_DURATION_MINUTES);

    this.cache[segmentId] = {
      result,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Invalidate cache for a specific segment
   */
  private invalidateCache(segmentId: string): void {
    delete this.cache[segmentId];
  }

  /**
   * Generate recommendation metadata
   */
  private generateRecommendationMetadata(
    recommendations: DriverRecommendation[],
    segment: TransportationSegment | null,
    context: DriverScoringContext | null
  ): TransportationRecommendationMetadata {
    const entries: TransportationRecommendationEntry[] = recommendations.map(rec => ({
      driver_id: rec.driver.id,
      score: rec.score.overallScore,
      reasons: [
        rec.recommendation.primaryReason,
        ...rec.score.factors.travelFeasibility.reasons,
        ...rec.score.factors.availability.reasons,
        ...rec.score.factors.specialization.reasons,
        ...rec.score.factors.preferences.reasons,
      ],
      tags: rec.score.tags,
      rank: rec.score.rank,
      eta_minutes: rec.score.factors.travelFeasibility.estimatedMinutes,
      conflicts: rec.score.factors.availability.conflicts > 0 ?
        [`${rec.score.factors.availability.conflicts} scheduling conflicts`] : [],
    }));

    return {
      generated_at: new Date().toISOString(),
      scoring_model: 'driver_scoring_v1',
      factors: {
        total_drivers_evaluated: recommendations.length,
        scoring_weights: {
          travel_feasibility: 0.35,
          availability: 0.30,
          specialization: 0.20,
          preferences: 0.15,
        },
        segment_context: segment ? {
          segment_type: segment.segment_type,
          planned_start: segment.planned_start,
          planned_end: segment.planned_end,
          assignment_mode: segment.assignment_mode,
        } : null,
      },
      recommendations: entries,
      drivers: entries, // Alias for backward compatibility
      suggestions: entries, // Alias for backward compatibility
    };
  }

  /**
   * Persist recommendation metadata to database
   */
  private async persistRecommendationMetadata(
    segmentId: string,
    metadata: TransportationRecommendationMetadata
  ): Promise<void> {
    try {
      await transportationSegmentService.updateTransportationSegment({
        id: segmentId,
        recommendation_metadata: metadata,
      });
    } catch (error) {
      console.error('Failed to persist recommendation metadata:', error);
      // Don't throw - metadata persistence failure shouldn't break the flow
    }
  }

  /**
   * Get office location for scoring context
   */
  private async getOfficeLocation(): Promise<TransportationSegmentLocation | undefined> {
    // This would typically come from a configuration service
    // For now, return a default Dubai office location
    return {
      lat: 25.2048,
      lng: 55.2708,
      address: 'Dubai Healthcare City, Dubai, UAE',
      city: 'Dubai',
      area: 'Healthcare City',
    };
  }
}

// Export singleton instance
export const driverRecommendationService = DriverRecommendationService.getInstance();
