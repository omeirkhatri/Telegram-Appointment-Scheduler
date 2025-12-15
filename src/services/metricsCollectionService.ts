import { Database } from '@/types/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface BacklogMetrics {
  totalPending: number;
  criticalCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  byServiceLine: Record<string, number>;
  byTransportMode: Record<string, number>;
  escalatedCount: number;
  overdueCount: number;
}

export interface AssignmentLatencyMetrics {
  averageLatencyMinutes: number;
  medianLatencyMinutes: number;
  p95LatencyMinutes: number;
  p99LatencyMinutes: number;
  byPriority: Record<string, number>;
  byServiceLine: Record<string, number>;
  byTransportMode: Record<string, number>;
  recentAssignments: Array<{
    segmentId: string;
    createdAt: string;
    assignedAt: string;
    latencyMinutes: number;
    priority: string;
  }>;
}

export interface OverrideFrequencyMetrics {
  totalOverrides: number;
  totalRecommendations: number;
  overrideRate: number;
  byReason: Record<string, number>;
  byPriority: Record<string, number>;
  byServiceLine: Record<string, number>;
  recentOverrides: Array<{
    segmentId: string;
    overrideReason: string;
    overrideNotes?: string;
    originalDriverId?: string;
    newDriverId?: string;
    timestamp: string;
  }>;
}

export interface EscalationVolumeMetrics {
  totalEscalations: number;
  criticalEscalations: number;
  highEscalations: number;
  mediumEscalations: number;
  lowEscalations: number;
  averageResponseTimeMinutes: number;
  medianResponseTimeMinutes: number;
  byServiceLine: Record<string, number>;
  byTransportMode: Record<string, number>;
  recentEscalations: Array<{
    segmentId: string;
    escalatedAt: string;
    resolvedAt?: string;
    responseTimeMinutes?: number;
    severity: string;
    status: string;
  }>;
}

export interface ComprehensiveMetrics {
  timestamp: string;
  backlog: BacklogMetrics;
  assignmentLatency: AssignmentLatencyMetrics;
  overrideFrequency: OverrideFrequencyMetrics;
  escalationVolume: EscalationVolumeMetrics;
}

export class MetricsCollectionService {
  /**
   * Collect comprehensive metrics for all key performance indicators
   */
  async collectComprehensiveMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<ComprehensiveMetrics> {
    const timestamp = new Date().toISOString();

    const [backlog, assignmentLatency, overrideFrequency, escalationVolume] = await Promise.all([
      this.collectBacklogMetrics(startDate, endDate),
      this.collectAssignmentLatencyMetrics(startDate, endDate),
      this.collectOverrideFrequencyMetrics(startDate, endDate),
      this.collectEscalationVolumeMetrics(startDate, endDate)
    ]);

    return {
      timestamp,
      backlog,
      assignmentLatency,
      overrideFrequency,
      escalationVolume
    };
  }

  /**
   * Collect backlog metrics including pending segments by priority and escalation status
   */
  async collectBacklogMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<BacklogMetrics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get all unassigned segments
    const { data: unassignedSegments, error: unassignedError } = await supabase
      .from('transportation_segments')
      .select(`
        id,
        priority,
        transport_mode,
        service_line,
        status,
        created_at,
        planned_start_time,
        escalation_status
      `)
      .is('driver_id', null)
      .eq('status', 'draft')
      .gte('planned_start_time', dateFilter.start)
      .lte('planned_start_time', dateFilter.end);

    if (unassignedError) {
      throw new Error(`Failed to fetch unassigned segments: ${unassignedError.message}`);
    }

    // Calculate backlog metrics
    const totalPending = unassignedSegments?.length || 0;
    const criticalCount = unassignedSegments?.filter(s => s.priority === 'critical').length || 0;
    const highPriorityCount = unassignedSegments?.filter(s => s.priority === 'high').length || 0;
    const mediumPriorityCount = unassignedSegments?.filter(s => s.priority === 'medium').length || 0;
    const lowPriorityCount = unassignedSegments?.filter(s => s.priority === 'low').length || 0;
    const escalatedCount = unassignedSegments?.filter(s => s.escalation_status === 'escalated').length || 0;

    // Calculate overdue segments (past planned start time)
    const now = new Date();
    const overdueCount = unassignedSegments?.filter(s =>
      new Date(s.planned_start_time) < now
    ).length || 0;

    // Group by service line
    const byServiceLine: Record<string, number> = {};
    unassignedSegments?.forEach(segment => {
      const serviceLine = segment.service_line || 'unknown';
      byServiceLine[serviceLine] = (byServiceLine[serviceLine] || 0) + 1;
    });

    // Group by transport mode
    const byTransportMode: Record<string, number> = {};
    unassignedSegments?.forEach(segment => {
      const mode = segment.transport_mode || 'unknown';
      byTransportMode[mode] = (byTransportMode[mode] || 0) + 1;
    });

