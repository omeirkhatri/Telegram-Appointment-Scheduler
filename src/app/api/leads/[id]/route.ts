import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { leadUpdateSchema } from '@/lib/validations/lead';
import { MockLeadService } from '@/services/mockLeadService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Remove this mock when authentication is implemented
    const mockUser = { id: 'mock-user', role: 'admin' as const };

    // Get lead by ID (using mock service for now)
    const lead = await MockLeadService.getLeadById(params.id);

    return NextResponse.json({
      success: true,
      data: lead,
    });

  } catch (error) {
    console.error('Error fetching lead:', error);

    if (error instanceof Error) {
      if (error.message.includes('Lead not found')) {
        return apiErrorHandler.handleNotFoundError('Lead not found');
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to fetch lead',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Remove this mock when authentication is implemented
    const mockUser = { id: 'mock-user', role: 'admin' as const };

    // Parse request body
    const body = await request.json();

    // Validate lead data
    const validatedData = leadUpdateSchema.parse(body);

    // Update lead (using mock service for now)
    const lead = await MockLeadService.updateLead(params.id, validatedData, mockUser.id);

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead updated successfully',
    });

  } catch (error) {
    console.error('Error updating lead:', error);

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return apiErrorHandler.handleAuthenticationError('User not authenticated');
      }
      if (error.message.includes('validation')) {
        return apiErrorHandler.handleValidationError([
          { field: 'lead_data', message: error.message }
        ]);
      }
      if (error.message.includes('Failed to get lead') || error.message.includes('Failed to update lead')) {
        return apiErrorHandler.handleNotFoundError('Lead not found');
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to update lead',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Remove this mock when authentication is implemented
    const mockUser = { id: 'mock-user', role: 'admin' as const };

    // Delete lead (using mock service for now)
    await MockLeadService.deleteLead(params.id);

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting lead:', error);

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return apiErrorHandler.handleAuthenticationError('User not authenticated');
      }
      if (error.message.includes('Failed to delete lead')) {
        return apiErrorHandler.handleNotFoundError('Lead not found');
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to delete lead',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
