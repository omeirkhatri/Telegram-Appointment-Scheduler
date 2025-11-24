import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { updateLeadStageSchema } from '@/lib/validations/lead';
import { MockLeadService } from '@/services/mockLeadService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Remove this mock when authentication is implemented
    const mockUser = { id: 'mock-user', role: 'admin' as const };

    // Parse request body
    const body = await request.json();

    // Validate stage update data
    const validatedData = updateLeadStageSchema.parse(body);

    // Update lead stage (using mock service for now)
    const lead = await MockLeadService.updateLeadStage(
      params.id,
      validatedData.stage,
      mockUser.id,
      validatedData.reason
    );

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead stage updated successfully',
    });

  } catch (error) {
    console.error('Error updating lead stage:', error);

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return apiErrorHandler.handleAuthenticationError('User not authenticated');
      }
      if (error.message.includes('validation')) {
        return apiErrorHandler.handleValidationError([
          { field: 'stage_data', message: error.message }
        ]);
      }
      if (error.message.includes('Failed to get lead') || error.message.includes('Failed to update lead stage')) {
        return apiErrorHandler.handleNotFoundError('Lead not found');
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to update lead stage',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
