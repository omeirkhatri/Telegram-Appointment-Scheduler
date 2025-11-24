import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { assignLeadSchema } from '@/lib/validations/lead';
import { LeadService } from '@/services/leadService';
import { UserService } from '@/services/userService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const currentUser = await UserService.getCurrentUser();

    // Parse request body
    const body = await request.json();

    // Validate assignment data
    const validatedData = assignLeadSchema.parse(body);

    // Verify the assignee exists
    const assignee = await UserService.getUserById(validatedData.assigned_to_user_id);

    // Assign lead
    const lead = await LeadService.assignLead(
      params.id,
      validatedData.assigned_to_user_id,
      currentUser.id,
      validatedData.reason
    );

    return NextResponse.json({
      success: true,
      data: lead,
      message: `Lead assigned to ${assignee.full_name} successfully`,
    });

  } catch (error) {
    console.error('Error assigning lead:', error);

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return apiErrorHandler.handleAuthenticationError('User not authenticated');
      }
      if (error.message.includes('validation')) {
        return apiErrorHandler.handleValidationError([
          { field: 'assignment_data', message: error.message }
        ]);
      }
      if (error.message.includes('Failed to get user')) {
        return apiErrorHandler.handleNotFoundError('Assignee not found');
      }
      if (error.message.includes('Failed to get lead') || error.message.includes('Failed to assign lead')) {
        return apiErrorHandler.handleNotFoundError('Lead not found');
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to assign lead',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}



