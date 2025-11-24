import { isDriverAssignmentOverhaulAssistiveEngineEnabled } from '@/lib/featureFlags';
import { driverRecommendationService } from '@/services/driverRecommendationService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments/recommendations - Get driver recommendations for a segment
export async function GET(request: NextRequest) {
  try {
    // Check if assistive engine is enabled
    if (!isDriverAssignmentOverhaulAssistiveEngineEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver recommendation API is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE is not enabled.',
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');
    const maxRecommendations = searchParams.get('maxRecommendations') ? parseInt(searchParams.get('maxRecommendations')!) : 5;
    const includeMetadata = searchParams.get('includeMetadata') === 'true';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!segmentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'segmentId parameter is required',
        },
        { status: 400 },
      );
    }

    const result = await driverRecommendationService.getRecommendations({
      segmentId,
      maxRecommendations,
      includeMetadata,
      forceRefresh,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching driver recommendations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch driver recommendations',
      },
      { status: 500 },
    );
  }
}

