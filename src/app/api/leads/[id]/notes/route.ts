import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { supabase } from '@/lib/supabase';
import type { CreateLeadNote } from '@/types/lead';
import { MockLeadDetailService } from '@/services/mockLeadDetailService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

// GET /api/leads/[id]/notes - Get all notes for a lead
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
      const notes = await MockLeadDetailService.getNotes(leadId);
      return NextResponse.json({
        success: true,
        data: notes,
        count: notes.length,
      });
    }

    const { data: notes, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead notes:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to fetch lead notes',
        error.message
      );
    }

    return NextResponse.json({
      success: true,
      data: notes || [],
      count: notes?.length || 0,
    });

  } catch (error) {
    console.error('Error in GET /api/leads/[id]/notes:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to fetch lead notes',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// POST /api/leads/[id]/notes - Create a new note for a lead
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
    const { user_id, user_name, note } = body;

    if (!user_id || !user_name || !note?.trim()) {
      return apiErrorHandler.handleValidationError([
        { field: 'user_id', message: 'User ID is required' },
        { field: 'user_name', message: 'User name is required' },
        { field: 'note', message: 'Note content is required' }
      ]);
    }

    const noteData: CreateLeadNote = {
      lead_id: leadId,
      user_id,
      user_name,
      note: note.trim(),
      is_pinned: body.is_pinned || false,
    };

    if (!isUuid) {
      const newNote = await MockLeadDetailService.createNote(leadId, noteData);
      return NextResponse.json({
        success: true,
        data: newNote,
        message: 'Note created successfully'
      });
    }

    const { data: newNote, error } = await supabase
      .from('lead_notes')
      .insert(noteData)
      .select()
      .single();

    if (error) {
      console.error('Error creating lead note:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to create lead note',
        error.message
      );
    }

    // Create an activity record for the note
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        user_id,
        user_name,
        activity_type: 'note_added',
        description: `Added a note: "${note.trim().substring(0, 50)}${note.trim().length > 50 ? '...' : ''}"`,
        metadata: { note_id: newNote.id }
      });

    // Update lead's last_contacted_at
    await supabase
      .from('leads')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', leadId);

    return NextResponse.json({
      success: true,
      data: newNote,
      message: 'Note created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/leads/[id]/notes:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to create lead note',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
