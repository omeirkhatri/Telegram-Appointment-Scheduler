import { driverRecommendationService } from '@/services/driverRecommendationService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segment_id');
    const includeMetadata = searchParams.get('includeMetadata') !== 'false';
    const maxRecommendationsParam = searchParams.get('max');
    const maxRecommendations = maxRecommendationsParam ? parseInt(maxRecommendationsParam, 10) : 3;

    if (!segmentId) {
      return NextResponse.json({ error: 'segment_id is required' }, { status: 400 });
    }

    const result = await driverRecommendationService.getDriverRecommendations({
      segmentId,
      includeMetadata,
      maxRecommendations,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('GET /api/recommendations failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}


