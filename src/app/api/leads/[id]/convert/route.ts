import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { convertLeadSchema } from '@/lib/validations/lead';
import { LeadService } from '@/services/leadService';
import { UserService } from '@/services/userService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const currentUser = await UserService.getCurrentUser();

    // Check if user has permission to convert leads
    const canConvert = await UserService.checkPermission(currentUser.id, 'convert_leads');
    if (!canConvert) {
      return apiErrorHandler.handleAuthorizationError('You do not have permission to convert leads');
    }

    // Parse request body
    const body = await request.json();

    // Validate conversion data
    const validatedData = convertLeadSchema.parse(body);

    // Convert lead to patient
    const result = await LeadService.convertLeadToPatient(
      params.id,
      currentUser.id,
      validatedData.patient_data
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Lead converted to patient successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Error converting lead:', error);

    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return apiErrorHandler.handleAuthenticationError('User not authenticated');
      }
      if (error.message.includes('validation')) {
        return apiErrorHandler.handleValidationError([
          { field: 'conversion_data', message: error.message }
        ]);
      }
      if (error.message.includes('Failed to get lead')) {
        return apiErrorHandler.handleNotFoundError('Lead not found');
      }
      if (error.message.includes('Failed to create patient')) {
        return apiErrorHandler.handleInternalServerError(
          'Failed to create patient',
          error.message
        );
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to convert lead',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}



