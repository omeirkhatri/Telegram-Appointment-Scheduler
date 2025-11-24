import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { userFiltersSchema } from '@/lib/validations/user';
import { UserService } from '@/services/userService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await UserService.getCurrentUser();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      role: searchParams.getAll('role'),
      is_active: searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
    };

    // Validate filters
    const validatedFilters = userFiltersSchema.parse(filters);

    // Get users
    const users = await UserService.getUsers(validatedFilters);

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    });

  } catch (error) {
    console.error('Error fetching users:', error);

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return apiErrorHandler.handleAuthenticationError('User not authenticated');
      }
      if (error.message.includes('validation')) {
        return apiErrorHandler.handleValidationError([
          { field: 'filters', message: error.message }
        ]);
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to fetch users',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}



