import { NextRequest, NextResponse } from 'next/server';

// GET /api/google-calendar/sync-settings - Get current sync settings
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, these settings would be stored in the database
    // For now, we'll return default settings
    const defaultSettings = {
      autoSyncAppointments: true,
      bidirectionalSync: true,
      conflictResolution: false,
      syncReminders: true,
      syncInterval: 300, // 5 minutes in seconds
      retryAttempts: 3,
      webhookEnabled: true,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    console.error('Error fetching sync settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sync settings'
      },
      { status: 500 }
    );
  }
}

// PUT /api/google-calendar/sync-settings - Update sync settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      autoSyncAppointments,
      bidirectionalSync,
      conflictResolution,
      syncReminders,
      syncInterval,
      retryAttempts,
      webhookEnabled
    } = body;

    // Validate settings
    const validationErrors: string[] = [];
    
    if (typeof autoSyncAppointments !== 'boolean') {
      validationErrors.push('autoSyncAppointments must be a boolean');
    }
    
    if (typeof bidirectionalSync !== 'boolean') {
      validationErrors.push('bidirectionalSync must be a boolean');
    }
    
    if (typeof conflictResolution !== 'boolean') {
      validationErrors.push('conflictResolution must be a boolean');
    }
    
    if (typeof syncReminders !== 'boolean') {
      validationErrors.push('syncReminders must be a boolean');
    }
    
    if (typeof syncInterval !== 'number' || syncInterval < 60 || syncInterval > 3600) {
      validationErrors.push('syncInterval must be a number between 60 and 3600 seconds');
    }
    
    if (typeof retryAttempts !== 'number' || retryAttempts < 1 || retryAttempts > 10) {
      validationErrors.push('retryAttempts must be a number between 1 and 10');
    }
    
    if (typeof webhookEnabled !== 'boolean') {
      validationErrors.push('webhookEnabled must be a boolean');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    // In a real implementation, these settings would be saved to the database
    const updatedSettings = {
      autoSyncAppointments,
      bidirectionalSync,
      conflictResolution,
      syncReminders,
      syncInterval,
      retryAttempts,
      webhookEnabled,
      lastUpdated: new Date().toISOString()
    };

    // Here you would typically:
    // 1. Save settings to database
    // 2. Update any running sync processes
    // 3. Configure webhooks if needed
    // 4. Log the settings change

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Sync settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating sync settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update sync settings'
      },
      { status: 500 }
    );
  }
}
