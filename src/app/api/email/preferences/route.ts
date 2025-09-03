import { NextRequest, NextResponse } from 'next/server';
import { emailPreferencesService } from '@/services/emailPreferencesService';
import { GlobalEmailPreferences } from '@/types/emailPreferences';

// GET /api/email/preferences - Get global email preferences
export async function GET(request: NextRequest) {
  try {
    const preferences = await emailPreferencesService.getGlobalEmailPreferences();

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch email preferences',
      },
      { status: 500 }
    );
  }
}

// PUT /api/email/preferences - Update global email preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Preferences object is required',
        },
        { status: 400 }
      );
    }

    const updatedPreferences = await emailPreferencesService.updateGlobalEmailPreferences(
      preferences as Partial<GlobalEmailPreferences>
    );

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Email preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update email preferences',
      },
      { status: 500 }
    );
  }
}

// POST /api/email/preferences - Handle special actions (reset, test, export, import)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, preferencesJson } = body;

    if (action === 'reset') {
      const defaultPreferences = await emailPreferencesService.resetToDefaults();

      return NextResponse.json({
        success: true,
        data: defaultPreferences,
        message: 'Email preferences reset to defaults',
      });
    }

    if (action === 'test') {
      const testResult = await emailPreferencesService.testEmailConfiguration();

      return NextResponse.json({
        success: testResult.success,
        message: testResult.message,
        error: testResult.error,
      });
    }

    if (action === 'export') {
      const preferencesJson = await emailPreferencesService.exportPreferences();

      return NextResponse.json({
        success: true,
        data: preferencesJson,
        message: 'Preferences exported successfully',
      });
    }

    if (action === 'import') {
      if (!preferencesJson || typeof preferencesJson !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Preferences JSON string is required',
          },
          { status: 400 }
        );
      }

      const importedPreferences = await emailPreferencesService.importPreferences(preferencesJson);

      return NextResponse.json({
        success: true,
        data: importedPreferences,
        message: 'Email preferences imported successfully',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Supported actions: reset, test, export, import',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error with email preferences action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform action',
      },
      { status: 500 }
    );
  }
}