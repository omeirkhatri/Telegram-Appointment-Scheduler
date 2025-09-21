import { getServiceRoleClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface OfficeLocation {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  phone?: string;
  email?: string;
  icon?: string;
  color?: string;
}

// GET - Retrieve office settings
export async function GET() {
  try {
    const supabase = getServiceRoleClient();

    // Try to get office settings from database
    try {
      const { data, error } = await supabase
        .from('office_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching office settings:', error);
        // Fall through to return default values
      } else if (data) {
        return NextResponse.json({
          success: true,
          data: data.settings as OfficeLocation
        });
      }
    } catch (dbError) {
      console.error('Database error (table may not exist):', dbError);
      // Fall through to return default values
    }

    // Return default values if table doesn't exist or no data found
    const defaultSettings: OfficeLocation = {
      name: 'Best DOC Office',
      coordinates: {
        lat: 25.1556, // Converted from 25°09'20.3"N
        lng: 55.2485  // Converted from 55°14'54.6"E
      },
      address: 'Office Address, Dubai, UAE',
      phone: '+971 XX XXX XXXX',
      email: 'office@bestdoc.ae',
      icon: '🏢',
      color: '#2563eb'
    };

    return NextResponse.json({
      success: true,
      data: defaultSettings,
      message: 'Using default settings. Please create the office_settings table in your database to save custom settings.'
    });

  } catch (error) {
    console.error('Error in office settings GET:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update office settings
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.coordinates || !body.address) {
      return NextResponse.json(
        { success: false, message: 'Name, coordinates, and address are required' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (typeof body.coordinates.lat !== 'number' || typeof body.coordinates.lng !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Invalid coordinates format' },
        { status: 400 }
      );
    }

    // Validate latitude and longitude ranges
    if (body.coordinates.lat < -90 || body.coordinates.lat > 90) {
      return NextResponse.json(
        { success: false, message: 'Latitude must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (body.coordinates.lng < -180 || body.coordinates.lng > 180) {
      return NextResponse.json(
        { success: false, message: 'Longitude must be between -180 and 180' },
        { status: 400 }
      );
    }

    const officeSettings: OfficeLocation = {
      name: body.name,
      coordinates: {
        lat: body.coordinates.lat,
        lng: body.coordinates.lng
      },
      address: body.address,
      phone: body.phone || null,
      email: body.email || null,
      icon: body.icon || '🏢',
      color: body.color || '#2563eb'
    };

    // Try to upsert office settings
    try {
      const { data, error } = await supabase
        .from('office_settings')
        .upsert({
          id: 'office_location',
          settings: officeSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving office settings:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to save office settings. Database table may not exist.' },
          { status: 500 }
        );
      }
    } catch (dbError) {
      console.error('Database error (table may not exist):', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to save office settings. Database table may not exist.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: officeSettings,
      message: 'Office settings saved successfully'
    });

  } catch (error) {
    console.error('Error in office settings POST:', error);

    // Check if it's a table not found error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST205') {
      return NextResponse.json(
        {
          success: false,
          message: 'Database table not found. Please create the office_settings table first.',
          instructions: 'Run this SQL in your Supabase dashboard: CREATE TABLE office_settings (id TEXT PRIMARY KEY, settings JSONB NOT NULL);'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to save office settings' },
      { status: 500 }
    );
  }
}
