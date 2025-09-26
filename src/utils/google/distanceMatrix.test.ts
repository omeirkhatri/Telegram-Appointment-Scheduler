import { CoordinateCacheService } from '@/services/coordinateCacheService';
import {
  LatLngLiteral,
  getDistanceMatrix,
  invalidateDistanceMatrixCache,
} from './distanceMatrix';

describe('distanceMatrix utility', () => {
  const origin: LatLngLiteral = { lat: 25.2048, lng: 55.2708 };
  const destination: LatLngLiteral = { lat: 25.1972, lng: 55.2744 };

  beforeEach(() => {
    invalidateDistanceMatrixCache();
    CoordinateCacheService.getInstance().clear();
    (global.fetch as jest.Mock).mockReset();
    process.env.GOOGLE_MAPS_DISTANCE_MATRIX_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_MAPS_DISTANCE_MATRIX_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    invalidateDistanceMatrixCache();
    CoordinateCacheService.getInstance().clear();
  });

  it('fetches distance data and caches the result', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 900, text: '15 mins' },
                distance: { value: 10000, text: '10 km' },
              },
            ],
          },
        ],
      }),
    });

    const firstCall = await getDistanceMatrix(origin, destination);

    expect(firstCall.status).toBe('success');
    if (firstCall.status === 'success') {
      expect(firstCall.durationMinutes).toBe(15);
      expect(firstCall.distanceKilometers).toBe(10);
      expect(firstCall.metrics.fromCache).toBe(false);
    }
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const secondCall = await getDistanceMatrix(origin, destination);

    expect(secondCall.status).toBe('success');
    if (secondCall.status === 'success') {
      expect(secondCall.metrics.fromCache).toBe(true);
    }
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns an error when the API key is missing', async () => {
    delete process.env.GOOGLE_MAPS_DISTANCE_MATRIX_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const result = await getDistanceMatrix(origin, destination);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.fallbackReason).toBe('missing_api_key');
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles quota errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OVER_QUERY_LIMIT',
              },
            ],
          },
        ],
        error_message: 'Quota exceeded',
      }),
    });

    const result = await getDistanceMatrix(origin, destination);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.fallbackReason).toBe('quota_exceeded');
      expect(result.error.toLowerCase()).toContain('quota');
    }
  });
});
