import { CoordinateCacheService } from '@/services/coordinateCacheService';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export type DistanceMatrixTravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export interface DistanceMatrixOptions {
  mode?: DistanceMatrixTravelMode;
  departureTime?: Date | number | null;
  language?: string;
  units?: 'metric' | 'imperial';
  cacheTtlMs?: number;
  signal?: AbortSignal;
}

export interface DistanceMatrixMetrics {
  requestUrl: string;
  fetchedAt: number;
  cacheKey: string;
  fromCache: boolean;
  apiStatus?: string;
}

export interface DistanceMatrixSuccessResult {
  status: 'success';
  distanceMeters: number;
  distanceKilometers: number;
  durationSeconds: number;
  durationMinutes: number;
  text: {
    distance: string;
    duration: string;
  };
  rawElement: unknown;
  metrics: DistanceMatrixMetrics;
}

export interface DistanceMatrixErrorResult {
  status: 'error';
  error: string;
  fallbackReason:
    | 'missing_api_key'
    | 'invalid_coordinates'
    | 'quota_exceeded'
    | 'request_denied'
    | 'no_results'
    | 'network_error'
    | 'invalid_response'
    | 'unknown';
  metrics: DistanceMatrixMetrics;
}

export type DistanceMatrixResult = DistanceMatrixSuccessResult | DistanceMatrixErrorResult;

interface DistanceMatrixCacheEntry {
  distanceMeters: number;
  distanceKilometers: number;
  durationSeconds: number;
  durationMinutes: number;
  text: {
    distance: string;
    duration: string;
  };
  rawElement: unknown;
  cachedAt: number;
}

const DISTANCE_MATRIX_ENDPOINT = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const DISTANCE_MATRIX_CACHE_TAG = 'distance_matrix';
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour as per PRD guidance
const COORDINATE_PRECISION = 6;

function getApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_DISTANCE_MATRIX_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

function formatCoordinate(coordinate: LatLngLiteral): string {
  return `${coordinate.lat.toFixed(COORDINATE_PRECISION)},${coordinate.lng.toFixed(COORDINATE_PRECISION)}`;
}

function buildCacheKey(
  origin: LatLngLiteral,
  destination: LatLngLiteral,
  options: Pick<DistanceMatrixOptions, 'mode' | 'language' | 'units' | 'departureTime'>,
): string {
  const parts = [
    'distance-matrix',
    formatCoordinate(origin),
    formatCoordinate(destination),
    options.mode || 'driving',
    options.units || 'metric',
    options.language || 'en',
  ];

  if (options.departureTime) {
    const departureEpoch =
      options.departureTime instanceof Date
        ? Math.floor(options.departureTime.getTime() / 1000)
        : typeof options.departureTime === 'number'
          ? Math.floor(options.departureTime / 1000)
          : undefined;

    if (departureEpoch) {
      parts.push(`depart-${departureEpoch}`);
    }
  }

  return parts.join('|');
}

function normaliseCoordinates(origin?: LatLngLiteral | null, destination?: LatLngLiteral | null): {
  origin?: LatLngLiteral;
  destination?: LatLngLiteral;
  error?: DistanceMatrixErrorResult;
} {
  if (!origin || !destination) {
    return {
      error: {
        status: 'error',
        error: 'Origin and destination coordinates are required for distance matrix lookups.',
        fallbackReason: 'invalid_coordinates',
        metrics: {
          requestUrl: '',
          fetchedAt: Date.now(),
          cacheKey: '',
          fromCache: false,
        },
      },
    };
  }

  if (Number.isNaN(origin.lat) || Number.isNaN(origin.lng) || Number.isNaN(destination.lat) || Number.isNaN(destination.lng)) {
    return {
      error: {
        status: 'error',
        error: 'Invalid coordinates supplied to distance matrix utility.',
        fallbackReason: 'invalid_coordinates',
        metrics: {
          requestUrl: '',
          fetchedAt: Date.now(),
          cacheKey: '',
          fromCache: false,
        },
      },
    };
  }

  return { origin, destination };
}

export function invalidateDistanceMatrixCache(): number {
  const cache = CoordinateCacheService.getInstance();
  return cache.invalidateByTags([DISTANCE_MATRIX_CACHE_TAG]);
}

