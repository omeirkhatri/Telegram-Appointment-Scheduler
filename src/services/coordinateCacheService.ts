/**
 * Coordinate Cache Service
 *
 * This service provides intelligent caching for coordinate-based operations
 * to reduce redundant calculations and improve performance.
 */

export interface CoordinateCacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

export interface CoordinateCacheOptions {
  maxSize?: number;
  defaultTtl?: number;
  enablePersistence?: boolean;
  enableCompression?: boolean;
  enableStats?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
  averageAccessTime: number;
}

export interface CoordinateBounds {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}

export interface CachedMapData {
  bounds: CoordinateBounds;
  center: { lat: number; lng: number };
  zoom: number;
  markers: Array<{
    id: string;
    position: { lat: number; lng: number };
    data: any;
  }>;
  clusters: Array<{
    id: string;
    center: { lat: number; lng: number };
    markers: string[];
    count: number;
  }>;
}

export class CoordinateCacheService {
  private static instance: CoordinateCacheService;
  private cache: Map<string, CoordinateCacheEntry> = new Map();
  private options: Required<CoordinateCacheOptions>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
    averageAccessTime: 0
  };
  private accessTimes: number[] = [];

  private constructor(options: CoordinateCacheOptions = {}) {
    this.options = {
      maxSize: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      enablePersistence: true,
      enableCompression: false,
      enableStats: true,
      ...options
    };

    // Load from localStorage if persistence is enabled
    if (this.options.enablePersistence) {
      this.loadFromStorage();
    }

    // Set up periodic cleanup
    this.setupCleanup();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: CoordinateCacheOptions): CoordinateCacheService {
    if (!CoordinateCacheService.instance) {
      CoordinateCacheService.instance = new CoordinateCacheService(options);
    }
    return CoordinateCacheService.instance;
  }

  /**
   * Cache coordinate-based data
   */
  public set(
    key: string,
    data: any,
    ttl?: number,
    tags?: string[]
  ): void {
    const now = Date.now();
    const entry: CoordinateCacheEntry = {
      key,
      data: this.options.enableCompression ? this.compress(data) : data,
      timestamp: now,
      ttl: ttl || this.options.defaultTtl,
      accessCount: 0,
      lastAccessed: now
    };

    // Add tags if provided
    if (tags) {
      (entry as any).tags = tags;
    }

    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Get cached coordinate data
   */
  public get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    const now = Date.now();

    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = now;

    this.stats.hits++;
    this.recordAccessTime(now);
    this.updateStats();

    // Return decompressed data if compression was used
    return this.options.enableCompression ? this.decompress(entry.data) : entry.data;
  }

  /**
   * Check if key exists and is not expired
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cached entry
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  public clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
      averageAccessTime: 0
    };
    this.accessTimes = [];
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Cache map bounds calculation
   */
  public cacheMapBounds(
    markers: Array<{ lat: number; lng: number }>,
    options: { padding?: number; maxZoom?: number } = {}
  ): CoordinateBounds | null {
    const key = this.generateBoundsKey(markers, options);

    // Check cache first
    const cached = this.get<CoordinateBounds>(key);
    if (cached) {
      return cached;
    }

    // Calculate bounds
    const bounds = this.calculateBounds(markers, options);

    if (bounds) {
      // Cache for 10 minutes
      this.set(key, bounds, 10 * 60 * 1000, ['bounds']);
    }

    return bounds;
  }

  /**
   * Cache marker clustering data
   */
  public cacheMarkerClusters(
    markers: Array<{ id: string; lat: number; lng: number; data: any }>,
    options: { maxZoom?: number; gridSize?: number; algorithm?: string } = {}
  ): CachedMapData | null {
    const key = this.generateClustersKey(markers, options);

    // Check cache first
    const cached = this.get<CachedMapData>(key);
    if (cached) {
      return cached;
    }

    // Calculate clusters
    const clusters = this.calculateClusters(markers, options);
    const bounds = this.calculateBounds(markers.map(m => ({ lat: m.lat, lng: m.lng })), options);
    const center = bounds ? this.calculateCenter(bounds) : { lat: 0, lng: 0 };

    const mapData: CachedMapData = {
      bounds: bounds || { northeast: { lat: 0, lng: 0 }, southwest: { lat: 0, lng: 0 } },
      center,
      zoom: options.maxZoom || 15,
      markers: markers.map(m => ({
        id: m.id,
        position: { lat: m.lat, lng: m.lng },
        data: m.data
      })),
      clusters
    };

    // Cache for 5 minutes
    this.set(key, mapData, 5 * 60 * 1000, ['clusters', 'markers']);

    return mapData;
  }

  /**
   * Cache coordinate validation results
   */
  public cacheCoordinateValidation(
    lat: number,
    lng: number,
    validationResult: { isValid: boolean; reason?: string }
  ): { isValid: boolean; reason?: string } {
    const key = `coord_validation_${lat.toFixed(6)}_${lng.toFixed(6)}`;

    // Check cache first
    const cached = this.get<{ isValid: boolean; reason?: string }>(key);
    if (cached) {
      return cached;
    }

    // Cache for 1 hour (coordinates don't change often)
    this.set(key, validationResult, 60 * 60 * 1000, ['validation']);

    return validationResult;
  }

  /**
   * Cache distance calculations
   */
  public cacheDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    distance: number
  ): number {
    const key = `distance_${from.lat.toFixed(6)}_${from.lng.toFixed(6)}_${to.lat.toFixed(6)}_${to.lng.toFixed(6)}`;

    // Check cache first
    const cached = this.get<number>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache for 1 hour
    this.set(key, distance, 60 * 60 * 1000, ['distance']);

    return distance;
  }

  /**
   * Invalidate cache entries by tags
   */
  public invalidateByTags(tags: string[]): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      const entryTags = (entry as any).tags || [];
      if (tags.some(tag => entryTags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.stats.evictions += invalidated;
    this.updateStats();

    return invalidated;
  }

  /**
   * Get cache entries by tags
   */
  public getByTags(tags: string[]): Array<{ key: string; data: any }> {
    const results: Array<{ key: string; data: any }> = [];

    for (const [key, entry] of this.cache.entries()) {
      const entryTags = (entry as any).tags || [];
      if (tags.some(tag => entryTags.includes(tag))) {
        results.push({
          key,
          data: this.options.enableCompression ? this.decompress(entry.data) : entry.data
        });
      }
    }

    return results;
  }

  /**
   * Calculate bounds for markers
   */
  private calculateBounds(
    markers: Array<{ lat: number; lng: number }>,
    options: { padding?: number; maxZoom?: number } = {}
  ): CoordinateBounds | null {
    if (markers.length === 0) {
      return null;
    }

    let minLat = markers[0].lat;
    let maxLat = markers[0].lat;
    let minLng = markers[0].lng;
    let maxLng = markers[0].lng;

    for (const marker of markers) {
      minLat = Math.min(minLat, marker.lat);
      maxLat = Math.max(maxLat, marker.lat);
      minLng = Math.min(minLng, marker.lng);
      maxLng = Math.max(maxLng, marker.lng);
    }

    return {
      northeast: { lat: maxLat, lng: maxLng },
      southwest: { lat: minLat, lng: minLng }
    };
  }

  /**
   * Calculate center of bounds
   */
  private calculateCenter(bounds: CoordinateBounds): { lat: number; lng: number } {
    return {
      lat: (bounds.northeast.lat + bounds.southwest.lat) / 2,
      lng: (bounds.northeast.lng + bounds.southwest.lng) / 2
    };
  }

  /**
   * Calculate clusters using simple grid-based algorithm
   */
  private calculateClusters(
    markers: Array<{ id: string; lat: number; lng: number; data: any }>,
    options: { maxZoom?: number; gridSize?: number; algorithm?: string } = {}
  ): Array<{ id: string; center: { lat: number; lng: number }; markers: string[]; count: number }> {
    const gridSize = options.gridSize || 60;
    const clusters: Map<string, Array<{ id: string; lat: number; lng: number; data: any }>> = new Map();

    // Group markers by grid cell
    for (const marker of markers) {
      const gridKey = `${Math.floor(marker.lat * 1000 / gridSize)}_${Math.floor(marker.lng * 1000 / gridSize)}`;

      if (!clusters.has(gridKey)) {
        clusters.set(gridKey, []);
      }
      clusters.get(gridKey)!.push(marker);
    }

    // Convert to cluster format
    const result: Array<{ id: string; center: { lat: number; lng: number }; markers: string[]; count: number }> = [];

    for (const [gridKey, clusterMarkers] of clusters.entries()) {
      if (clusterMarkers.length > 1) {
        const center = this.calculateCenter({
          northeast: {
            lat: Math.max(...clusterMarkers.map(m => m.lat)),
            lng: Math.max(...clusterMarkers.map(m => m.lng))
          },
          southwest: {
            lat: Math.min(...clusterMarkers.map(m => m.lat)),
            lng: Math.min(...clusterMarkers.map(m => m.lng))
          }
        });

        result.push({
          id: `cluster_${gridKey}`,
          center,
          markers: clusterMarkers.map(m => m.id),
          count: clusterMarkers.length
        });
      }
    }

    return result;
  }

  /**
   * Generate cache key for bounds calculation
   */
  private generateBoundsKey(
    markers: Array<{ lat: number; lng: number }>,
    options: { padding?: number; maxZoom?: number } = {}
  ): string {
    const markerHashes = markers
      .map(m => `${m.lat.toFixed(6)}_${m.lng.toFixed(6)}`)
      .sort()
      .join('|');

    return `bounds_${this.hashString(markerHashes)}_${options.padding || 0}_${options.maxZoom || 15}`;
  }

  /**
   * Generate cache key for clusters
   */
  private generateClustersKey(
    markers: Array<{ id: string; lat: number; lng: number; data: any }>,
    options: { maxZoom?: number; gridSize?: number; algorithm?: string } = {}
  ): string {
    const markerHashes = markers
      .map(m => `${m.id}_${m.lat.toFixed(6)}_${m.lng.toFixed(6)}`)
      .sort()
      .join('|');

    return `clusters_${this.hashString(markerHashes)}_${options.maxZoom || 15}_${options.gridSize || 60}_${options.algorithm || 'grid'}`;
  }

  /**
   * Simple hash function for strings
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;

    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;

    if (this.accessTimes.length > 0) {
      this.stats.averageAccessTime = this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
    }
  }

  /**
   * Record access time for statistics
   */
  private recordAccessTime(accessTime: number): void {
    this.accessTimes.push(accessTime);

    // Keep only last 100 access times
    if (this.accessTimes.length > 100) {
      this.accessTimes = this.accessTimes.slice(-100);
    }
  }

  /**
   * Set up periodic cleanup of expired entries
   */
  private setupCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      this.updateStats();
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('coordinate_cache');
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(data.cache || []);
        this.stats = data.stats || this.stats;
      }
    } catch (error) {
      console.warn('Failed to load coordinate cache from storage:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };
      localStorage.setItem('coordinate_cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save coordinate cache to storage:', error);
    }
  }

  /**
   * Compress data (simple JSON compression)
   */
  private compress(data: any): any {
    // Simple compression - in a real implementation, you might use a proper compression library
    return JSON.stringify(data);
  }

  /**
   * Decompress data
   */
  private decompress(data: any): any {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
}

/**
 * Convenience function to get the coordinate cache service instance
 */
export const getCoordinateCacheService = (options?: CoordinateCacheOptions): CoordinateCacheService => {
  return CoordinateCacheService.getInstance(options);
};

/**
 * Initialize coordinate cache with default options
 */
export const initializeCoordinateCache = (): CoordinateCacheService => {
  return getCoordinateCacheService({
    maxSize: 2000,
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    enablePersistence: true,
    enableCompression: false,
    enableStats: true
  });
};

export default CoordinateCacheService;
