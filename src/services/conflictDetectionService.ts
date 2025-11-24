import type { Staff, TransportationSegment } from '@/types';

export interface ConflictInfo {
  segmentId: string;
  conflictType: 'overlap' | 'travel_gap' | 'overtime' | 'location_mismatch' | 'capacity_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  relatedSegmentId?: string;
  suggestedAction?: string;
  estimatedImpact?: string;
}

export interface DriverWorkloadInfo {
  driverId: string;
  totalSegments: number;
  totalHours: number;
  conflicts: ConflictInfo[];
  workloadScore: number; // 0-100, higher is more overloaded
  recommendations: string[];
}

export class ConflictDetectionService {
  private static readonly MIN_TRAVEL_TIME = 15; // minutes
  private static readonly MAX_DAILY_HOURS = 10; // hours
  private static readonly IDEAL_TRAVEL_BUFFER = 30; // minutes

  /**
   * Detect all conflicts for a driver's segments
   */
  static detectDriverConflicts(
    driver: Staff,
    segments: TransportationSegment[]
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const sortedSegments = [...segments].sort((a, b) => {
      const timeA = a.planned_start ? new Date(a.planned_start).getTime() : 0;
      const timeB = b.planned_start ? new Date(b.planned_start).getTime() : 0;
      return timeA - timeB;
    });

    // Check for overlaps and travel gaps
    for (let i = 0; i < sortedSegments.length - 1; i++) {
      const current = sortedSegments[i];
      const next = sortedSegments[i + 1];

      if (!current.planned_end || !next.planned_start) continue;

      const currentEnd = new Date(current.planned_end).getTime();
      const nextStart = new Date(next.planned_start).getTime();

      // Check for overlap
      if (currentEnd > nextStart) {
        const overlapMinutes = Math.round((currentEnd - nextStart) / (1000 * 60));
        conflicts.push({
          segmentId: current.id,
          conflictType: 'overlap',
          severity: 'critical',
          message: `Overlaps with next segment by ${overlapMinutes} minutes`,
          relatedSegmentId: next.id,
          suggestedAction: 'Reschedule one of the segments or assign to different driver',
          estimatedImpact: 'Driver will be double-booked'
        });
      }

      // Check for insufficient travel time
      const travelGap = nextStart - currentEnd;
      const travelGapMinutes = Math.round(travelGap / (1000 * 60));

      if (travelGapMinutes < this.MIN_TRAVEL_TIME && travelGapMinutes > 0) {
        conflicts.push({
          segmentId: current.id,
          conflictType: 'travel_gap',
          severity: travelGapMinutes < 5 ? 'high' : 'medium',
          message: `Insufficient travel time: ${travelGapMinutes} minutes`,
          relatedSegmentId: next.id,
          suggestedAction: 'Add buffer time or reassign to closer driver',
          estimatedImpact: 'Risk of delays and driver stress'
        });
      }

      // Check for ideal travel buffer
      if (travelGapMinutes < this.IDEAL_TRAVEL_BUFFER && travelGapMinutes >= this.MIN_TRAVEL_TIME) {
        conflicts.push({
          segmentId: current.id,
          conflictType: 'travel_gap',
          severity: 'low',
          message: `Tight schedule: ${travelGapMinutes} minutes between segments`,
          relatedSegmentId: next.id,
          suggestedAction: 'Consider adding more buffer time for reliability',
          estimatedImpact: 'Minor risk of delays'
        });
      }
    }

    // Check for overtime
    const totalHours = this.calculateTotalHours(sortedSegments);
    if (totalHours > this.MAX_DAILY_HOURS) {
      conflicts.push({
        segmentId: sortedSegments[0]?.id || '',
        conflictType: 'overtime',
        severity: 'high',
        message: `Driver scheduled for ${totalHours.toFixed(1)} hours (exceeds ${this.MAX_DAILY_HOURS}h limit)`,
        suggestedAction: 'Redistribute segments or add backup driver',
        estimatedImpact: 'Driver fatigue and safety concerns'
      });
    }

    return conflicts;
  }

