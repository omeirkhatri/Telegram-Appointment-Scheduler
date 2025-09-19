'use client';

import { GoogleMapsService } from './googleMapsService';
import type { Coordinates, GeocodingResult, GeocodingError } from '@/types/map';

export interface GeocodingOptions {
  region?: string;
  language?: string;
  bounds?: google.maps.LatLngBounds;
  componentRestrictions?: {
    country?: string | string[];
    postalCode?: string;
    route?: string;
    locality?: string;
    administrativeArea?: string;
    administrativeAreaLevel1?: string;
    administrativeAreaLevel2?: string;
    administrativeAreaLevel3?: string;
    administrativeAreaLevel4?: string;
    administrativeAreaLevel5?: string;
    countryCode?: string;
  };
}

export interface GeocodingCacheEntry {
  result: GeocodingResult;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface GeocodingServiceConfig {
  enableCaching?: boolean;
  cacheTTL?: number; // Time to live in milliseconds
  maxCacheSize?: number;
  enableBatchGeocoding?: boolean;
  batchDelay?: number; // Delay between batch requests in milliseconds
  retryAttempts?: number;
  retryDelay?: number; // Delay between retries in milliseconds
}

export class GeocodingService {
  private static instance: GeocodingService | null = null;
  private googleMapsService: GoogleMapsService | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private cache: Map<string, GeocodingCacheEntry> = new Map();
  private config: GeocodingServiceConfig;
  private batchQueue: Array<{
    address: string;
    options?: GeocodingOptions;
    resolve: (result: GeocodingResult) => void;
    reject: (error: GeocodingError) => void;
  }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  private constructor(config: GeocodingServiceConfig = {}) {
    this.config = {
      enableCaching: true,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 1000,
      enableBatchGeocoding: true,
      batchDelay: 100, // 100ms delay between batch requests
      retryAttempts: 3,
      retryDelay: 1000, // 1 second delay between retries
      ...config
    };
  }

  public static getInstance(config?: GeocodingServiceConfig): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService(config);
    } else if (config) {
      // Update config if provided
      GeocodingService.instance.config = {
        ...GeocodingService.instance.config,
        ...config
      };
    }
    return GeocodingService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Get Google Maps service instance
      this.googleMapsService = GoogleMapsService.getInstance();
      
      // Ensure Google Maps API is initialized
      if (!this.googleMapsService.isApiInitialized()) {
        throw new Error('Google Maps API not initialized');
      }

      // Get the loader instance
      const loader = this.googleMapsService.getLoader();

      // Load Geocoding library
      const { Geocoder } = await loader.importLibrary('geocoding');

      // Create geocoder instance
      this.geocoder = new Geocoder();

