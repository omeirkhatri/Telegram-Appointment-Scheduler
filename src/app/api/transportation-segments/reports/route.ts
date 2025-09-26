import { supabase } from '@/lib/supabase';
import { transportationSegmentService } from '@/services/transportationSegmentService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments/reports - Get comprehensive transportation segment reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const reportType = searchParams.get('type') || 'utilization';
    const format = searchParams.get('format') || 'json';

    // Validate date range
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date range is required (date_from and date_to)',
        },
        { status: 400 }
      );
    }

    let reportData;

    switch (reportType) {
      case 'utilization':
        reportData = await getUtilizationReport(dateFrom, dateTo);
        break;
      case 'overrides':
        reportData = await getOverridesReport(dateFrom, dateTo);
        break;
      case 'driver_performance':
        reportData = await getDriverPerformanceReport(dateFrom, dateTo);
        break;
      case 'conflict_analysis':
        reportData = await getConflictAnalysisReport(dateFrom, dateTo);
        break;
      case 'comprehensive':
        reportData = await getComprehensiveReport(dateFrom, dateTo);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid report type. Supported types: utilization, overrides, driver_performance, conflict_analysis, comprehensive',
          },
          { status: 400 }
        );
    }

    if (format === 'csv') {
      const csvData = convertToCSV(reportData, reportType);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transportation-segments-${reportType}-${dateFrom}-to-${dateTo}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: reportData,
      metadata: {
        reportType,
        dateFrom,
        dateTo,
        generatedAt: new Date().toISOString(),
        format,
      },
    });
  } catch (error) {
    console.error('Error generating transportation segment report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      },
      { status: 500 }
    );
  }
}