  /**
   * Calculate driver workload score
   */
  static calculateWorkloadScore(
    driver: Staff,
    segments: TransportationSegment[]
  ): DriverWorkloadInfo {
    const conflicts = this.detectDriverConflicts(driver, segments);
    const totalHours = this.calculateTotalHours(segments);
    const totalSegments = segments.length;

    // Calculate workload score (0-100)
    let workloadScore = 0;

    // Base score from segment count
    workloadScore += Math.min(totalSegments * 10, 40);

    // Add score from total hours
    workloadScore += Math.min(totalHours * 5, 30);

    // Add penalty for conflicts
    const conflictPenalty = conflicts.reduce((penalty, conflict) => {
      switch (conflict.severity) {
        case 'critical': return penalty + 15;
        case 'high': return penalty + 10;
        case 'medium': return penalty + 5;
        case 'low': return penalty + 2;
        default: return penalty;
      }
    }, 0);

    workloadScore += Math.min(conflictPenalty, 30);

    // Generate recommendations
    const recommendations: string[] = [];

    if (workloadScore > 80) {
      recommendations.push('Consider redistributing some segments to other drivers');
    }
    if (totalHours > this.MAX_DAILY_HOURS) {
      recommendations.push('Reduce daily hours to prevent driver fatigue');
    }
    if (conflicts.some(c => c.severity === 'critical' || c.severity === 'high')) {
      recommendations.push('Resolve scheduling conflicts immediately');
    }
    if (workloadScore < 30 && totalSegments > 0) {
      recommendations.push('Driver has capacity for additional segments');
    }

    return {
      driverId: driver.id,
      totalSegments,
      totalHours,
      conflicts,
      workloadScore: Math.min(workloadScore, 100),
      recommendations
    };
  }

  /**
   * Calculate total hours for segments
   */
  private static calculateTotalHours(segments: TransportationSegment[]): number {
    return segments.reduce((total, segment) => {
      if (!segment.planned_start || !segment.planned_end) return total;

      const start = new Date(segment.planned_start).getTime();
      const end = new Date(segment.planned_end).getTime();
      const duration = (end - start) / (1000 * 60 * 60); // Convert to hours

      return total + duration;
    }, 0);
  }

  /**
   * Get conflict summary for multiple drivers
   */
  static getConflictSummary(drivers: Staff[], allSegments: TransportationSegment[]): {
    totalConflicts: number;
    criticalConflicts: number;
    highConflicts: number;
    mediumConflicts: number;
    lowConflicts: number;
    driversWithConflicts: number;
    averageWorkloadScore: number;
  } {
    let totalConflicts = 0;
    let criticalConflicts = 0;
    let highConflicts = 0;
    let mediumConflicts = 0;
    let lowConflicts = 0;
    let driversWithConflicts = 0;
    let totalWorkloadScore = 0;

    drivers.forEach(driver => {
      const driverSegments = allSegments.filter(s => s.driver_id === driver.id);
      const workloadInfo = this.calculateWorkloadScore(driver, driverSegments);

      totalWorkloadScore += workloadInfo.workloadScore;

      if (workloadInfo.conflicts.length > 0) {
        driversWithConflicts++;
      }

      workloadInfo.conflicts.forEach(conflict => {
        totalConflicts++;
        switch (conflict.severity) {
          case 'critical': criticalConflicts++; break;
          case 'high': highConflicts++; break;
          case 'medium': mediumConflicts++; break;
          case 'low': lowConflicts++; break;
        }
      });
    });

    return {
      totalConflicts,
      criticalConflicts,
      highConflicts,
      mediumConflicts,
      lowConflicts,
      driversWithConflicts,
      averageWorkloadScore: drivers.length > 0 ? totalWorkloadScore / drivers.length : 0
    };
  }
}



