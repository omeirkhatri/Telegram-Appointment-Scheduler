import { isDriverAssignmentOverhaulAnalyticsEnabled } from '@/lib/featureFlags';
import { metricsCollectionService } from '@/services/metricsCollectionService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for query parameters
const metricsQuerySchema = z.object({
  period: z.enum(['today', 'yesterday', 'last7days', 'last30days', 'custom']).optional().default('last7days'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  format: z.enum(['json', 'csv', 'export']).optional().default('json')
}).refine((data) => {
  // If period is custom, both start and end dates are required
  if (data.period === 'custom') {
    const startDate = data.startDate || data.start_date;
    const endDate = data.endDate || data.end_date;
    return startDate && endDate;
  }
  return true;
}, {
  message: "Custom period requires both start and end dates"
});

export async function GET(request: NextRequest) {
  try {
    // Check if analytics is enabled
    if (!isDriverAssignmentOverhaulAnalyticsEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Metrics API is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS is not enabled.',
        },
        { status: 403 },
      );
    }
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedParams = metricsQuerySchema.parse(queryParams);

    // Extract dates (support both camelCase and snake_case)
    const startDate = validatedParams.startDate || validatedParams.start_date;
    const endDate = validatedParams.endDate || validatedParams.end_date;

    let metrics;

    if (validatedParams.period === 'custom') {
      // For custom period, use the provided dates
      metrics = await metricsCollectionService.collectComprehensiveMetrics(
        startDate,
        endDate
      );
    } else {
      // For predefined periods, use the getMetricsForPeriod method
      metrics = await metricsCollectionService.getMetricsForPeriod(
        validatedParams.period,
        startDate,
        endDate
      );
    }

    // Handle different response formats
    if (validatedParams.format === 'csv') {
      const csvData = convertMetricsToCSV(metrics, validatedParams.period, startDate, endDate);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="driver-capacity-metrics-${validatedParams.period}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (validatedParams.format === 'export') {
      const exportData = {
        exportInfo: {
          generatedAt: new Date().toISOString(),
          period: validatedParams.period,
          startDate: startDate || 'auto-calculated',
          endDate: endDate || 'auto-calculated',
          version: '1.0',
          system: 'Driver Capacity & Assignment System'
        },
        metrics: metrics,
        summary: generateMetricsSummary(metrics)
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="driver-capacity-metrics-${validatedParams.period}-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      period: validatedParams.period,
      startDate: startDate || 'auto-calculated',
      endDate: endDate || 'auto-calculated'
    });

  } catch (error) {
    console.error('Error collecting metrics:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Optional: Add a POST endpoint for triggering metric collection with custom parameters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const requestSchema = z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      includeDetails: z.boolean().optional().default(false)
    });

    const validatedBody = requestSchema.parse(body);

    // Collect metrics for the specified period
    const metrics = await metricsCollectionService.collectComprehensiveMetrics(
      validatedBody.startDate,
      validatedBody.endDate
    );

    // Optionally include additional details if requested
    const response: any = {
      success: true,
      data: metrics,
      period: 'custom',
      startDate: validatedBody.startDate,
      endDate: validatedBody.endDate
    };

    if (validatedBody.includeDetails) {
      // Add additional context information
      response.details = {
        collectionTime: new Date().toISOString(),
        dataSource: 'transportation_segments, escalation_alerts',
        metricsIncluded: [
          'backlog_counts',
          'assignment_latency',
          'override_frequency',
          'escalation_volume'
        ]
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in POST /api/metrics:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to convert metrics to CSV format
function convertMetricsToCSV(metrics: any, period: string, startDate?: string, endDate?: string): string {
  const headers = [
    'Metric Category',
    'Metric Name',
    'Value',
    'Unit',
    'Period',
    'Start Date',
    'End Date',
    'Generated At'
  ];

  const rows: string[][] = [];
  const generatedAt = new Date().toISOString();

  // Backlog metrics
  rows.push(['Backlog', 'Total Pending', metrics.backlog.totalPending.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Backlog', 'Critical Count', metrics.backlog.criticalCount.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Backlog', 'High Priority Count', metrics.backlog.highPriorityCount.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Backlog', 'Medium Priority Count', metrics.backlog.mediumPriorityCount.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Backlog', 'Low Priority Count', metrics.backlog.lowPriorityCount.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Backlog', 'Escalated Count', metrics.backlog.escalatedCount.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Backlog', 'Overdue Count', metrics.backlog.overdueCount.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);

  // Assignment latency metrics
  rows.push(['Assignment Latency', 'Average Latency', metrics.assignmentLatency.averageLatencyMinutes.toString(), 'minutes', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Assignment Latency', 'Median Latency', metrics.assignmentLatency.medianLatencyMinutes.toString(), 'minutes', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Assignment Latency', 'P95 Latency', metrics.assignmentLatency.p95LatencyMinutes.toString(), 'minutes', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Assignment Latency', 'P99 Latency', metrics.assignmentLatency.p99LatencyMinutes.toString(), 'minutes', period, startDate || '', endDate || '', generatedAt]);

  // Override frequency metrics
  rows.push(['Override Frequency', 'Total Overrides', metrics.overrideFrequency.totalOverrides.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Override Frequency', 'Total Recommendations', metrics.overrideFrequency.totalRecommendations.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Override Frequency', 'Override Rate', metrics.overrideFrequency.overrideRate.toString(), 'percentage', period, startDate || '', endDate || '', generatedAt]);

  // Escalation volume metrics
  rows.push(['Escalation Volume', 'Total Escalations', metrics.escalationVolume.totalEscalations.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Escalation Volume', 'Critical Escalations', metrics.escalationVolume.criticalEscalations.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Escalation Volume', 'High Escalations', metrics.escalationVolume.highEscalations.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  rows.push(['Escalation Volume', 'Average Response Time', metrics.escalationVolume.averageResponseTimeMinutes.toString(), 'minutes', period, startDate || '', endDate || '', generatedAt]);

  // Service line breakdown
  Object.entries(metrics.backlog.byServiceLine).forEach(([serviceLine, count]) => {
    rows.push(['Service Line Breakdown', `Backlog - ${serviceLine}`, count.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  });

  // Transport mode breakdown
  Object.entries(metrics.backlog.byTransportMode).forEach(([mode, count]) => {
    rows.push(['Transport Mode Breakdown', `Backlog - ${mode}`, count.toString(), 'count', period, startDate || '', endDate || '', generatedAt]);
  });

  // Convert to CSV format
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

// Helper function to generate metrics summary for leadership
function generateMetricsSummary(metrics: any): any {
  return {
    keyInsights: {
      totalPendingAssignments: metrics.backlog.totalPending,
      criticalEscalations: metrics.backlog.criticalCount + metrics.escalationVolume.criticalEscalations,
      averageAssignmentTime: `${Math.round(metrics.assignmentLatency.averageLatencyMinutes)} minutes`,
      overrideRate: `${metrics.overrideFrequency.overrideRate.toFixed(1)}%`,
      systemHealth: metrics.backlog.totalPending < 50 ? 'Good' : metrics.backlog.totalPending < 100 ? 'Moderate' : 'Needs Attention'
    },
    performanceTargets: {
      appointmentsWithoutForcedDriver: 'Target: ≥90%',
      postAssignmentConflicts: 'Target: ≤5%',
      driverHoursReduction: 'Target: 30%',
      dispatcherSatisfaction: 'Target: ≥4/5',
      overrideActionsWithReason: 'Target: >80%'
    },
    recommendations: generateRecommendations(metrics)
  };
}

// Helper function to generate actionable recommendations
function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];

  if (metrics.backlog.totalPending > 50) {
    recommendations.push('High backlog detected - consider increasing driver capacity or optimizing assignment algorithms');
  }

  if (metrics.overrideFrequency.overrideRate > 30) {
    recommendations.push('High override rate suggests assignment recommendations may need refinement');
  }

  if (metrics.escalationVolume.criticalEscalations > 5) {
    recommendations.push('Multiple critical escalations - review escalation thresholds and response procedures');
  }

  if (metrics.assignmentLatency.averageLatencyMinutes > 60) {
    recommendations.push('Assignment latency is high - consider automated assignment for routine cases');
  }

  if (metrics.backlog.escalatedCount > metrics.backlog.totalPending * 0.2) {
    recommendations.push('High escalation rate - review priority assignment and resource allocation');
  }

  if (recommendations.length === 0) {
    recommendations.push('System performance is within acceptable parameters');
  }

  return recommendations;
}
