import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { leadFiltersSchema, leadFormSchema } from '@/lib/validations/lead';
import { MockLeadService } from '@/services/mockLeadService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function GET(request: NextRequest) {
  try {
    // TODO: Remove this mock when authentication is implemented
    const mockUser = { id: 'mock-user', role: 'admin' as const };

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      stage: searchParams.getAll('stage'),
      status: searchParams.getAll('status'),
      assigned_to_user_id: searchParams.get('assigned_to_user_id') || undefined,
      search: searchParams.get('search') || undefined,
      created_after: searchParams.get('created_after') || undefined,
      created_before: searchParams.get('created_before') || undefined,
      source: searchParams.get('source') || undefined,
    };

    // Validate filters
    const validatedFilters = leadFiltersSchema.parse(filters);

    // Get leads (using mock service for now)
    const leads = await MockLeadService.getLeads(validatedFilters);

    return NextResponse.json({
      success: true,
      data: leads,
      count: leads.length,
    });

  } catch (error) {
    console.error('Error fetching leads:', error);

    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        return apiErrorHandler.handleValidationError([
          { field: 'filters', message: error.message }
        ]);
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to fetch leads',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Remove this mock when authentication is implemented
    const mockUser = { id: 'mock-user', role: 'admin' as const };

    // Parse request body
    const body = await request.json();

    // Validate lead data
    const validatedData = leadFormSchema.parse(body);

    // Create lead (using mock service for now)
    const lead = await MockLeadService.createLead(validatedData, mockUser.id);

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating lead:', error);

    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        return apiErrorHandler.handleValidationError([
          { field: 'lead_data', message: error.message }
        ]);
      }
    }

    return apiErrorHandler.handleInternalServerError(
      'Failed to create lead',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