export async function getDistanceMatrix(
  origin: LatLngLiteral | null | undefined,
  destination: LatLngLiteral | null | undefined,
  options: DistanceMatrixOptions = {},
): Promise<DistanceMatrixResult> {
  const coordinates = normaliseCoordinates(origin ?? null, destination ?? null);
  if (coordinates.error) {
    return coordinates.error;
  }

  const apiKey = getApiKey();
  const fetchedAt = Date.now();
  const cacheKey = buildCacheKey(coordinates.origin!, coordinates.destination!, options);
  const cache = CoordinateCacheService.getInstance();
  const cached = cache.get<DistanceMatrixCacheEntry>(cacheKey);

  if (cached) {
    return {
      status: 'success',
      distanceMeters: cached.distanceMeters,
      distanceKilometers: cached.distanceKilometers,
      durationSeconds: cached.durationSeconds,
      durationMinutes: cached.durationMinutes,
      text: cached.text,
      rawElement: cached.rawElement,
      metrics: {
        requestUrl: '',
        fetchedAt,
        cacheKey,
        fromCache: true,
        apiStatus: 'OK',
      },
    };
  }

  if (!apiKey) {
    return {
      status: 'error',
      error: 'Google Distance Matrix API key is not configured. Set GOOGLE_MAPS_DISTANCE_MATRIX_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.',
      fallbackReason: 'missing_api_key',
      metrics: {
        requestUrl: '',
        fetchedAt,
        cacheKey,
        fromCache: false,
      },
    };
  }

  const params = new URLSearchParams({
    origins: formatCoordinate(coordinates.origin!),
    destinations: formatCoordinate(coordinates.destination!),
    mode: options.mode || 'driving',
    units: options.units || 'metric',
    key: apiKey,
  });

  if (options.language) {
    params.set('language', options.language);
  }

  if (options.departureTime) {
    const departureEpoch =
      options.departureTime instanceof Date
        ? Math.floor(options.departureTime.getTime() / 1000)
        : Math.floor(Number(options.departureTime) / 1000);

    if (!Number.isNaN(departureEpoch) && departureEpoch > 0) {
      params.set('departure_time', departureEpoch.toString());
    }
  }

  const requestUrl = `${DISTANCE_MATRIX_ENDPOINT}?${params.toString()}`;

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      signal: options.signal,
    });

    if (!response.ok) {
      return {
        status: 'error',
        error: `Distance Matrix request failed with status ${response.status}.`,
        fallbackReason: response.status === 403 || response.status === 429 ? 'quota_exceeded' : 'network_error',
        metrics: {
          requestUrl,
          fetchedAt,
          cacheKey,
          fromCache: false,
          apiStatus: response.status.toString(),
        },
      };
    }

    const payload = await response.json();
    const element = payload?.rows?.[0]?.elements?.[0];
    const apiStatus: string = element?.status || payload?.status || 'UNKNOWN';

    if (!element) {
      return {
        status: 'error',
        error: 'Distance Matrix response did not include a result element.',
        fallbackReason: 'invalid_response',
        metrics: {
          requestUrl,
          fetchedAt,
          cacheKey,
          fromCache: false,
          apiStatus,
        },
      };
    }

    if (element.status !== 'OK') {
      let fallbackReason: DistanceMatrixErrorResult['fallbackReason'] = 'unknown';
      let errorMessage = `Distance Matrix request returned status ${element.status}.`;

      switch (element.status) {
        case 'ZERO_RESULTS':
          fallbackReason = 'no_results';
          errorMessage = 'No route found between the supplied coordinates.';
          break;
        case 'OVER_QUERY_LIMIT':
          fallbackReason = 'quota_exceeded';
          errorMessage = 'Google Distance Matrix quota exceeded.';
          break;
        case 'REQUEST_DENIED':
          fallbackReason = 'request_denied';
          errorMessage = payload?.error_message
            ? `Google Distance Matrix request denied: ${payload.error_message}`
            : 'Google Distance Matrix request denied.';
          break;
        case 'INVALID_REQUEST':
          fallbackReason = 'invalid_response';
          errorMessage = 'Invalid Distance Matrix request parameters.';
          break;
        default:
          fallbackReason = 'unknown';
          errorMessage = payload?.error_message || errorMessage;
      }

      return {
        status: 'error',
        error: errorMessage,
        fallbackReason,
        metrics: {
          requestUrl,
          fetchedAt,
          cacheKey,
          fromCache: false,
          apiStatus,
        },
      };
    }

    const durationSeconds = Number(element?.duration?.value) || 0;
    const distanceMeters = Number(element?.distance?.value) || 0;

    const result: DistanceMatrixCacheEntry = {
      distanceMeters,
      distanceKilometers: distanceMeters / 1000,
      durationSeconds,
      durationMinutes: Math.round(durationSeconds / 60),
      text: {
        distance: element?.distance?.text || `${(distanceMeters / 1000).toFixed(1)} km`,
        duration: element?.duration?.text || `${Math.round(durationSeconds / 60)} mins`,
      },
      rawElement: element,
      cachedAt: fetchedAt,
    };

    cache.set(cacheKey, result, options.cacheTtlMs || DEFAULT_CACHE_TTL_MS, [DISTANCE_MATRIX_CACHE_TAG]);

    return {
      status: 'success',
      distanceMeters: result.distanceMeters,
      distanceKilometers: result.distanceKilometers,
      durationSeconds: result.durationSeconds,
      durationMinutes: result.durationMinutes,
      text: result.text,
      rawElement: result.rawElement,
      metrics: {
        requestUrl,
        fetchedAt,
        cacheKey,
        fromCache: false,
        apiStatus,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error when calling Distance Matrix API.';

    return {
      status: 'error',
      error: `Failed to fetch travel distance: ${message}`,
      fallbackReason: 'network_error',
      metrics: {
        requestUrl,
        fetchedAt,
        cacheKey,
        fromCache: false,
        apiStatus: 'FETCH_ERROR',
      },
    };
  }
}
