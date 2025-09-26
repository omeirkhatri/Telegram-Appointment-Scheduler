import { supabase } from '@/lib/supabase';
import { transportationSegmentService } from '@/services/transportationSegmentService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments/export - Export transportation segment data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const format = searchParams.get('format') || 'csv';
    const includeFields = searchParams.get('include_fields')?.split(',') || [];
    const filters = {
      segmentType: searchParams.get('segment_type'),
      status: searchParams.get('status'),
      driverId: searchParams.get('driver_id'),
    };

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

    // Get segments with filters
    const segments = await transportationSegmentService.getSegmentsByDateRange(dateFrom, dateTo);

    // Apply additional filters
    let filteredSegments = segments;

    if (filters.segmentType) {
      filteredSegments = filteredSegments.filter(s => s.segment_type === filters.segmentType);
    }

    if (filters.status) {
      filteredSegments = filteredSegments.filter(s => s.status === filters.status);
    }

    if (filters.driverId) {
      filteredSegments = filteredSegments.filter(s => s.driver_id === filters.driverId);
    }

    // Get additional data for export
    const exportData = await enrichSegmentData(filteredSegments);

    // Generate export based on format
    let exportContent: string;
    let contentType: string;
    let filename: string;

    switch (format.toLowerCase()) {
      case 'csv':
        exportContent = generateCSV(exportData, includeFields);
        contentType = 'text/csv';
        filename = `transportation-segments-${dateFrom}-to-${dateTo}.csv`;
        break;
      case 'json':
        exportContent = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        filename = `transportation-segments-${dateFrom}-to-${dateTo}.json`;
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Unsupported format. Supported formats: csv, json',
          },
          { status: 400 }
        );
    }

    return new NextResponse(exportContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error exporting transportation segment data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data',
      },
      { status: 500 }
    );
  }
}

// Enrich segment data with additional information
async function enrichSegmentData(segments: any[]) {
  const enrichedSegments = [];

  for (const segment of segments) {
    // Get appointment details
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        patient:patients(id, name, phone, area, city)
      `)
      .eq('id', segment.appointment_id)
      .single();

    // Get driver details
    let driverDetails = null;
    if (segment.driver_id) {
      const { data: driver } = await supabase
        .from('staff')
        .select('id, first_name, last_name, phone, email')
        .eq('id', segment.driver_id)
        .single();
      driverDetails = driver;
    }

    // Get override history
    const { data: overrides } = await supabase
      .from('transportation_segment_override_audit')
      .select('*')
      .eq('segment_id', segment.id)
      .order('created_at', { ascending: false });

    enrichedSegments.push({
      // Basic segment information
      segment_id: segment.id,
      segment_title: segment.title,
      segment_type: segment.segment_type,
      status: segment.status,
      planned_start: segment.planned_start,
      planned_end: segment.planned_end,
      travel_mode: segment.travel_mode,
      estimated_travel_minutes: segment.estimated_travel_minutes,
      estimated_distance_km: segment.estimated_distance_km,
      buffer_minutes: segment.buffer_minutes,
      instructions: segment.instructions,
      requires_follow_up: segment.requires_follow_up,
      manual_override: segment.manual_override,
      created_at: segment.created_at,
      updated_at: segment.updated_at,

      // Driver information
      driver_id: segment.driver_id,
      driver_name: driverDetails ? `${driverDetails.first_name} ${driverDetails.last_name}` : null,
      driver_phone: driverDetails?.phone,
      driver_email: driverDetails?.email,

      // Appointment information
      appointment_id: segment.appointment_id,
      appointment_date: appointment?.appointment_date,
      appointment_time: appointment?.appointment_time,
      patient_name: appointment?.patient?.name,
      patient_phone: appointment?.patient?.phone,
      patient_area: appointment?.patient?.area,
      patient_city: appointment?.patient?.city,

      // Location information
      origin_address: segment.origin?.address,
      origin_lat: segment.origin?.lat,
      origin_lng: segment.origin?.lng,
      destination_address: segment.destination?.address,
      destination_lat: segment.destination?.lat,
      destination_lng: segment.destination?.lng,

      // Override information
      override_count: overrides?.length || 0,
      last_override_date: overrides?.[0]?.created_at,
      last_override_reason: overrides?.[0]?.override_reason,
      last_override_user: overrides?.[0]?.user_name,
    });
  }

  return enrichedSegments;
}

// Generate CSV content
function generateCSV(data: any[], includeFields: string[]): string {
  if (data.length === 0) {
    return 'No data available';
  }

  // Get all possible fields
  const allFields = Object.keys(data[0]);

  // Filter fields if specified
  const fieldsToInclude = includeFields.length > 0
    ? allFields.filter(field => includeFields.includes(field))
    : allFields;

  // Create header row
  const headers = fieldsToInclude.map(field =>
    field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );

  // Create data rows
  const rows = data.map(item =>
    fieldsToInclude.map(field => {
      const value = item[field];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    })
  );

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  return csvContent;
}
