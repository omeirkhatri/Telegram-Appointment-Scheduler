import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { supabase } from '@/lib/supabase';
import type { UpdateLeadNote } from '@/types/lead';
import { MockLeadDetailService } from '@/services/mockLeadDetailService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

// PUT /api/leads/[id]/notes/[noteId] - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const { id: leadId, noteId } = params;
    const body = await request.json();

    if (!leadId || !noteId) {
      return apiErrorHandler.handleValidationError([
        { field: 'id', message: 'Lead ID is required' },
        { field: 'noteId', message: 'Note ID is required' }
      ]);
    }

    // Validate required fields
    const { user_id, user_name } = body;

    if (!user_id || !user_name) {
      return apiErrorHandler.handleValidationError([
        { field: 'user_id', message: 'User ID is required' },
        { field: 'user_name', message: 'User name is required' }
      ]);
    }

    const updateData: UpdateLeadNote = {};

    if (body.note !== undefined) {
      if (!body.note?.trim()) {
        return apiErrorHandler.handleValidationError([
          { field: 'note', message: 'Note content is required' }
        ]);
      }
      updateData.note = body.note.trim();
    }

    if (body.is_pinned !== undefined) {
      updateData.is_pinned = body.is_pinned;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(leadId);

    if (!isUuid) {
      const updatedNote = await MockLeadDetailService.updateNote(leadId, noteId, {
        ...updateData,
        user_id,
        user_name,
      });

      return NextResponse.json({
        success: true,
        data: updatedNote,
        message: 'Note updated successfully'
      });
    }

    const { data: updatedNote, error } = await supabase
      .from('lead_notes')
      .update(updateData)
      .eq('id', noteId)
      .eq('lead_id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead note:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to update lead note',
        error.message
      );
    }

    if (!updatedNote) {
      return apiErrorHandler.handleNotFoundError('Note not found');
    }

    // Create an activity record for the note update
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        user_id,
        user_name,
        activity_type: 'field_updated',
        description: `Updated a note${body.note ? ': "' + body.note.trim().substring(0, 50) + (body.note.trim().length > 50 ? '...' : '') + '"' : ''}`,
        metadata: { note_id: noteId, updated_fields: Object.keys(updateData) }
      });

    return NextResponse.json({
      success: true,
      data: updatedNote,
      message: 'Note updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/leads/[id]/notes/[noteId]:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to update lead note',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// DELETE /api/leads/[id]/notes/[noteId] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const { id: leadId, noteId } = params;
    const body = await request.json();

    if (!leadId || !noteId) {
      return apiErrorHandler.handleValidationError([
        { field: 'id', message: 'Lead ID is required' },
        { field: 'noteId', message: 'Note ID is required' }
      ]);
    }

    // Validate required fields
    const { user_id, user_name } = body;

    if (!user_id || !user_name) {
      return apiErrorHandler.handleValidationError([
        { field: 'user_id', message: 'User ID is required' },
        { field: 'user_name', message: 'User name is required' }
      ]);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(leadId);

    if (!isUuid) {
      await MockLeadDetailService.deleteNote(leadId, noteId, user_id, user_name);
      return NextResponse.json({
        success: true,
        message: 'Note deleted successfully'
      });
    }

    // Get the note before deleting for activity log
    const { data: noteToDelete } = await supabase
      .from('lead_notes')
      .select('note')
      .eq('id', noteId)
      .eq('lead_id', leadId)
      .single();

    const { error } = await supabase
      .from('lead_notes')
      .delete()
      .eq('id', noteId)
      .eq('lead_id', leadId);

    if (error) {
      console.error('Error deleting lead note:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to delete lead note',
        error.message
      );
    }

    // Create an activity record for the note deletion
    if (noteToDelete) {
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          user_id,
          user_name,
          activity_type: 'field_updated',
          description: `Deleted a note: "${noteToDelete.note.substring(0, 50)}${noteToDelete.note.length > 50 ? '...' : ''}"`,
          metadata: { note_id: noteId, action: 'deleted' }
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/leads/[id]/notes/[noteId]:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to delete lead note',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
