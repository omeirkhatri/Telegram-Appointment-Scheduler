import { appointmentService, auditTrailService, emailDeliveryService } from '@/services';
import { supabase } from '@/lib/supabase';
import type { GenerateReportRequest, CSVExportData, ReportFilters } from '@/types/reports';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/reports/export - Generate and export reports
export async function POST(request: NextRequest) {
  try {
    const body: GenerateReportRequest = await request.json();
    
    const { type, format, filters, dateRange, includeFields, groupBy, sortBy, sortOrder } = body;
    
    // Validate request
    if (!type || !format) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report type and format are required'
        },
        { status: 400 }
      );
    }
    
    // Generate report data based on type
    let exportData: CSVExportData;
    
    switch (type) {
      case 'appointments':
        exportData = await generateAppointmentsReport(filters, dateRange, includeFields, sortBy, sortOrder);
        break;
      case 'patients':
        exportData = await generatePatientsReport(filters, dateRange, includeFields, sortBy, sortOrder);
        break;
      case 'staff':
        exportData = await generateStaffReport(filters, dateRange, includeFields, sortBy, sortOrder);
        break;
      case 'statistics':
        exportData = await generateStatisticsReport(filters, dateRange, includeFields);
        break;
      case 'audit':
        exportData = await generateAuditReport(filters, dateRange, includeFields, sortBy, sortOrder);
        break;
      case 'email':
        exportData = await generateEmailReport(filters, dateRange, includeFields, sortBy, sortOrder);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported report type: ${type}`
          },
          { status: 400 }
        );
    }
    
    // Convert to CSV format
    const csvContent = convertToCSV(exportData);
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${type}_report_${timestamp}.csv`;
    
    // Return CSV content as downloadable response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report'
      },
      { status: 500 }
    );
  }
}

async function generateAppointmentsReport(
  filters?: ReportFilters,
  dateRange?: { from: string; to: string },
  includeFields?: string[],
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<CSVExportData> {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patients(name, phone, area, city),
      appointment_staff(
        staff_id,
        staff(first_name, last_name, staff_type)
      )
    `);
  
  // Apply date range filter
  if (dateRange) {
    query = query
      .gte('appointment_date', dateRange.from)
      .lte('appointment_date', dateRange.to);
  }
  
  // Apply status filter
  if (filters?.appointmentStatus && filters.appointmentStatus.length > 0) {
    query = query.in('status', filters.appointmentStatus);
  }
  
  // Apply type filter
  if (filters?.appointmentType && filters.appointmentType.length > 0) {
    query = query.in('appointment_type', filters.appointmentType);
  }
  
  // Apply sorting
  if (sortBy) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  } else {
    query = query.order('appointment_date', { ascending: false });
  }
  
  const { data: appointments, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch appointments: ${error.message}`);
  }
  
  // Define default headers
  const defaultHeaders = [
    'ID',
    'Date',
    'Start Time',
    'Duration (min)',
    'Type',
    'Status',
    'Patient Name',
    'Patient Phone',
    'Patient Area',
    'Patient City',
    'Assigned Staff',
    'Transportation Type',
    'Transportation Method',
    'Notes',
    'Created At',
    'Updated At'
  ];
  
  const headers = includeFields ? includeFields : defaultHeaders;
  
  // Convert appointments to CSV rows
  const rows = (appointments || []).map(appointment => {
    const patient = appointment.patients;
    const staff = appointment.appointment_staff?.map((as: any) => 
      `${as.staff?.first_name} ${as.staff?.last_name} (${as.staff?.staff_type})`
    ).join(', ') || '';
    
    const row: Record<string, any> = {
      'ID': appointment.id,
      'Date': appointment.appointment_date,
      'Start Time': appointment.start_time,
      'Duration (min)': appointment.duration_minutes,
      'Type': appointment.appointment_type,
      'Status': appointment.status,
      'Patient Name': patient?.name || '',
      'Patient Phone': patient?.phone || '',
      'Patient Area': patient?.area || '',
      'Patient City': patient?.city || '',
      'Assigned Staff': staff,
      'Transportation Type': appointment.transportation_type || '',
      'Transportation Method': appointment.transportation_method || '',
      'Notes': appointment.notes || '',
      'Created At': appointment.created_at,
      'Updated At': appointment.updated_at
    };
    
    // Filter to only include requested fields
    if (includeFields) {
      const filteredRow: Record<string, any> = {};
      includeFields.forEach(field => {
        filteredRow[field] = row[field] || '';
      });
      return filteredRow;
    }
    
    return row;
  });
  
  return {
    headers,
    rows,
    metadata: {
      exportedAt: new Date().toISOString(),
      totalRows: rows.length,
      filters
    }
  };
}

