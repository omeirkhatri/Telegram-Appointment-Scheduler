import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { supabase } from '@/lib/supabase';
import type { CreateLeadActivity } from '@/types/lead';
import { MockLeadDetailService } from '@/services/mockLeadDetailService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

// GET /api/leads/[id]/activities - Get all activities for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    if (!leadId) {
      return apiErrorHandler.handleValidationError([
        { field: 'id', message: 'Lead ID is required' }
      ]);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(leadId);

    if (!isUuid) {
      const activities = await MockLeadDetailService.getActivities(leadId);
      return NextResponse.json({
        success: true,
        data: activities,
        count: activities.length,
      });
    }

    const { data: activities, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead activities:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to fetch lead activities',
        error.message
      );
    }

    return NextResponse.json({
      success: true,
      data: activities || [],
      count: activities?.length || 0,
    });

  } catch (error) {
    console.error('Error in GET /api/leads/[id]/activities:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to fetch lead activities',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// POST /api/leads/[id]/activities - Create a new activity for a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    if (!leadId) {
      return apiErrorHandler.handleValidationError([
        { field: 'id', message: 'Lead ID is required' }
      ]);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(leadId);

    // Validate required fields
    const { user_id, user_name, activity_type, description } = body;

    if (!user_id || !user_name || !activity_type || !description) {
      return apiErrorHandler.handleValidationError([
        { field: 'user_id', message: 'User ID is required' },
        { field: 'user_name', message: 'User name is required' },
        { field: 'activity_type', message: 'Activity type is required' },
        { field: 'description', message: 'Description is required' }
      ]);
    }

    const activityData: CreateLeadActivity = {
      lead_id: leadId,
      user_id,
      user_name,
      activity_type,
      description,
      old_value: body.old_value || null,
      new_value: body.new_value || null,
      metadata: body.metadata || {}
    };

    if (!isUuid) {
      const activity = await MockLeadDetailService.createActivity(leadId, activityData);
      return NextResponse.json({
        success: true,
        data: activity,
        message: 'Activity created successfully'
      });
    }

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert(activityData)
      .select()
      .single();

    if (error) {
      console.error('Error creating lead activity:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to create lead activity',
        error.message
      );
    }

    // Update lead's last_contacted_at if this is a contact-related activity
    if (['note_added', 'stage_changed', 'assigned'].includes(activity_type)) {
      await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', leadId);
    }

    return NextResponse.json({
      success: true,
      data: activity,
      message: 'Activity created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/leads/[id]/activities:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to create lead activity',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
