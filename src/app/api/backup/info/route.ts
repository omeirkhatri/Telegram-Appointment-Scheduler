import { backupService } from '@/services/backupService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/backup/info - Get backup information and statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeTableInfo = searchParams.get('includeTableInfo') === 'true';

    if (includeTableInfo) {
      // Get detailed table information
      const tableInfo = await backupService.getTableInfo();
      const statistics = await backupService.getBackupStatistics();

      return NextResponse.json({
        success: true,
        data: {
          statistics,
          tableInfo
        }
      });
    } else {
      // Get basic statistics only
      const statistics = await backupService.getBackupStatistics();

      return NextResponse.json({
        success: true,
        data: {
          statistics
        }
      });
    }

  } catch (error) {
    console.error('Error getting backup info:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get backup information'
      },
      { status: 500 }
    );
  }
}
