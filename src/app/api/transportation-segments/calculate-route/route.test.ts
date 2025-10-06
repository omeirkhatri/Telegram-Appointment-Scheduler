import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the Google Maps API
const mockGoogleMaps = {
  maps: {
    DirectionsService: jest.fn(),
    DirectionsStatus: {
      OK: 'OK',
      NOT_FOUND: 'NOT_FOUND',
      ZERO_RESULTS: 'ZERO_RESULTS',
    },
    TravelMode: {
      DRIVING: 'DRIVING',
      WALKING: 'WALKING',
      TRANSIT: 'TRANSIT',
    },
  },
};

global.google = mockGoogleMaps as any;

describe('/api/transportation-segments/calculate-route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate route successfully', async () => {
    const mockDirectionsService = {
      route: jest.fn((request, callback) => {
        callback({
          status: 'OK',
          routes: [{
            legs: [{
              duration: { text: '30 mins', value: 1800 },
              distance: { text: '5.2 km', value: 5200 },
            }],
          }],
        }, 'OK');
      }),
    };

    mockGoogleMaps.maps.DirectionsService.mockImplementation(() => mockDirectionsService);

    const requestBody = {
      pickup_location: '123 Main St, New York, NY',
      patient_location: '456 Oak Ave, New York, NY',
      travel_mode: 'DRIVING',
    };

    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.duration).toBe(30);
    expect(data.distance).toBe(5.2);
    expect(data.durationText).toBe('30 mins');
    expect(data.distanceText).toBe('5.2 km');
  });

  it('should handle route not found', async () => {
    const mockDirectionsService = {
      route: jest.fn((request, callback) => {
        callback({
          status: 'NOT_FOUND',
        }, 'NOT_FOUND');
      }),
    };

    mockGoogleMaps.maps.DirectionsService.mockImplementation(() => mockDirectionsService);

    const requestBody = {
      pickup_location: 'Invalid Address',
      patient_location: 'Another Invalid Address',
    };

    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Route not found');
  });

  it('should handle zero results', async () => {
    const mockDirectionsService = {
      route: jest.fn((request, callback) => {
        callback({
          status: 'ZERO_RESULTS',
        }, 'ZERO_RESULTS');
      }),
    };

    mockGoogleMaps.maps.DirectionsService.mockImplementation(() => mockDirectionsService);

    const requestBody = {
      pickup_location: '123 Main St, New York, NY',
      patient_location: '456 Oak Ave, New York, NY',
    };

    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('No route found between the specified locations');
  });

  it('should handle invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid JSON');
  });

  it('should handle missing required fields', async () => {
    const requestBody = {
      pickup_location: '123 Main St, New York, NY',
      // Missing patient_location
    };

    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing required fields');
  });

  it('should handle different travel modes', async () => {
    const mockDirectionsService = {
      route: jest.fn((request, callback) => {
        expect(request.travelMode).toBe('WALKING');
        callback({
          status: 'OK',
          routes: [{
            legs: [{
              duration: { text: '45 mins', value: 2700 },
              distance: { text: '2.1 km', value: 2100 },
            }],
          }],
        }, 'OK');
      }),
    };

    mockGoogleMaps.maps.DirectionsService.mockImplementation(() => mockDirectionsService);

    const requestBody = {
      pickup_location: '123 Main St, New York, NY',
      patient_location: '456 Oak Ave, New York, NY',
      travel_mode: 'WALKING',
    };

    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.duration).toBe(45);
    expect(data.distance).toBe(2.1);
  });

  it('should handle Google Maps API errors', async () => {
    const mockDirectionsService = {
      route: jest.fn((request, callback) => {
        callback(null, 'ERROR');
      }),
    };

    mockGoogleMaps.maps.DirectionsService.mockImplementation(() => mockDirectionsService);

    const requestBody = {
      pickup_location: '123 Main St, New York, NY',
      patient_location: '456 Oak Ave, New York, NY',
    };

    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to calculate route');
  });

  it('should handle network errors', async () => {
    const mockDirectionsService = {
      route: jest.fn((request, callback) => {
        throw new Error('Network error');
      }),
    };

    mockGoogleMaps.maps.DirectionsService.mockImplementation(() => mockDirectionsService);

    const requestBody = {
      pickup_location: '123 Main St, New York, NY',
      patient_location: '456 Oak Ave, New York, NY',
    };

    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Network error');
  });

  it('should validate travel mode', async () => {
    const requestBody = {
      pickup_location: '123 Main St, New York, NY',
      patient_location: '456 Oak Ave, New York, NY',
      travel_mode: 'INVALID_MODE',
    };

    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid travel mode');
  });

  it('should handle empty locations', async () => {
    const requestBody = {
      pickup_location: '',
      patient_location: '456 Oak Ave, New York, NY',
    };

    const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid location data');
  });
});

