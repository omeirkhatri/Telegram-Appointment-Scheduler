import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { GoogleSheetsLeadService } from '@/services/googleSheetsLeadService';
import { UserService } from '@/services/userService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await UserService.getCurrentUser();

    // Check if user has permission to view sync status (admin only)
    const canView = await UserService.checkPermission(currentUser.id, 'sync_google_sheets');
    if (!canView) {
      return apiErrorHandler.handleAuthorizationError('Only administrators can view sync status');
    }

    // Get last sync status
    const lastSync = await GoogleSheetsLeadService.getLastSyncStatus();

    return NextResponse.json({
      success: true,
      data: lastSync,
    });

  } catch (error) {
    console.error('Error fetching sync status:', error);

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return apiErrorHandler.handleAuthenticationError('User not authenticated');
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to fetch sync status',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}



