import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createErrorResponse, 
  getApiVersionInfo,
  isVersionSupported
} from '@/lib/apiUtils';

// GET /api/version - Get API version information and capabilities
export async function GET(request: NextRequest) {
  try {
    const versionInfo = getApiVersionInfo();
    
    const response = createApiResponse(versionInfo, request);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching API version info:', error);
    const errorResponse = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch API version info',
      undefined,
      request
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// POST /api/version/check - Check if a specific version is supported
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { version } = body;

    if (!version) {
      const errorResponse = createErrorResponse(
        'Version parameter is required',
        undefined,
        request
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const isSupported = isVersionSupported(version);
    const versionInfo = getApiVersionInfo();

    const responseData = {
      version,
      supported: isSupported,
      currentVersion: versionInfo.version,
      supportedVersions: versionInfo.supportedVersions,
      timezoneSupport: versionInfo.timezoneSupport,
      features: versionInfo.features,
    };

    const response = createApiResponse(responseData, request);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking API version:', error);
    const errorResponse = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to check API version',
      undefined,
      request
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
