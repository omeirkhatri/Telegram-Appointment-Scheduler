import { isDriverAssignmentOverhaulEnabled } from '@/lib/featureFlags';
import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if feature is enabled
    if (!isDriverAssignmentOverhaulEnabled()) {
      return NextResponse.json({ count: 0 });
    }

    const supabase = createServerClient();

    // Get count of unassigned segments
    const { count, error } = await supabase
      .from('transportation_segments')
      .select('id', { count: 'exact' })
      .is('driver_id', null)
      .in('status', ['draft', 'scheduled'])
      .gte('planned_start', new Date().toISOString());

    if (error) {
      console.error('Error fetching unassigned segments count:', error);
      return NextResponse.json(
        { error: 'Failed to fetch unassigned count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in unassigned-count API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
