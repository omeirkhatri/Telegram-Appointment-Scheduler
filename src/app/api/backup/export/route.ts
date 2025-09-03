import { backupService } from '@/services/backupService';
import { NextRequest, NextResponse } from 'next/server';

export interface BackupExportRequest {
  type: 'all' | 'core' | 'system' | 'table';
  tableName?: string;
  format: 'csv' | 'json';
  dateRange?: {
    from: string;
    to: string;
  };
  includeMetadata?: boolean;
}

// POST /api/backup/export - Export database data
export async function POST(request: NextRequest) {
  try {
    const body: BackupExportRequest = await request.json();
    const { type, tableName, format, dateRange, includeMetadata = true } = body;

    // Validate request
    if (!type || !format) {
      return NextResponse.json(
        {
          success: false,
          error: 'Export type and format are required',
        },
        { status: 400 },
      );
    }

    if (type === 'table' && !tableName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Table name is required for table export',
        },
        { status: 400 },
      );
    }

    // Perform export based on type
    let result;
    switch (type) {
      case 'all':
        result = await backupService.exportAllData({
          format,
          dateRange,
          includeMetadata,
        });
        break;
      case 'core':
        result = await backupService.exportCoreData({
          format,
          dateRange,
          includeMetadata,
        });
        break;
      case 'system':
        result = await backupService.exportSystemData({
          format,
          dateRange,
          includeMetadata,
        });
        break;
      case 'table':
        result = await backupService.exportTable(tableName!, {
          format,
          dateRange,
          includeMetadata,
        });
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported export type: ${type}`,
          },
          { status: 400 },
        );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Export failed',
        },
        { status: 500 },
      );
    }

    // Return file download response
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-cache',
        'X-Backup-Metadata': JSON.stringify(result.metadata),
      },
    });

  } catch (error) {
    console.error('Error in backup export:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export backup',
      },
      { status: 500 },
    );
  }
}
