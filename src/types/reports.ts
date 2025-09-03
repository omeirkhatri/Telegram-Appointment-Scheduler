// Reports and Analytics Types

// KPI (Key Performance Indicator) types
export interface KPI {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  unit?: string;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
}

// Dashboard statistics
export interface DashboardStatistics {
  appointments: AppointmentStatistics;
  patients: PatientStatistics;
  staff: StaffStatistics;
  emailDelivery: EmailDeliveryStatistics;
  auditTrail: AuditTrailStatistics;
  systemHealth: SystemHealthStatistics;
}

export interface AppointmentStatistics {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  completionRate: number;
  averageDuration: number;
  trends: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
}

export interface PatientStatistics {
  total: number;
  newThisMonth: number;
  activePatients: number;
  byArea: Record<string, number>;
  averageAge?: number;
  trends: {
    daily: Array<{ date: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
}

export interface StaffStatistics {
  total: number;
  active: number;
  byType: Record<string, number>;
  averageWorkload: number;
  utilizationRate: number;
  trends: {
    daily: Array<{ date: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
}

export interface EmailDeliveryStatistics {
  totalSent: number;
  successRate: number;
  failureRate: number;
  averageDeliveryTime: number;
  byType: Record<string, number>;
  trends: {
    daily: Array<{ date: string; sent: number; delivered: number; failed: number }>;
    monthly: Array<{ month: string; sent: number; delivered: number; failed: number }>;
  };
}

export interface AuditTrailStatistics {
  totalOperations: number;
  successRate: number;
  averageOperationTime: number;
  byType: Record<string, number>;
  trends: {
    daily: Array<{ date: string; operations: number; success: number; failed: number }>;
    monthly: Array<{ month: string; operations: number; success: number; failed: number }>;
  };
}

export interface SystemHealthStatistics {
  uptime: number;
  averageResponseTime: number;
  errorRate: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

// Export options
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  dateFrom?: string;
  dateTo?: string;
  includeFields?: string[];
  filters?: Record<string, any>;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

// Date range for filtering
export interface DateRange {
  from: string;
  to: string;
}

// Report filters
export interface ReportFilters {
  dateRange?: DateRange;
  appointmentType?: string[];
  appointmentStatus?: string[];
  staffType?: string[];
  patientArea?: string[];
  includeInactive?: boolean;
}

// Report configuration
export interface ReportConfig {
  title: string;
  description: string;
  refreshInterval?: number; // in milliseconds
  autoRefresh?: boolean;
  defaultDateRange?: DateRange;
  availableFilters?: string[];
}

// Dashboard layout configuration
export interface DashboardLayout {
  sections: DashboardSection[];
  layout: 'grid' | 'list' | 'custom';
  columns?: number;
}

export interface DashboardSection {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'list';
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number; w: number; h: number };
  config: any;
  data?: any;
}

// CSV export data structure
export interface CSVExportData {
  headers: string[];
  rows: Array<Record<string, any>>;
  metadata?: {
    exportedAt: string;
    totalRows: number;
    filters?: ReportFilters;
  };
}

// Report generation request
export interface GenerateReportRequest {
  type: 'appointments' | 'patients' | 'staff' | 'statistics' | 'audit' | 'email';
  format: 'csv' | 'xlsx' | 'pdf';
  filters?: ReportFilters;
  dateRange?: DateRange;
  includeFields?: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Report generation response
export interface GenerateReportResponse {
  success: boolean;
  reportId?: string;
  downloadUrl?: string;
  filename?: string;
  expiresAt?: string;
  error?: string;
}

// Real-time update types
export interface DashboardUpdate {
  type: 'kpi' | 'chart' | 'table';
  sectionId: string;
  data: any;
  timestamp: string;
}

// Performance metrics
export interface PerformanceMetrics {
  pageLoadTime: number;
  dataFetchTime: number;
  renderTime: number;
  memoryUsage?: number;
  errorCount: number;
}

// Utility functions for reports
export function createKPI(
  id: string,
  title: string,
  value: number | string,
  options?: Partial<Omit<KPI, 'id' | 'title' | 'value'>>
): KPI {
  return {
    id,
    title,
    value,
    change: options?.change,
    changeType: options?.changeType,
    unit: options?.unit,
    description: options?.description,
    trend: options?.trend,
    icon: options?.icon,
  };
}

export function calculateChangePercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

export function getChangeType(change: number): 'positive' | 'negative' | 'neutral' {
  if (change > 0) return 'positive';
  if (change < 0) return 'negative';
  return 'neutral';
}

export function formatKPIValue(value: number | string, unit?: string): string {
  if (typeof value === 'string') return value;
  
  if (unit === 'percentage') {
    return `${value}%`;
  }
  
  if (unit === 'currency') {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(value);
  }
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toString();
}

export function createDateRange(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function validateDateRange(dateRange: DateRange): boolean {
  const from = new Date(dateRange.from);
  const to = new Date(dateRange.to);
  
  return from <= to && !isNaN(from.getTime()) && !isNaN(to.getTime());
}