    return {
      totalPending,
      criticalCount,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      byServiceLine,
      byTransportMode,
      escalatedCount,
      overdueCount
    };
  }

  /**
   * Collect assignment latency metrics (time from creation to assignment)
   */
  async collectAssignmentLatencyMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<AssignmentLatencyMetrics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get assigned segments with creation and assignment times
    const { data: assignedSegments, error: assignedError } = await supabase
      .from('transportation_segments')
      .select(`
        id,
        priority,
        service_line,
        transport_mode,
        created_at,
        updated_at,
        driver_id
      `)
      .not('driver_id', 'is', null)
      .eq('status', 'scheduled')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end);

    if (assignedError) {
      throw new Error(`Failed to fetch assigned segments: ${assignedError.message}`);
    }

    // Calculate latency for each segment
    const latencies: number[] = [];
    const recentAssignments: Array<{
      segmentId: string;
      createdAt: string;
      assignedAt: string;
      latencyMinutes: number;
      priority: string;
    }> = [];

    assignedSegments?.forEach(segment => {
      const createdAt = new Date(segment.created_at);
      const assignedAt = new Date(segment.updated_at); // Assuming updated_at reflects assignment time
      const latencyMinutes = (assignedAt.getTime() - createdAt.getTime()) / (1000 * 60);

      latencies.push(latencyMinutes);
      recentAssignments.push({
        segmentId: segment.id,
        createdAt: segment.created_at,
        assignedAt: segment.updated_at,
        latencyMinutes,
        priority: segment.priority || 'medium'
      });
    });

    // Calculate statistics
    const sortedLatencies = latencies.sort((a, b) => a - b);
    const averageLatencyMinutes = latencies.length > 0
      ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length
      : 0;
    const medianLatencyMinutes = sortedLatencies.length > 0
      ? sortedLatencies[Math.floor(sortedLatencies.length / 2)]
      : 0;
    const p95LatencyMinutes = sortedLatencies.length > 0
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
      : 0;
    const p99LatencyMinutes = sortedLatencies.length > 0
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)]
      : 0;

    // Group by priority
    const byPriority: Record<string, number> = {};
    recentAssignments.forEach(assignment => {
      const priority = assignment.priority;
      if (!byPriority[priority]) {
        byPriority[priority] = 0;
      }
      byPriority[priority] += assignment.latencyMinutes;
    });

    // Group by service line
    const byServiceLine: Record<string, number> = {};
    assignedSegments?.forEach(segment => {
      const serviceLine = segment.service_line || 'unknown';
      if (!byServiceLine[serviceLine]) {
        byServiceLine[serviceLine] = 0;
      }
      const latency = latencies[assignedSegments.indexOf(segment)];
      byServiceLine[serviceLine] += latency;
    });

    // Group by transport mode
    const byTransportMode: Record<string, number> = {};
    assignedSegments?.forEach(segment => {
      const mode = segment.transport_mode || 'unknown';
      if (!byTransportMode[mode]) {
        byTransportMode[mode] = 0;
      }
      const latency = latencies[assignedSegments.indexOf(segment)];
      byTransportMode[mode] += latency;
    });

    return {
      averageLatencyMinutes,
      medianLatencyMinutes,
      p95LatencyMinutes,
      p99LatencyMinutes,
      byPriority,
      byServiceLine,
      byTransportMode,
      recentAssignments: recentAssignments.slice(-10) // Last 10 assignments
    };
  }

  /**
   * Collect override frequency metrics
   */
  async collectOverrideFrequencyMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<OverrideFrequencyMetrics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get segments with override data from recommendation_metadata
    const { data: segmentsWithOverrides, error: overrideError } = await supabase
      .from('transportation_segments')
      .select(`
        id,
        priority,
        service_line,
        recommendation_metadata,
        updated_at
      `)
      .not('recommendation_metadata', 'is', null)
      .gte('updated_at', dateFilter.start)
      .lte('updated_at', dateFilter.end);

    if (overrideError) {
      throw new Error(`Failed to fetch override data: ${overrideError.message}`);
    }

    // Parse override data from recommendation_metadata
    const overrides: Array<{
      segmentId: string;
      overrideReason: string;
      overrideNotes?: string;
      originalDriverId?: string;
      newDriverId?: string;
      timestamp: string;
    }> = [];

    segmentsWithOverrides?.forEach(segment => {
      if (segment.recommendation_metadata && typeof segment.recommendation_metadata === 'object') {
        const metadata = segment.recommendation_metadata as any;
        if (metadata.overrideReason) {
          overrides.push({
            segmentId: segment.id,
            overrideReason: metadata.overrideReason,
            overrideNotes: metadata.overrideNotes,
            originalDriverId: metadata.originalDriverId,
            newDriverId: metadata.newDriverId,
            timestamp: segment.updated_at
          });
        }
      }
    });

    // Get total recommendations (segments with recommendation_metadata)
    const { data: allRecommendations, error: recommendationsError } = await supabase
      .from('transportation_segments')
      .select('id')
      .not('recommendation_metadata', 'is', null)
      .gte('updated_at', dateFilter.start)
      .lte('updated_at', dateFilter.end);

    if (recommendationsError) {
      throw new Error(`Failed to fetch recommendations data: ${recommendationsError.message}`);
    }

    const totalOverrides = overrides.length;
    const totalRecommendations = allRecommendations?.length || 0;
    const overrideRate = totalRecommendations > 0 ? (totalOverrides / totalRecommendations) * 100 : 0;

    // Group by reason
    const byReason: Record<string, number> = {};
    overrides.forEach(override => {
      byReason[override.overrideReason] = (byReason[override.overrideReason] || 0) + 1;
    });

    // Group by priority
    const byPriority: Record<string, number> = {};
    segmentsWithOverrides?.forEach(segment => {
      const priority = segment.priority || 'medium';
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    });

    // Group by service line
    const byServiceLine: Record<string, number> = {};
    segmentsWithOverrides?.forEach(segment => {
      const serviceLine = segment.service_line || 'unknown';
      byServiceLine[serviceLine] = (byServiceLine[serviceLine] || 0) + 1;
    });

    return {
      totalOverrides,
      totalRecommendations,
      overrideRate,
      byReason,
      byPriority,
      byServiceLine,
      recentOverrides: overrides.slice(-10) // Last 10 overrides
    };
  }

  /**
   * Collect escalation volume metrics
   */
  async collectEscalationVolumeMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<EscalationVolumeMetrics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get escalation alerts
    const { data: escalationAlerts, error: escalationError } = await supabase
      .from('escalation_alerts')
      .select(`
        id,
        segment_id,
        severity,
        status,
        created_at,
        resolved_at,
        service_line,
        transport_mode
      `)
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end);

    if (escalationError) {
      throw new Error(`Failed to fetch escalation alerts: ${escalationError.message}`);
    }

    const totalEscalations = escalationAlerts?.length || 0;
    const criticalEscalations = escalationAlerts?.filter(a => a.severity === 'critical').length || 0;
    const highEscalations = escalationAlerts?.filter(a => a.severity === 'high').length || 0;
    const mediumEscalations = escalationAlerts?.filter(a => a.severity === 'medium').length || 0;
    const lowEscalations = escalationAlerts?.filter(a => a.severity === 'low').length || 0;

    // Calculate response times
    const responseTimes: number[] = [];
    const recentEscalations: Array<{
      segmentId: string;
      escalatedAt: string;
      resolvedAt?: string;
      responseTimeMinutes?: number;
      severity: string;
      status: string;
    }> = [];

    escalationAlerts?.forEach(alert => {
      const escalatedAt = new Date(alert.created_at);
      const resolvedAt = alert.resolved_at ? new Date(alert.resolved_at) : null;
      const responseTimeMinutes = resolvedAt
        ? (resolvedAt.getTime() - escalatedAt.getTime()) / (1000 * 60)
        : undefined;

      if (responseTimeMinutes !== undefined) {
        responseTimes.push(responseTimeMinutes);
      }

      recentEscalations.push({
        segmentId: alert.segment_id,
        escalatedAt: alert.created_at,
        resolvedAt: alert.resolved_at || undefined,
        responseTimeMinutes,
        severity: alert.severity,
        status: alert.status
      });
    });

    const averageResponseTimeMinutes = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    const medianResponseTimeMinutes = responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
      : 0;

    // Group by service line
    const byServiceLine: Record<string, number> = {};
    escalationAlerts?.forEach(alert => {
      const serviceLine = alert.service_line || 'unknown';
      byServiceLine[serviceLine] = (byServiceLine[serviceLine] || 0) + 1;
    });

    // Group by transport mode
    const byTransportMode: Record<string, number> = {};
    escalationAlerts?.forEach(alert => {
      const mode = alert.transport_mode || 'unknown';
      byTransportMode[mode] = (byTransportMode[mode] || 0) + 1;
    });

    return {
      totalEscalations,
      criticalEscalations,
      highEscalations,
      mediumEscalations,
      lowEscalations,
      averageResponseTimeMinutes,
      medianResponseTimeMinutes,
      byServiceLine,
      byTransportMode,
      recentEscalations: recentEscalations.slice(-10) // Last 10 escalations
    };
  }

  /**
   * Get metrics for a specific time period with optional filtering
   */
  async getMetricsForPeriod(
    period: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom',
    customStartDate?: string,
    customEndDate?: string
  ): Promise<ComprehensiveMetrics> {
    let startDate: string;
    let endDate: string;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        startDate = today.toISOString();
        endDate = now.toISOString();
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString();
        endDate = today.toISOString();
        break;
      case 'last7days':
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        startDate = last7Days.toISOString();
        endDate = now.toISOString();
        break;
      case 'last30days':
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);
        startDate = last30Days.toISOString();
        endDate = now.toISOString();
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) {
          throw new Error('Custom period requires both start and end dates');
        }
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        throw new Error(`Invalid period: ${period}`);
    }

    return this.collectComprehensiveMetrics(startDate, endDate);
  }

  /**
   * Helper method to build date filter for queries
   */
  private buildDateFilter(startDate?: string, endDate?: string) {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago

    return {
      start: startDate || defaultStart.toISOString(),
      end: endDate || now.toISOString()
    };
  }
}

export const metricsCollectionService = new MetricsCollectionService();