// Get utilization report
async function getUtilizationReport(dateFrom: string, dateTo: string) {
  const segments = await transportationSegmentService.getSegmentsByDateRange(dateFrom, dateTo);

  // Get segment statistics
  const stats = await transportationSegmentService.getSegmentStatistics(dateFrom, dateTo);

  // Calculate utilization metrics
  const totalSegments = segments.length;
  const segmentsWithDrivers = segments.filter(s => s.driver_id).length;
  const utilizationRate = totalSegments > 0 ? (segmentsWithDrivers / totalSegments) * 100 : 0;

  // Group by segment type
  const byType = segments.reduce((acc, segment) => {
    acc[segment.segment_type] = (acc[segment.segment_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by status
  const byStatus = segments.reduce((acc, segment) => {
    acc[segment.status] = (acc[segment.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate average travel time and distance
  const segmentsWithTravel = segments.filter(s => s.estimated_travel_minutes && s.estimated_distance_km);
  const avgTravelTime = segmentsWithTravel.length > 0
    ? segmentsWithTravel.reduce((sum, s) => sum + (s.estimated_travel_minutes || 0), 0) / segmentsWithTravel.length
    : 0;
  const avgDistance = segmentsWithTravel.length > 0
    ? segmentsWithTravel.reduce((sum, s) => sum + (s.estimated_distance_km || 0), 0) / segmentsWithTravel.length
    : 0;

  // Calculate manual override rate
  const manualOverrides = segments.filter(s => s.manual_override).length;
  const overrideRate = totalSegments > 0 ? (manualOverrides / totalSegments) * 100 : 0;

  return {
    summary: {
      totalSegments,
      segmentsWithDrivers,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      avgTravelTime: Math.round(avgTravelTime),
      avgDistance: Math.round(avgDistance * 100) / 100,
      manualOverrides,
      overrideRate: Math.round(overrideRate * 100) / 100,
    },
    byType,
    byStatus,
    trends: {
      daily: calculateDailyTrends(segments, 'planned_start'),
      weekly: calculateWeeklyTrends(segments, 'planned_start'),
    },
  };
}

// Get overrides report
async function getOverridesReport(dateFrom: string, dateTo: string) {
  // Get override audit data
  const { data: overrides, error } = await supabase
    .from('transportation_segment_override_audit')
    .select(`
      *,
      segment:transportation_segments(id, title, segment_type, planned_start, planned_end),
      appointment:appointments(id, patient:patients(name))
    `)
    .gte('created_at', `${dateFrom}T00:00:00Z`)
    .lte('created_at', `${dateTo}T23:59:59Z`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch override data: ${error.message}`);
  }

  const overrideData = overrides || [];

  // Group by override reason
  const byReason = overrideData.reduce((acc, override) => {
    acc[override.override_reason] = (acc[override.override_reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by operation type
  const byOperationType = overrideData.reduce((acc, override) => {
    acc[override.operation_type] = (acc[override.operation_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by user
  const byUser = overrideData.reduce((acc, override) => {
    acc[override.user_name] = (acc[override.user_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate follow-up metrics
  const totalOverrides = overrideData.length;
  const requiresFollowUp = overrideData.filter(o => o.requires_follow_up).length;
  const followUpRate = totalOverrides > 0 ? (requiresFollowUp / totalOverrides) * 100 : 0;

  // Get conflict details
  const conflictDetails = overrideData.map(override => ({
    id: override.id,
    segmentTitle: override.segment?.title,
    segmentType: override.segment?.segment_type,
    operationType: override.operation_type,
    overrideReason: override.override_reason,
    userName: override.user_name,
    createdAt: override.created_at,
    requiresFollowUp: override.requires_follow_up,
    conflictDetails: override.conflict_details,
    overrideJustification: override.override_justification,
  }));

  return {
    summary: {
      totalOverrides,
      requiresFollowUp,
      followUpRate: Math.round(followUpRate * 100) / 100,
    },
    byReason,
    byOperationType,
    byUser,
    conflictDetails,
    trends: {
      daily: calculateDailyTrends(overrideData, 'created_at'),
      weekly: calculateWeeklyTrends(overrideData, 'created_at'),
    },
  };
}

// Get driver performance report
async function getDriverPerformanceReport(dateFrom: string, dateTo: string) {
  const segments = await transportationSegmentService.getSegmentsByDateRange(dateFrom, dateTo);

  // Get driver information
  const { data: drivers } = await supabase
    .from('staff')
    .select('id, first_name, last_name, staff_type')
    .eq('staff_type', 'driver')
    .eq('status', 'active');

  const driverStats = (drivers || []).map(driver => {
    const driverSegments = segments.filter(s => s.driver_id === driver.id);
    const completedSegments = driverSegments.filter(s => s.status === 'completed').length;
    const cancelledSegments = driverSegments.filter(s => s.status === 'cancelled').length;
    const totalSegments = driverSegments.length;

    // Calculate performance metrics
    const completionRate = totalSegments > 0 ? (completedSegments / totalSegments) * 100 : 0;
    const cancellationRate = totalSegments > 0 ? (cancelledSegments / totalSegments) * 100 : 0;

    // Calculate average travel time and distance
    const segmentsWithTravel = driverSegments.filter(s => s.estimated_travel_minutes && s.estimated_distance_km);
    const avgTravelTime = segmentsWithTravel.length > 0
      ? segmentsWithTravel.reduce((sum, s) => sum + (s.estimated_travel_minutes || 0), 0) / segmentsWithTravel.length
      : 0;
    const avgDistance = segmentsWithTravel.length > 0
      ? segmentsWithTravel.reduce((sum, s) => sum + (s.estimated_distance_km || 0), 0) / segmentsWithTravel.length
      : 0;

    // Count manual overrides
    const manualOverrides = driverSegments.filter(s => s.manual_override).length;
    const overrideRate = totalSegments > 0 ? (manualOverrides / totalSegments) * 100 : 0;

    return {
      driverId: driver.id,
      driverName: `${driver.first_name} ${driver.last_name}`,
      totalSegments,
      completedSegments,
      cancelledSegments,
      completionRate: Math.round(completionRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      avgTravelTime: Math.round(avgTravelTime),
      avgDistance: Math.round(avgDistance * 100) / 100,
      manualOverrides,
      overrideRate: Math.round(overrideRate * 100) / 100,
      segmentsByType: driverSegments.reduce((acc, s) => {
        acc[s.segment_type] = (acc[s.segment_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  });

  // Calculate overall metrics
  const totalDrivers = driverStats.length;
  const activeDrivers = driverStats.filter(d => d.totalSegments > 0).length;
  const avgCompletionRate = driverStats.length > 0
    ? driverStats.reduce((sum, d) => sum + d.completionRate, 0) / driverStats.length
    : 0;
  const avgOverrideRate = driverStats.length > 0
    ? driverStats.reduce((sum, d) => sum + d.overrideRate, 0) / driverStats.length
    : 0;

  return {
    summary: {
      totalDrivers,
      activeDrivers,
      avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
      avgOverrideRate: Math.round(avgOverrideRate * 100) / 100,
    },
    driverStats,
    trends: {
      daily: calculateDailyTrends(segments, 'planned_start'),
      weekly: calculateWeeklyTrends(segments, 'planned_start'),
    },
  };
}

// Get conflict analysis report
async function getConflictAnalysisReport(dateFrom: string, dateTo: string) {
  const segments = await transportationSegmentService.getSegmentsByDateRange(dateFrom, dateTo);

  // Analyze conflicts
  const conflictAnalysis = [];

  for (const segment of segments) {
    if (segment.driver_id && segment.planned_start && segment.planned_end) {
      const conflicts = await transportationSegmentService.checkDriverConflicts(
        segment.driver_id,
        segment.planned_start,
        segment.planned_end,
        segment.id
      );

      if (conflicts.hasConflict) {
        conflictAnalysis.push({
          segmentId: segment.id,
          segmentTitle: segment.title,
          segmentType: segment.segment_type,
          driverId: segment.driver_id,
          plannedStart: segment.planned_start,
          plannedEnd: segment.planned_end,
          conflictCount: conflicts.conflictingSegments.length,
          conflictingSegments: conflicts.conflictingSegments.map(cs => ({
            id: cs.id,
            title: cs.title,
            segmentType: cs.segment_type,
            plannedStart: cs.planned_start,
            plannedEnd: cs.planned_end,
          })),
          manualOverride: segment.manual_override,
        });
      }
    }
  }

  // Calculate conflict metrics
  const totalConflicts = conflictAnalysis.length;
  const manualOverrides = conflictAnalysis.filter(c => c.manualOverride).length;
  const overrideRate = totalConflicts > 0 ? (manualOverrides / totalConflicts) * 100 : 0;

  // Group by conflict type
  const byConflictType = conflictAnalysis.reduce((acc, conflict) => {
    const conflictType = conflict.conflictingSegments.length > 1 ? 'multiple' : 'single';
    acc[conflictType] = (acc[conflictType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by segment type
  const bySegmentType = conflictAnalysis.reduce((acc, conflict) => {
    acc[conflict.segmentType] = (acc[conflict.segmentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    summary: {
      totalConflicts,
      manualOverrides,
      overrideRate: Math.round(overrideRate * 100) / 100,
    },
    byConflictType,
    bySegmentType,
    conflictDetails: conflictAnalysis,
    trends: {
      daily: calculateDailyTrends(conflictAnalysis, 'plannedStart'),
      weekly: calculateWeeklyTrends(conflictAnalysis, 'plannedStart'),
    },
  };
}

// Get comprehensive report
async function getComprehensiveReport(dateFrom: string, dateTo: string) {
  const [utilization, overrides, driverPerformance, conflictAnalysis] = await Promise.all([
    getUtilizationReport(dateFrom, dateTo),
    getOverridesReport(dateFrom, dateTo),
    getDriverPerformanceReport(dateFrom, dateTo),
    getConflictAnalysisReport(dateFrom, dateTo),
  ]);

  return {
    utilization,
    overrides,
    driverPerformance,
    conflictAnalysis,
    metadata: {
      dateFrom,
      dateTo,
      generatedAt: new Date().toISOString(),
      reportType: 'comprehensive',
    },
  };
}

// Helper functions
function calculateDailyTrends(data: any[], dateField: string) {
  const trends: Record<string, number> = {};

  data.forEach(item => {
    const date = item[dateField]?.split('T')[0] || item[dateField]?.split(' ')[0];
    if (date) {
      trends[date] = (trends[date] || 0) + 1;
    }
  });

  return Object.entries(trends)
    .map(([date, count]) => ({ date, count: count as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateWeeklyTrends(data: any[], dateField: string) {
  const trends: Record<string, number> = {};

  data.forEach(item => {
    const date = new Date(item[dateField]?.split('T')[0] || item[dateField]?.split(' ')[0]);
    if (!isNaN(date.getTime())) {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
      const weekKey = weekStart.toISOString().split('T')[0];
      trends[weekKey] = (trends[weekKey] || 0) + 1;
    }
  });

  return Object.entries(trends)
    .map(([week, count]) => ({ week, count: count as number }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

function convertToCSV(data: any, reportType: string): string {
  // This is a simplified CSV conversion - in a real implementation,
  // you'd want to handle nested objects and arrays more carefully
  const headers = Object.keys(data);
  const rows = [headers.join(',')];

  // Add data rows based on report type
  if (reportType === 'utilization') {
    rows.push(`Total Segments,${data.summary?.totalSegments || 0}`);
    rows.push(`Utilization Rate,${data.summary?.utilizationRate || 0}%`);
    rows.push(`Manual Overrides,${data.summary?.manualOverrides || 0}`);
  }

  return rows.join('\n');
}