      // Load cache from localStorage if enabled
      if (this.config.enableCaching) {
        this.loadCacheFromStorage();
      }

    } catch (error) {
      console.error('Error initializing GeocodingService:', error);
      throw new Error(`Failed to initialize geocoding service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public isInitialized(): boolean {
    return this.geocoder !== null && this.googleMapsService?.isApiInitialized() === true;
  }

  public async geocode(address: string, options: GeocodingOptions = {}): Promise<GeocodingResult> {
    if (!this.isInitialized()) {
      throw new Error('GeocodingService not initialized');
    }

    // Check cache first
    if (this.config.enableCaching) {
      const cachedResult = this.getCachedResult(address, options);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // Use batch geocoding if enabled
    if (this.config.enableBatchGeocoding) {
      return this.batchGeocode(address, options);
    }

    // Direct geocoding
    return this.directGeocode(address, options);
  }

  private async directGeocode(address: string, options: GeocodingOptions = {}): Promise<GeocodingResult> {
    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    const request: google.maps.GeocoderRequest = {
      address,
      ...options
    };

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(request, (results, status) => {
        if (status !== 'OK' || results.length === 0) {
          const error: GeocodingError = {
            code: status === 'ZERO_RESULTS' ? 'ZERO_RESULTS' : 'GEOCODING_ERROR',
            message: status === 'ZERO_RESULTS' ? 'No results found for the given address' : `Geocoding failed: ${status}`,
            details: { address, options, status },
            timestamp: Date.now()
          };
          reject(error);
          return;
        }

        try {
          const result = this.formatGeocodingResult(results[0], address);
          
          // Cache the result
          if (this.config.enableCaching) {
            this.cacheResult(address, options, result);
          }

          resolve(result);
        } catch (error) {
          const geocodingError: GeocodingError = {
            code: 'GEOCODING_ERROR',
            message: error instanceof Error ? error.message : 'Geocoding failed',
            details: { address, options, originalError: error },
            timestamp: Date.now()
          };
          reject(geocodingError);
        }
      });
    });
  }

  private async batchGeocode(address: string, options: GeocodingOptions = {}): Promise<GeocodingResult> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      this.batchQueue.push({ address, options, resolve, reject });

      // Process batch if not already processing
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.config.batchDelay);
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      this.batchTimeout = null;
      return;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimeout = null;

    // Process each request in the batch
    for (const request of batch) {
      try {
        const result = await this.directGeocode(request.address, request.options);
        request.resolve(result);
      } catch (error) {
        request.reject(error as GeocodingError);
      }
    }
  }

  private formatGeocodingResult(result: google.maps.GeocoderResult, originalAddress: string): GeocodingResult {
    const location = result.geometry.location;
    const coordinates: Coordinates = {
      lat: location.lat(),
      lng: location.lng()
    };

    // Extract address components
    const addressComponents = result.address_components || [];
    const formattedAddress = result.formatted_address || originalAddress;

    // Parse address components
    const components: Record<string, string> = {};
    addressComponents.forEach(component => {
      const types = component.types;
      const longName = component.long_name;
      const shortName = component.short_name;

      if (types.includes('street_number')) {
        components.streetNumber = longName;
      } else if (types.includes('route')) {
        components.streetName = longName;
      } else if (types.includes('locality')) {
        components.city = longName;
      } else if (types.includes('administrative_area_level_1')) {
        components.state = longName;
        components.stateCode = shortName;
      } else if (types.includes('country')) {
        components.country = longName;
        components.countryCode = shortName;
      } else if (types.includes('postal_code')) {
        components.postalCode = longName;
      } else if (types.includes('neighborhood')) {
        components.neighborhood = longName;
      } else if (types.includes('sublocality')) {
        components.sublocality = longName;
      }
    });

    return {
      coordinates,
      formattedAddress,
      addressComponents: components,
      placeId: result.place_id,
      types: result.types || [],
      geometry: {
        location: coordinates,
        locationType: result.geometry.location_type,
        viewport: result.geometry.viewport ? {
          northeast: {
            lat: result.geometry.viewport.getNorthEast().lat(),
            lng: result.geometry.viewport.getNorthEast().lng()
          },
          southwest: {
            lat: result.geometry.viewport.getSouthWest().lat(),
            lng: result.geometry.viewport.getSouthWest().lng()
          }
        } : undefined
      },
      originalAddress,
      timestamp: Date.now()
    };
  }

  private getCachedResult(address: string, options: GeocodingOptions = {}): GeocodingResult | null {
    const cacheKey = this.generateCacheKey(address, options);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  private cacheResult(address: string, options: GeocodingOptions, result: GeocodingResult): void {
    const cacheKey = this.generateCacheKey(address, options);
    
    // Check cache size limit before adding new entry
    if (this.cache.size >= this.config.maxCacheSize!) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = Math.max(1, Math.floor(this.config.maxCacheSize! * 0.1)); // Remove at least 1 entry
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL!
    });

    // Save to localStorage
    this.saveCacheToStorage();
  }

  private generateCacheKey(address: string, options: GeocodingOptions = {}): string {
    const optionsStr = JSON.stringify(options, Object.keys(options).sort());
    return `${address.toLowerCase().trim()}|${optionsStr}`;
  }

  private loadCacheFromStorage(): void {
    try {
      const cached = localStorage.getItem('geocoding_cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.cache = new Map(data);
      }
    } catch (error) {
      console.warn('Failed to load geocoding cache from localStorage:', error);
    }
  }

  private saveCacheToStorage(): void {
    try {
      const data = Array.from(this.cache.entries());
      localStorage.setItem('geocoding_cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save geocoding cache to localStorage:', error);
    }
  }

  public clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('geocoding_cache');
  }

  public getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; timestamp: number; ttl: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize!,
      hitRate: 0, // This would need to be tracked separately
      entries
    };
  }

  public async reverseGeocode(coordinates: Coordinates, options: GeocodingOptions = {}): Promise<GeocodingResult> {
    if (!this.isInitialized()) {
      throw new Error('GeocodingService not initialized');
    }

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    const request: google.maps.GeocoderRequest = {
      location: new google.maps.LatLng(coordinates.lat, coordinates.lng),
      ...options
    };

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(request, (results, status) => {
        if (status !== 'OK' || results.length === 0) {
          const error: GeocodingError = {
            code: status === 'ZERO_RESULTS' ? 'ZERO_RESULTS' : 'GEOCODING_ERROR',
            message: status === 'ZERO_RESULTS' ? 'No results found for the given coordinates' : `Reverse geocoding failed: ${status}`,
            details: { coordinates, options, status },
            timestamp: Date.now()
          };
          reject(error);
          return;
        }

        try {
          const result = this.formatGeocodingResult(results[0], `${coordinates.lat},${coordinates.lng}`);
          
          // Cache the result
          if (this.config.enableCaching) {
            this.cacheResult(`${coordinates.lat},${coordinates.lng}`, options, result);
          }

          resolve(result);
        } catch (error) {
          const geocodingError: GeocodingError = {
            code: 'GEOCODING_ERROR',
            message: error instanceof Error ? error.message : 'Reverse geocoding failed',
            details: { coordinates, options, originalError: error },
            timestamp: Date.now()
          };
          reject(geocodingError);
        }
      });
    });
  }

  public async geocodeBatch(addresses: string[], options: GeocodingOptions = {}): Promise<GeocodingResult[]> {
    const promises = addresses.map(address => this.geocode(address, options));
    return Promise.all(promises);
  }

  public destroy(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    this.batchQueue = [];
    this.cache.clear();
    this.geocoder = null;
    this.googleMapsService = null;
    GeocodingService.instance = null;
  }
}

export default GeocodingService;
