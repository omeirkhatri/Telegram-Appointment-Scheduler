import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { GoogleSheetsLeadService } from '@/services/googleSheetsLeadService';
import { UserService } from '@/services/userService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await UserService.getCurrentUser();

    // Check if user has permission to sync Google Sheets (admin only)
    const canSync = await UserService.checkPermission(currentUser.id, 'sync_google_sheets');
    if (!canSync) {
      return apiErrorHandler.handleAuthorizationError('Only administrators can sync Google Sheets');
    }

    // Trigger sync
    const result = await GoogleSheetsLeadService.syncLeadsFromGoogleSheets();

    return NextResponse.json({
      success: true,
      data: result,
      message: `Sync completed. ${result.newLeads} new leads created.`,
    });

  } catch (error) {
    console.error('Error syncing Google Sheets:', error);

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return apiErrorHandler.handleAuthenticationError('User not authenticated');
      }
      if (error.message.includes('Failed to initialize Google Sheets API')) {
        return apiErrorHandler.handleInternalServerError(
          'Google Sheets API not configured',
          'Please check your Google Sheets credentials configuration'
        );
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to sync Google Sheets',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}



