import { supabase } from '@/lib/supabase';
import { appointmentService, auditTrailService } from '@/services';
import type { DashboardStatistics, DateRange } from '@/types/reports';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/reports/statistics - Get comprehensive dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const dateFrom = searchParams.get('dateFrom') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = searchParams.get('dateTo') || new Date().toISOString().split('T')[0];

    const dateRange: DateRange = { from: dateFrom, to: dateTo };

    // Fetch all statistics in parallel
    const [
      appointmentStats,
      patientStats,
      staffStats,
      auditStats,
      systemHealthStats,
    ] = await Promise.all([
      getAppointmentStatistics(dateRange),
      getPatientStatistics(dateRange),
      getStaffStatistics(dateRange),
      getAuditTrailStatistics(dateRange),
      getSystemHealthStatistics(),
    ]);

    const dashboardStats: DashboardStatistics = {
      appointments: appointmentStats,
      patients: patientStats,
      staff: staffStats,
      // emailDelivery: emailStats, // Removed - no longer needed
      auditTrail: auditStats,
      systemHealth: systemHealthStats,
    };

    return NextResponse.json({
      success: true,
      data: dashboardStats,
      dateRange,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch statistics',
      },
      { status: 500 },
    );
  }
}

async function getAppointmentStatistics(dateRange: DateRange) {
  try {
    // Get appointment statistics from service
    const stats = await appointmentService.getAppointmentStatistics(dateRange.from, dateRange.to);

    // Get additional trend data
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_date, status, appointment_type, duration_minutes')
      .gte('appointment_date', dateRange.from)
      .lte('appointment_date', dateRange.to)
      .order('appointment_date', { ascending: true });

    // Calculate trends
    const dailyTrends = calculateDailyTrends(appointments || [], 'appointment_date');
    const weeklyTrends = calculateWeeklyTrends(appointments || [], 'appointment_date');
    const monthlyTrends = calculateMonthlyTrends(appointments || [], 'appointment_date');

    // Calculate completion rate
    const totalAppointments = stats.total;
    const completedAppointments = stats.byStatus.completed || 0;
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

    // Calculate average duration
    const totalDuration = (appointments || []).reduce((sum, apt) => sum + (apt.duration_minutes || 0), 0);
    const averageDuration = totalAppointments > 0 ? totalDuration / totalAppointments : 0;

    // Get today's appointments
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = (appointments || []).filter(apt => apt.appointment_date === today).length;

    // Get this week's appointments
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const thisWeekAppointments = (appointments || []).filter(apt => apt.appointment_date >= weekStartStr).length;

    // Get this month's appointments
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const thisMonthAppointments = (appointments || []).filter(apt => apt.appointment_date >= monthStartStr).length;

    return {
      total: stats.total,
      today: todayAppointments,
      thisWeek: thisWeekAppointments,
      thisMonth: thisMonthAppointments,
      byStatus: stats.byStatus,
      byType: stats.byType,
      completionRate: Math.round(completionRate * 100) / 100,
      averageDuration: Math.round(averageDuration),
      trends: {
        daily: dailyTrends,
        weekly: weeklyTrends,
        monthly: monthlyTrends,
      },
    };
  } catch (error) {
    console.error('Error getting appointment statistics:', error);
    throw error;
  }
}

async function getPatientStatistics(dateRange: DateRange) {
  try {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, area, city, created_at')
      .gte('created_at', `${dateRange.from}T00:00:00Z`)
      .lte('created_at', `${dateRange.to}T23:59:59Z`);

    const { data: allPatients } = await supabase
      .from('patients')
      .select('id, area, city, created_at');

    const total = allPatients?.length || 0;
    const newThisMonth = patients?.length || 0;

    // Calculate active patients (patients with appointments in the date range)
    const { data: activePatientIds } = await supabase
      .from('appointments')
      .select('patient_id')
      .gte('appointment_date', dateRange.from)
      .lte('appointment_date', dateRange.to);

    const uniqueActivePatients = new Set(activePatientIds?.map(apt => apt.patient_id) || []);
    const activePatients = uniqueActivePatients.size;

    // Group by area
    const byArea: Record<string, number> = {};
    (allPatients || []).forEach(patient => {
      const area = patient.area || 'Unknown';
      byArea[area] = (byArea[area] || 0) + 1;
    });

    // Calculate trends
    const dailyTrends = calculateDailyTrends(allPatients || [], 'created_at');
    const monthlyTrends = calculateMonthlyTrends(allPatients || [], 'created_at');

    return {
      total,
      newThisMonth,
      activePatients,
      byArea,
      trends: {
        daily: dailyTrends,
        monthly: monthlyTrends,
      },
    };
  } catch (error) {
    console.error('Error getting patient statistics:', error);
    throw error;
  }
}