async function generatePatientsReport(
  filters?: ReportFilters,
  dateRange?: { from: string; to: string },
  includeFields?: string[],
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<CSVExportData> {
  let query = supabase.from('patients').select('*');
  
  // Apply date range filter (on creation date)
  if (dateRange) {
    query = query
      .gte('created_at', `${dateRange.from}T00:00:00Z`)
      .lte('created_at', `${dateRange.to}T23:59:59Z`);
  }
  
  // Apply area filter
  if (filters?.patientArea && filters.patientArea.length > 0) {
    query = query.in('area', filters.patientArea);
  }
  
  // Apply sorting
  if (sortBy) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }
  
  const { data: patients, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch patients: ${error.message}`);
  }
  
  const defaultHeaders = [
    'ID',
    'Name',
    'Phone',
    'Flat/Villa No',
    'Building/Street',
    'Area',
    'City',
    'Emergency Contact',
    'Preferred Transport',
    'Medical Notes',
    'Created At',
    'Updated At'
  ];
  
  const headers = includeFields ? includeFields : defaultHeaders;
  
  const rows = (patients || []).map(patient => {
    const row: Record<string, any> = {
      'ID': patient.id,
      'Name': patient.name,
      'Phone': patient.phone,
      'Flat/Villa No': patient.flat_villa_no,
      'Building/Street': patient.building_street,
      'Area': patient.area,
      'City': patient.city,
      'Emergency Contact': patient.emergency_contact || '',
      'Preferred Transport': patient.preferred_transport || '',
      'Medical Notes': patient.medical_notes || '',
      'Created At': patient.created_at,
      'Updated At': patient.updated_at
    };
    
    if (includeFields) {
      const filteredRow: Record<string, any> = {};
      includeFields.forEach(field => {
        filteredRow[field] = row[field] || '';
      });
      return filteredRow;
    }
    
    return row;
  });
  
  return {
    headers,
    rows,
    metadata: {
      exportedAt: new Date().toISOString(),
      totalRows: rows.length,
      filters
    }
  };
}

async function generateStaffReport(
  filters?: ReportFilters,
  dateRange?: { from: string; to: string },
  includeFields?: string[],
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<CSVExportData> {
  let query = supabase.from('staff').select('*');
  
  // Apply date range filter (on creation date)
  if (dateRange) {
    query = query
      .gte('created_at', `${dateRange.from}T00:00:00Z`)
      .lte('created_at', `${dateRange.to}T23:59:59Z`);
  }
  
  // Apply staff type filter
  if (filters?.staffType && filters.staffType.length > 0) {
    query = query.in('staff_type', filters.staffType);
  }
  
  // Apply status filter
  if (!filters?.includeInactive) {
    query = query.eq('status', 'active');
  }
  
  // Apply sorting
  if (sortBy) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }
  
  const { data: staff, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch staff: ${error.message}`);
  }
  
  const defaultHeaders = [
    'ID',
    'First Name',
    'Last Name',
    'Staff Type',
    'Specialization',
    'Phone',
    'Email',
    'Available Days',
    'Working Hours Start',
    'Working Hours End',
    'Status',
    'Email Notifications Enabled',
    'Created At',
    'Updated At'
  ];
  
  const headers = includeFields ? includeFields : defaultHeaders;
  
  const rows = (staff || []).map(member => {
    const row: Record<string, any> = {
      'ID': member.id,
      'First Name': member.first_name,
      'Last Name': member.last_name,
      'Staff Type': member.staff_type,
      'Specialization': member.specialization || '',
      'Phone': member.phone,
      'Email': member.email,
      'Available Days': member.available_days?.join(', ') || '',
      'Working Hours Start': member.working_hours_start,
      'Working Hours End': member.working_hours_end,
      'Status': member.status,
      'Email Notifications Enabled': member.email_notifications_enabled ? 'Yes' : 'No',
      'Created At': member.created_at,
      'Updated At': member.updated_at
    };
    
    if (includeFields) {
      const filteredRow: Record<string, any> = {};
      includeFields.forEach(field => {
        filteredRow[field] = row[field] || '';
      });
      return filteredRow;
    }
    
    return row;
  });
  
  return {
    headers,
    rows,
    metadata: {
      exportedAt: new Date().toISOString(),
      totalRows: rows.length,
      filters
    }
  };
}

