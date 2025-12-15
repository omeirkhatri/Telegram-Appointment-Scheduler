import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { UserService } from '@/services/userService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function GET(request: NextRequest) {
  try {
    // Get current user profile
    const user = await UserService.getCurrentUser();

    return NextResponse.json({
      success: true,
      data: user,
    });

  } catch (error) {
    console.error('Error fetching current user:', error);

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return apiErrorHandler.handleAuthenticationError('User not authenticated');
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to fetch user profile',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}