async function getStaffStatistics(dateRange: DateRange) {
  try {
    const { data: staff } = await supabase
      .from('staff')
      .select('id, staff_type, status, created_at');

    const total = staff?.length || 0;
    const active = staff?.filter(s => s.status === 'active').length || 0;

    // Group by type
    const byType: Record<string, number> = {};
    (staff || []).forEach(member => {
      byType[member.staff_type] = (byType[member.staff_type] || 0) + 1;
    });

    // Calculate workload (appointments per staff member)
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, appointment_staff(staff_id)')
      .gte('appointment_date', dateRange.from)
      .lte('appointment_date', dateRange.to);

    const staffWorkload: Record<string, number> = {};
    (appointments || []).forEach(apt => {
      if (apt.appointment_staff) {
        apt.appointment_staff.forEach((assignment: any) => {
          staffWorkload[assignment.staff_id] = (staffWorkload[assignment.staff_id] || 0) + 1;
        });
      }
    });

    const totalWorkload = Object.values(staffWorkload).reduce((sum, count) => sum + count, 0);
    const averageWorkload = active > 0 ? totalWorkload / active : 0;
    const utilizationRate = active > 0 ? (Object.keys(staffWorkload).length / active) * 100 : 0;

    // Calculate trends
    const dailyTrends = calculateDailyTrends(staff || [], 'created_at');
    const monthlyTrends = calculateMonthlyTrends(staff || [], 'created_at');

    return {
      total,
      active,
      byType,
      averageWorkload: Math.round(averageWorkload * 100) / 100,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      trends: {
        daily: dailyTrends,
        monthly: monthlyTrends,
      },
    };
  } catch (error) {
    console.error('Error getting staff statistics:', error);
    throw error;
  }
}

// Email delivery statistics function removed - no longer needed

async function getAuditTrailStatistics(dateRange: DateRange) {
  try {
    const result = await auditTrailService.getAuditStatistics({
      start_date: dateRange.from,
      end_date: dateRange.to,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to get audit statistics');
    }

    const stats = result.data.statistics;
    const totalOperations = stats.reduce((sum, stat) => sum + stat.total_operations, 0);
    const totalSuccessful = stats.reduce((sum, stat) => sum + stat.successful_operations, 0);
    const totalFailed = stats.reduce((sum, stat) => sum + stat.failed_operations, 0);

    const successRate = totalOperations > 0 ? (totalSuccessful / totalOperations) * 100 : 0;

    const averageOperationTime = stats.length > 0
      ? stats.reduce((sum, stat) => sum + stat.average_operation_duration_ms, 0) / stats.length
      : 0;

    // Group by type
    const byType: Record<string, number> = {};
    stats.forEach(stat => {
      byType[stat.operation_type] = (byType[stat.operation_type] || 0) + stat.total_operations;
    });

    // Calculate trends
    const dailyTrends = stats.map(stat => ({
      date: stat.date,
      operations: stat.total_operations,
      success: stat.successful_operations,
      failed: stat.failed_operations,
    }));

    const monthlyTrends = calculateMonthlyAuditTrends(stats);

    return {
      totalOperations,
      successRate: Math.round(successRate * 100) / 100,
      averageOperationTime: Math.round(averageOperationTime),
      byType,
      trends: {
        daily: dailyTrends,
        monthly: monthlyTrends,
      },
    };
  } catch (error) {
    console.error('Error getting audit trail statistics:', error);
    throw error;
  }
}

async function getSystemHealthStatistics() {
  try {
    // Get job statistics
    const { data: jobs } = await supabase
      .from('job_executions')
      .select('status, duration_ms, started_at')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const activeJobs = jobs?.filter(job => job.status === 'running').length || 0;
    const completedJobs = jobs?.filter(job => job.status === 'completed').length || 0;
    const failedJobs = jobs?.filter(job => job.status === 'failed').length || 0;

    const averageResponseTime = jobs && jobs.length > 0
      ? jobs.reduce((sum, job) => sum + (job.duration_ms || 0), 0) / jobs.length
      : 0;

    const errorRate = jobs && jobs.length > 0
      ? (failedJobs / jobs.length) * 100
      : 0;

    return {
      uptime: 99.9, // This would be calculated from actual uptime data
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      activeJobs,
      completedJobs,
      failedJobs,
    };
  } catch (error) {
    console.error('Error getting system health statistics:', error);
    throw error;
  }
}

// Helper functions for trend calculations
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

function calculateMonthlyTrends(data: any[], dateField: string) {
  const trends: Record<string, number> = {};

  data.forEach(item => {
    const date = new Date(item[dateField]?.split('T')[0] || item[dateField]?.split(' ')[0]);
    if (!isNaN(date.getTime())) {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      trends[monthKey] = (trends[monthKey] || 0) + 1;
    }
  });

  return Object.entries(trends)
    .map(([month, count]) => ({ month, count: count as number }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function calculateMonthlyEmailTrends(stats: any[]) {
  const trends: Record<string, { sent: number; delivered: number; failed: number }> = {};

  stats.forEach(stat => {
    const date = new Date(stat.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!trends[monthKey]) {
      trends[monthKey] = { sent: 0, delivered: 0, failed: 0 };
    }

    trends[monthKey].sent += stat.totalEmails;
    trends[monthKey].delivered += stat.successfulDeliveries;
    trends[monthKey].failed += stat.failedDeliveries;
  });

  return Object.entries(trends)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function calculateMonthlyAuditTrends(stats: any[]) {
  const trends: Record<string, { operations: number; success: number; failed: number }> = {};

  stats.forEach(stat => {
    const date = new Date(stat.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!trends[monthKey]) {
      trends[monthKey] = { operations: 0, success: 0, failed: 0 };
    }

    trends[monthKey].operations += stat.total_operations;
    trends[monthKey].success += stat.successful_operations;
    trends[monthKey].failed += stat.failed_operations;
  });

  return Object.entries(trends)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