async function generateStatisticsReport(
  filters?: ReportFilters,
  dateRange?: { from: string; to: string }
): Promise<CSVExportData> {
  // This would generate a summary statistics report
  const headers = [
    'Metric',
    'Value',
    'Period',
    'Generated At'
  ];
  
  const rows = [
    {
      'Metric': 'Total Appointments',
      'Value': '0', // Would be calculated from actual data
      'Period': dateRange ? `${dateRange.from} to ${dateRange.to}` : 'All time',
      'Generated At': new Date().toISOString()
    }
    // More statistics would be added here
  ];
  
  return {
    headers,
    rows,
    metadata: {
      exportedAt: new Date().toISOString(),
      totalRows: rows.length,
      filters
    }
  };
}

async function generateAuditReport(
  filters?: ReportFilters,
  dateRange?: { from: string; to: string },
  includeFields?: string[],
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<CSVExportData> {
  const result = await auditTrailService.getAuditStatistics({
    start_date: dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: dateRange?.to || new Date().toISOString().split('T')[0]
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to get audit statistics');
  }
  
  const defaultHeaders = [
    'Date',
    'Operation Type',
    'Total Operations',
    'Successful Operations',
    'Failed Operations',
    'Partially Completed Operations',
    'Total Appointments Created',
    'Total Conflicts',
    'Total Errors',
    'Average Operation Duration (ms)',
    'Success Rate (%)',
    'Created At',
    'Updated At'
  ];
  
  const headers = includeFields ? includeFields : defaultHeaders;
  
  const rows = result.data.statistics.map(stat => {
    const row: Record<string, any> = {
      'Date': stat.date,
      'Operation Type': stat.operation_type,
      'Total Operations': stat.total_operations,
      'Successful Operations': stat.successful_operations,
      'Failed Operations': stat.failed_operations,
      'Partially Completed Operations': stat.partially_completed_operations,
      'Total Appointments Created': stat.total_appointments_created,
      'Total Conflicts': stat.total_conflicts,
      'Total Errors': stat.total_errors,
      'Average Operation Duration (ms)': stat.average_operation_duration_ms,
      'Success Rate (%)': stat.success_rate,
      'Created At': stat.created_at,
      'Updated At': stat.updated_at
    };
    
    if (includeFields) {
      const filteredRow: Record<string, any> = {};
      includeFields.forEach(field => {
        filteredRow[field] = row[field] || '';
      });
      return filteredRow;
    }
    
    return row;
  });
  
  return {
    headers,
    rows,
    metadata: {
      exportedAt: new Date().toISOString(),
      totalRows: rows.length,
      filters
    }
  };
}

async function generateEmailReport(
  filters?: ReportFilters,
  dateRange?: { from: string; to: string },
  includeFields?: string[],
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<CSVExportData> {
  const stats = await emailDeliveryService.getDeliveryStatistics({
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to
  });
  
  const defaultHeaders = [
    'Date',
    'Email Type',
    'Total Emails',
    'Successful Deliveries',
    'Failed Deliveries',
    'Pending Deliveries',
    'Success Rate (%)',
    'Average Delivery Time (ms)',
    'Total Retries',
    'Created At',
    'Updated At'
  ];
  
  const headers = includeFields ? includeFields : defaultHeaders;
  
  const rows = stats.map(stat => {
    const row: Record<string, any> = {
      'Date': stat.date,
      'Email Type': stat.emailType,
      'Total Emails': stat.totalEmails,
      'Successful Deliveries': stat.successfulDeliveries,
      'Failed Deliveries': stat.failedDeliveries,
      'Pending Deliveries': stat.pendingDeliveries,
      'Success Rate (%)': stat.successRate,
      'Average Delivery Time (ms)': stat.averageDeliveryTimeMs,
      'Total Retries': stat.totalRetries,
      'Created At': stat.createdAt,
      'Updated At': stat.updatedAt
    };
    
    if (includeFields) {
      const filteredRow: Record<string, any> = {};
      includeFields.forEach(field => {
        filteredRow[field] = row[field] || '';
      });
      return filteredRow;
    }
    
    return row;
  });
  
  return {
    headers,
    rows,
    metadata: {
      exportedAt: new Date().toISOString(),
      totalRows: rows.length,
      filters
    }
  };
}

function convertToCSV(data: CSVExportData): string {
  const { headers, rows, metadata } = data;
  
  // Create CSV content
  let csvContent = '';
  
  // Add headers
  csvContent += headers.join(',') + '\n';
  
  // Add rows
  rows.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csvContent += values.join(',') + '\n';
  });
  
  // Add metadata as comments (optional)
  if (metadata) {
    csvContent += '\n# Metadata\n';
    csvContent += `# Exported At: ${metadata.exportedAt}\n`;
    csvContent += `# Total Rows: ${metadata.totalRows}\n`;
    if (metadata.filters) {
      csvContent += `# Filters: ${JSON.stringify(metadata.filters)}\n`;
    }
  }
  
  return csvContent;
}
