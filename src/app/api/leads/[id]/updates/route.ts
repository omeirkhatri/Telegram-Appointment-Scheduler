import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { MockLeadDetailService } from '@/services/mockLeadDetailService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    if (!leadId) {
      return apiErrorHandler.handleValidationError([
        { field: 'id', message: 'Lead ID is required' },
      ]);
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const hasNotesFlag = Object.prototype.hasOwnProperty.call(payload, 'notes');
    const hasQuotesFlag = Object.prototype.hasOwnProperty.call(payload, 'quotes');

    const markNotes =
      hasNotesFlag ? Boolean(payload.notes) : !hasQuotesFlag;
    const markQuotes =
      hasQuotesFlag ? Boolean(payload.quotes) : !hasNotesFlag;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(leadId);

    if (!isUuid) {
      if (!markNotes && !markQuotes) {
        const counts = MockLeadDetailService.getLeadCounts(leadId);
        return NextResponse.json({
          success: true,
          data: {
            new_notes_count: counts.newNotes,
            new_quotes_count: counts.newQuotes,
          },
          message: 'No updates were marked as read',
        });
      }

      MockLeadDetailService.markUpdatesAsRead(leadId, {
        notes: markNotes,
        quotes: markQuotes,
      });

      const counts = MockLeadDetailService.getLeadCounts(leadId);

      return NextResponse.json({
        success: true,
        data: {
          new_notes_count: counts.newNotes,
          new_quotes_count: counts.newQuotes,
        },
        message: 'Lead updates marked as read',
      });
    }

    // TODO: Implement Supabase-backed unread tracking when API is ready.
    return NextResponse.json({
      success: true,
      data: {
        new_notes_count: 0,
        new_quotes_count: 0,
      },
      message: 'Lead updates marked as read',
    });
  } catch (error) {
    console.error('Error marking lead updates as read:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to mark lead updates as read',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
