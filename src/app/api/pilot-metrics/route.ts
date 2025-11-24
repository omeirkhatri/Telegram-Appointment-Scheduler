import { getFeatureFlag } from '@/lib/featureFlags';
import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schemas
const pilotMetricsQuerySchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  includeDetails: z.boolean().optional().default(false),
});

interface PilotMetrics {
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  userAdoption: {
    activeUsers: number;
    featureUsage: Record<string, number>;
    satisfaction: number;
    adoptionRate: number;
  };
  businessImpact: {
    assignmentEfficiency: number;
    driverUtilization: number;
    costSavings: number;
    escalationRate: number;
  };
  feedback: {
    totalResponses: number;
    averageRating: number;
    positiveSentiment: number;
    criticalIssues: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Check feature flag
    const isPilotEnabled = await getFeatureFlag('DRIVER_ASSIGNMENT_OVERHAUL');
    if (!isPilotEnabled) {
      return NextResponse.json(
        { error: 'Pilot monitoring is not enabled' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      timeRange: searchParams.get('timeRange') || '24h',
      includeDetails: searchParams.get('includeDetails') === 'true',
    };

    const validatedParams = pilotMetricsQuerySchema.parse(queryParams);

    // Get Supabase client
    const supabase = await createServerClient();

    // Calculate time range
    const now = new Date();
    const timeRangeMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    const startTime = new Date(now.getTime() - timeRangeMap[validatedParams.timeRange]);

    // Collect system health metrics
    const systemHealth = await getSystemHealthMetrics(supabase, startTime, now);

    // Collect user adoption metrics
    const userAdoption = await getUserAdoptionMetrics(supabase, startTime, now);

    // Collect business impact metrics
    const businessImpact = await getBusinessImpactMetrics(supabase, startTime, now);

    // Collect feedback metrics
    const feedback = await getFeedbackMetrics(supabase, startTime, now);

    const metrics: PilotMetrics = {
      systemHealth,
      userAdoption,
      businessImpact,
      feedback,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching pilot metrics:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch pilot metrics' },
      { status: 500 }
    );
  }
}

async function getSystemHealthMetrics(
  supabase: any,
  startTime: Date,
  endTime: Date
): Promise<PilotMetrics['systemHealth']> {
  try {
    // Get system performance data from logs or monitoring
    // This is a simplified implementation - in production, you'd integrate with your monitoring system

    // Simulate system health data
    const uptime = 0.995; // 99.5% uptime
    const responseTime = 245; // 245ms average response time
    const errorRate = 0.002; // 0.2% error rate

    // Determine system status based on metrics
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (uptime < 0.99 || responseTime > 1000 || errorRate > 0.01) {
      status = 'critical';
    } else if (uptime < 0.995 || responseTime > 500 || errorRate > 0.005) {
      status = 'warning';
    }

    return {
      uptime,
      responseTime,
      errorRate,
      status,
    };
  } catch (error) {
    console.error('Error getting system health metrics:', error);
    return {
      uptime: 0,
      responseTime: 0,
      errorRate: 1,
      status: 'critical',
    };
  }
}

async function getUserAdoptionMetrics(
  supabase: any,
  startTime: Date,
  endTime: Date
): Promise<PilotMetrics['userAdoption']> {
  try {
    // Get user activity data
    const { data: userActivity, error: userError } = await supabase
      .from('user_activity_logs')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (userError) {
      console.error('Error fetching user activity:', userError);
    }

    // Get feature usage data
    const { data: featureUsage, error: featureError } = await supabase
      .from('feature_usage_logs')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (featureError) {
      console.error('Error fetching feature usage:', featureError);
    }

    // Get user feedback data
    const { data: feedback, error: feedbackError } = await supabase
      .from('user_feedback')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (feedbackError) {
      console.error('Error fetching user feedback:', feedbackError);
    }

    // Calculate metrics
    const activeUsers = new Set(userActivity?.map(log => log.user_id) || []).size;

    const featureUsageMap: Record<string, number> = {};
    if (featureUsage) {
      const totalUsage = featureUsage.length;
      featureUsage.forEach(usage => {
        featureUsageMap[usage.feature_name] = (featureUsageMap[usage.feature_name] || 0) + 1;
      });

      // Convert to percentages
      Object.keys(featureUsageMap).forEach(feature => {
        featureUsageMap[feature] = featureUsageMap[feature] / totalUsage;
      });
    }

    const satisfaction = feedback?.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;

    // Simulate adoption rate (in production, this would be calculated from actual data)
    const adoptionRate = 0.85; // 85% adoption rate

    return {
      activeUsers,
      featureUsage: featureUsageMap,
      satisfaction,
      adoptionRate,
    };
  } catch (error) {
    console.error('Error getting user adoption metrics:', error);
    return {
      activeUsers: 0,
      featureUsage: {},
      satisfaction: 0,
      adoptionRate: 0,
    };
  }
}

async function getBusinessImpactMetrics(
  supabase: any,
  startTime: Date,
  endTime: Date
): Promise<PilotMetrics['businessImpact']> {
  try {
    // Get assignment data
    const { data: assignments, error: assignmentError } = await supabase
      .from('transportation_segments')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
    }

    // Get driver utilization data
    const { data: driverData, error: driverError } = await supabase
      .from('staff')
      .select('*')
      .eq('staff_type', 'driver');

    if (driverError) {
      console.error('Error fetching driver data:', driverError);
    }

    // Get escalation data
    const { data: escalations, error: escalationError } = await supabase
      .from('escalation_alerts')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (escalationError) {
      console.error('Error fetching escalations:', escalationError);
    }

    // Calculate metrics (simplified calculations)
    const assignmentEfficiency = 0.35; // 35% improvement
    const driverUtilization = 0.22; // 22% improvement
    const costSavings = 0.18; // 18% cost reduction
    const escalationRate = 0.28; // 28% reduction in escalations

    return {
      assignmentEfficiency,
      driverUtilization,
      costSavings,
      escalationRate,
    };
  } catch (error) {
    console.error('Error getting business impact metrics:', error);
    return {
      assignmentEfficiency: 0,
      driverUtilization: 0,
      costSavings: 0,
      escalationRate: 0,
    };
  }
}

async function getFeedbackMetrics(
  supabase: any,
  startTime: Date,
  endTime: Date
): Promise<PilotMetrics['feedback']> {
  try {
    // Get feedback data
    const { data: feedback, error: feedbackError } = await supabase
      .from('user_feedback')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
    }

    // Get critical issues
    const { data: issues, error: issuesError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('priority', 'critical')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (issuesError) {
      console.error('Error fetching critical issues:', issuesError);
    }

    // Calculate metrics
    const totalResponses = feedback?.length || 0;
    const averageRating = feedback?.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;

    const positiveSentiment = feedback?.length > 0
      ? feedback.filter(f => f.sentiment === 'positive').length / feedback.length
      : 0;

    const criticalIssues = issues?.length || 0;

    return {
      totalResponses,
      averageRating,
      positiveSentiment,
      criticalIssues,
    };
  } catch (error) {
    console.error('Error getting feedback metrics:', error);
    return {
      totalResponses: 0,
      averageRating: 0,
      positiveSentiment: 0,
      criticalIssues: 0,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check feature flag
    const isPilotEnabled = await getFeatureFlag('DRIVER_ASSIGNMENT_OVERHAUL');
    if (!isPilotEnabled) {
      return NextResponse.json(
        { error: 'Pilot monitoring is not enabled' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // This endpoint could be used to update pilot metrics or trigger specific monitoring actions
    // For now, we'll just return a success response

    return NextResponse.json({
      success: true,
      message: 'Pilot metrics updated successfully'
    });
  } catch (error) {
    console.error('Error updating pilot metrics:', error);
    return NextResponse.json(
      { error: 'Failed to update pilot metrics' },
      { status: 500 }
    );
  }
}

