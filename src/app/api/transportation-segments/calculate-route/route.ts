import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both old and new field names for backward compatibility
    const pickupLocation = body.pickup_location || body.origin;
    const patientLocation = body.patient_location || body.destination;

    if (!pickupLocation || !patientLocation) {
      return NextResponse.json(
        { error: 'Pickup location and patient location are required (or origin and destination for backward compatibility)' },
        { status: 400 }
      );
    }

    // Get Google Maps API key from environment
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // If no API key is configured, use mock calculation for development
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      console.log('Using mock calculation (Google Maps API key not configured)');

      // Simple mock calculation based on address similarity
      const mockDuration = Math.floor(Math.random() * 60) + 15; // 15-75 minutes
      const mockDistance = Math.floor(Math.random() * 50) + 5; // 5-55 km

      return NextResponse.json({
        duration: mockDuration,
        distance: mockDistance,
        durationText: `${mockDuration} mins`,
        distanceText: `${mockDistance} km`,
        mock: true
      });
    }

    // Use Google Maps Distance Matrix API
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickupLocation)}&destinations=${encodeURIComponent(patientLocation)}&units=metric&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Maps API error:', data);
      return NextResponse.json(
        { error: 'Failed to calculate route', details: data.error_message },
        { status: 400 }
      );
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      return NextResponse.json(
        { error: 'Could not calculate route between the specified locations' },
        { status: 400 }
      );
    }

    // Extract duration and distance
    const duration = element.duration?.value; // Duration in seconds
    const distance = element.distance?.value; // Distance in meters

    if (!duration || !distance) {
      return NextResponse.json(
        { error: 'Could not extract duration or distance from route calculation' },
        { status: 400 }
      );
    }

    // Convert to minutes and kilometers
    const durationMinutes = Math.round(duration / 60);
    const distanceKm = Math.round((distance / 1000) * 10) / 10; // Round to 1 decimal place

    return NextResponse.json({
      duration: durationMinutes,
      distance: distanceKm,
      durationText: element.duration?.text,
      distanceText: element.distance?.text
    });

  } catch (error) {
    console.error('Error calculating route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
