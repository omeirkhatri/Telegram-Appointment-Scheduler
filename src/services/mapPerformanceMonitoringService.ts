'use client';

import type { MapError } from '@/types/map';

export interface MapPerformanceMetrics {
  // Map initialization metrics
  mapInitializationTime: number;
  mapLoadTime: number;
  apiLoadTime: number;

  // Marker operations metrics
  markerCreationTime: number;
  markerUpdateTime: number;
  markerDeletionTime: number;
  totalMarkersCreated: number;
  totalMarkersUpdated: number;
  totalMarkersDeleted: number;

  // Clustering metrics
  clusteringTime: number;
  clusteringAlgorithm: string;
  clustersCreated: number;
  markersPerCluster: number;

  // Navigation metrics
  navigationTime: number;
  boundsUpdateTime: number;
  zoomChangeTime: number;
  centerChangeTime: number;

  // Filtering metrics
  filteringTime: number;
  filteredAppointments: number;
  totalAppointments: number;

  // Memory usage metrics
  memoryUsage: number;
  memoryPeak: number;
  memoryLeaks: number;

  // Error metrics
  totalErrors: number;
  errorTypes: Record<string, number>;
  lastError: MapError | null;

  // Performance scores (0-100)
  overallScore: number;
  initializationScore: number;
  renderingScore: number;
  navigationScore: number;
  memoryScore: number;

  // Timestamps
  firstLoad: number;
  lastUpdate: number;
  sessionDuration: number;
}

export interface MapPerformanceThresholds {
  // Time thresholds (milliseconds)
  maxInitializationTime: number;
  maxMapLoadTime: number;
  maxMarkerCreationTime: number;
  maxClusteringTime: number;
  maxNavigationTime: number;
  maxFilteringTime: number;

  // Memory thresholds (MB)
  maxMemoryUsage: number;
  maxMemoryPeak: number;

  // Error thresholds
  maxErrorsPerSession: number;
  maxErrorRate: number; // errors per minute

  // Performance score thresholds
  minOverallScore: number;
  minInitializationScore: number;
  minRenderingScore: number;
  minNavigationScore: number;
  minMemoryScore: number;
}

export interface MapPerformanceEvent {
  type: 'initialization' | 'marker_operation' | 'clustering' | 'navigation' | 'filtering' | 'error' | 'memory';
  operation: string;
  duration: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface MapPerformanceConfig {
  enableMonitoring: boolean;
  enableMemoryTracking: boolean;
  enableErrorTracking: boolean;
  enablePerformanceScoring: boolean;
  enableLocalStorage: boolean;
  enableConsoleLogging: boolean;
  enablePerformanceAPI: boolean;
  samplingRate: number; // 0-1, percentage of events to track
  maxEventsInMemory: number;
  localStorageKey: string;
  thresholds: MapPerformanceThresholds;
}

class MapPerformanceMonitoringService {
  private static instance: MapPerformanceMonitoringService | null = null;
  private config: MapPerformanceConfig;
  private metrics: MapPerformanceMetrics;
  private events: MapPerformanceEvent[] = [];
  private isMonitoring = false;
  private memoryObserver: PerformanceObserver | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private startTime: number = 0;

  private constructor(config?: Partial<MapPerformanceConfig>) {
    this.config = {
      enableMonitoring: true,
      enableMemoryTracking: true,
      enableErrorTracking: true,
      enablePerformanceScoring: true,
      enableLocalStorage: true,
      enableConsoleLogging: false,
      enablePerformanceAPI: true,
      samplingRate: 1.0,
      maxEventsInMemory: 1000,
      localStorageKey: 'map_performance_metrics',
      thresholds: {
        maxInitializationTime: 2000,
        maxMapLoadTime: 3000,
        maxMarkerCreationTime: 100,
        maxClusteringTime: 500,
        maxNavigationTime: 200,
        maxFilteringTime: 100,
        maxMemoryUsage: 100,
        maxMemoryPeak: 150,
        maxErrorsPerSession: 10,
        maxErrorRate: 5,
        minOverallScore: 80,
        minInitializationScore: 70,
        minRenderingScore: 75,
        minNavigationScore: 80,
        minMemoryScore: 70,
      },
      ...config,
    };

    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();
  }

  public static getInstance(config?: Partial<MapPerformanceConfig>): MapPerformanceMonitoringService {
    if (!MapPerformanceMonitoringService.instance) {
      MapPerformanceMonitoringService.instance = new MapPerformanceMonitoringService(config);
    }
    return MapPerformanceMonitoringService.instance;
  }

  private initializeMetrics(): MapPerformanceMetrics {
    return {
      mapInitializationTime: 0,
      mapLoadTime: 0,
      apiLoadTime: 0,
      markerCreationTime: 0,
      markerUpdateTime: 0,
      markerDeletionTime: 0,
      totalMarkersCreated: 0,
      totalMarkersUpdated: 0,
      totalMarkersDeleted: 0,
      clusteringTime: 0,
      clusteringAlgorithm: '',
      clustersCreated: 0,
      markersPerCluster: 0,
      navigationTime: 0,
      boundsUpdateTime: 0,
      zoomChangeTime: 0,
      centerChangeTime: 0,
      filteringTime: 0,
      filteredAppointments: 0,
      totalAppointments: 0,
      memoryUsage: 0,
      memoryPeak: 0,
      memoryLeaks: 0,
      totalErrors: 0,
      errorTypes: {},
      lastError: null,
      overallScore: 100,
      initializationScore: 100,
      renderingScore: 100,
      navigationScore: 100,
      memoryScore: 100,
      firstLoad: Date.now(),
      lastUpdate: Date.now(),
      sessionDuration: 0,
    };
  }

  public startMonitoring(): void {
    if (this.isMonitoring || !this.config.enableMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();

    if (this.config.enablePerformanceAPI && 'PerformanceObserver' in window) {
      this.setupPerformanceObservers();
    }

    if (this.config.enableMemoryTracking && 'memory' in performance) {
      this.startMemoryTracking();
    }

    if (this.config.enableConsoleLogging) {
      console.log('Map Performance Monitoring started');
    }

    // Load previous metrics from localStorage
    if (this.config.enableLocalStorage) {
      this.loadMetricsFromStorage();
    }
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
      this.memoryObserver = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    // Save metrics to localStorage
    if (this.config.enableLocalStorage) {
      this.saveMetricsToStorage();
    }

    if (this.config.enableConsoleLogging) {
      console.log('Map Performance Monitoring stopped');
    }
  }

  private setupPerformanceObservers(): void {
    // Memory observer
    if (this.config.enableMemoryTracking) {
      try {
        this.memoryObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'memory') {
              this.updateMemoryMetrics((entry as any).usedJSHeapSize);
            }
          });
        });
        this.memoryObserver.observe({ entryTypes: ['memory'] });
      } catch (error) {
        console.warn('Memory tracking not supported:', error);
      }
    }

    // Performance observer for custom marks and measures
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.processPerformanceEntry(entry);
        });
      });
      this.performanceObserver.observe({ entryTypes: ['mark', 'measure'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  private startMemoryTracking(): void {
    const trackMemory = () => {
      if (this.isMonitoring && 'memory' in performance) {
        const memory = (performance as any).memory;
        this.updateMemoryMetrics(memory.usedJSHeapSize);
      }
    };

    // Track memory every 5 seconds
    setInterval(trackMemory, 5000);
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    const event: MapPerformanceEvent = {
      type: this.getEventTypeFromName(entry.name),
      operation: entry.name,
      duration: entry.duration,
      timestamp: entry.startTime,
    };

    this.addEvent(event);
  }

  private getEventTypeFromName(name: string): MapPerformanceEvent['type'] {
    if (name.includes('init') || name.includes('load')) return 'initialization';
    if (name.includes('marker')) return 'marker_operation';
    if (name.includes('cluster')) return 'clustering';
    if (name.includes('nav') || name.includes('bounds') || name.includes('zoom')) return 'navigation';
    if (name.includes('filter')) return 'filtering';
    if (name.includes('error')) return 'error';
    if (name.includes('memory')) return 'memory';
    return 'initialization';
  }

  public trackMapInitialization(duration: number): void {
    if (!this.shouldTrack()) return;

    this.metrics.mapInitializationTime = duration;
    this.addEvent({
      type: 'initialization',
      operation: 'map_initialization',
      duration,
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent('Map initialization', duration);
  }

  public trackMapLoad(duration: number): void {
    if (!this.shouldTrack()) return;

    this.metrics.mapLoadTime = duration;
    this.addEvent({
      type: 'initialization',
      operation: 'map_load',
      duration,
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent('Map load', duration);
  }

  public trackApiLoad(duration: number): void {
    if (!this.shouldTrack()) return;

    this.metrics.apiLoadTime = duration;
    this.addEvent({
      type: 'initialization',
      operation: 'api_load',
      duration,
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent('API load', duration);
  }

  public trackMarkerCreation(duration: number, count: number = 1): void {
    if (!this.shouldTrack()) return;

    this.metrics.markerCreationTime = duration;
    this.metrics.totalMarkersCreated += count;
    this.addEvent({
      type: 'marker_operation',
      operation: 'marker_creation',
      duration,
      metadata: { count },
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent(`Marker creation (${count})`, duration);
  }

  public trackMarkerUpdate(duration: number, count: number = 1): void {
    if (!this.shouldTrack()) return;

    this.metrics.markerUpdateTime = duration;
    this.metrics.totalMarkersUpdated += count;
    this.addEvent({
      type: 'marker_operation',
      operation: 'marker_update',
      duration,
      metadata: { count },
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent(`Marker update (${count})`, duration);
  }

  public trackMarkerDeletion(duration: number, count: number = 1): void {
    if (!this.shouldTrack()) return;

    this.metrics.markerDeletionTime = duration;
    this.metrics.totalMarkersDeleted += count;
    this.addEvent({
      type: 'marker_operation',
      operation: 'marker_deletion',
      duration,
      metadata: { count },
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent(`Marker deletion (${count})`, duration);
  }

  public trackClustering(duration: number, algorithm: string, clusters: number, markersPerCluster: number): void {
    if (!this.shouldTrack()) return;

    this.metrics.clusteringTime = duration;
    this.metrics.clusteringAlgorithm = algorithm;
    this.metrics.clustersCreated = clusters;
    this.metrics.markersPerCluster = markersPerCluster;
    this.addEvent({
      type: 'clustering',
      operation: 'clustering',
      duration,
      metadata: { algorithm, clusters, markersPerCluster },
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent(`Clustering (${algorithm})`, duration);
  }

  public trackNavigation(duration: number, operation: 'bounds' | 'zoom' | 'center' | 'general'): void {
    if (!this.shouldTrack()) return;

    this.metrics.navigationTime = duration;

    switch (operation) {
      case 'bounds':
        this.metrics.boundsUpdateTime = duration;
        break;
      case 'zoom':
        this.metrics.zoomChangeTime = duration;
        break;
      case 'center':
        this.metrics.centerChangeTime = duration;
        break;
    }

    this.addEvent({
      type: 'navigation',
      operation: `navigation_${operation}`,
      duration,
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent(`Navigation (${operation})`, duration);
  }

  public trackFiltering(duration: number, filtered: number, total: number): void {
    if (!this.shouldTrack()) return;

    this.metrics.filteringTime = duration;
    this.metrics.filteredAppointments = filtered;
    this.metrics.totalAppointments = total;
    this.addEvent({
      type: 'filtering',
      operation: 'filtering',
      duration,
      metadata: { filtered, total },
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent(`Filtering (${filtered}/${total})`, duration);
  }

  public trackError(error: MapError): void {
    if (!this.shouldTrack() || !this.config.enableErrorTracking) return;

    this.metrics.totalErrors++;
    this.metrics.lastError = error;

    const errorType = error.code || 'UNKNOWN';
    this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;

    this.addEvent({
      type: 'error',
      operation: 'error',
      duration: 0,
      metadata: { error: error.code, message: error.message },
      timestamp: Date.now(),
    });

    this.updatePerformanceScores();
    this.logEvent(`Error: ${error.code}`, 0);
  }

  private updateMemoryMetrics(usedMemory: number): void {
    const memoryMB = usedMemory / (1024 * 1024);
    this.metrics.memoryUsage = memoryMB;

    if (memoryMB > this.metrics.memoryPeak) {
      this.metrics.memoryPeak = memoryMB;
    }

    this.addEvent({
      type: 'memory',
      operation: 'memory_usage',
      duration: 0,
      metadata: { memoryMB },
      timestamp: Date.now(),
    });
  }

  private addEvent(event: MapPerformanceEvent): void {
    if (this.events.length >= this.config.maxEventsInMemory) {
      this.events.shift(); // Remove oldest event
    }

    this.events.push(event);
    this.metrics.lastUpdate = Date.now();
    this.metrics.sessionDuration = this.metrics.lastUpdate - this.metrics.firstLoad;
  }

  private shouldTrack(): boolean {
    return this.isMonitoring && Math.random() < this.config.samplingRate;
  }

  private updatePerformanceScores(): void {
    if (!this.config.enablePerformanceScoring) return;

    // Calculate individual scores
    this.metrics.initializationScore = this.calculateInitializationScore();
    this.metrics.renderingScore = this.calculateRenderingScore();
    this.metrics.navigationScore = this.calculateNavigationScore();
    this.metrics.memoryScore = this.calculateMemoryScore();

    // Calculate overall score
    this.metrics.overallScore = Math.round(
      (this.metrics.initializationScore +
       this.metrics.renderingScore +
       this.metrics.navigationScore +
       this.metrics.memoryScore) / 4
    );
  }

  private calculateInitializationScore(): number {
    const { thresholds } = this.config;
    let score = 100;

    if (this.metrics.mapInitializationTime > thresholds.maxInitializationTime) {
      score -= 20;
    }
    if (this.metrics.mapLoadTime > thresholds.maxMapLoadTime) {
      score -= 20;
    }
    if (this.metrics.apiLoadTime > thresholds.maxMapLoadTime) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  private calculateRenderingScore(): number {
    const { thresholds } = this.config;
    let score = 100;

    if (this.metrics.markerCreationTime > thresholds.maxMarkerCreationTime) {
      score -= 15;
    }
    if (this.metrics.clusteringTime > thresholds.maxClusteringTime) {
      score -= 15;
    }
    if (this.metrics.filteringTime > thresholds.maxFilteringTime) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  private calculateNavigationScore(): number {
    const { thresholds } = this.config;
    let score = 100;

    if (this.metrics.navigationTime > thresholds.maxNavigationTime) {
      score -= 20;
    }
    if (this.metrics.boundsUpdateTime > thresholds.maxNavigationTime) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  private calculateMemoryScore(): number {
    const { thresholds } = this.config;
    let score = 100;

    if (this.metrics.memoryUsage > thresholds.maxMemoryUsage) {
      score -= 20;
    }
    if (this.metrics.memoryPeak > thresholds.maxMemoryPeak) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  private logEvent(operation: string, duration: number): void {
    if (!this.config.enableConsoleLogging) return;

    const status = this.getPerformanceStatus(operation, duration);
    console.log(`[Map Performance] ${operation}: ${duration}ms ${status}`);
  }

  private getPerformanceStatus(operation: string, duration: number): string {
    const { thresholds } = this.config;

    if (operation.includes('initialization') && duration > thresholds.maxInitializationTime) {
      return '⚠️ SLOW';
    }
    if (operation.includes('marker') && duration > thresholds.maxMarkerCreationTime) {
      return '⚠️ SLOW';
    }
    if (operation.includes('clustering') && duration > thresholds.maxClusteringTime) {
      return '⚠️ SLOW';
    }
    if (operation.includes('navigation') && duration > thresholds.maxNavigationTime) {
      return '⚠️ SLOW';
    }
    if (operation.includes('filtering') && duration > thresholds.maxFilteringTime) {
      return '⚠️ SLOW';
    }

    return '✅ OK';
  }

  private saveMetricsToStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const data = {
        metrics: this.metrics,
        events: this.events.slice(-100), // Save last 100 events
        timestamp: Date.now(),
      };
      localStorage.setItem(this.config.localStorageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save performance metrics to localStorage:', error);
    }
  }

  private loadMetricsFromStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const data = localStorage.getItem(this.config.localStorageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.metrics) {
          this.metrics = { ...this.metrics, ...parsed.metrics };
        }
        if (parsed.events) {
          this.events = parsed.events;
        }
      }
    } catch (error) {
      console.warn('Failed to load performance metrics from localStorage:', error);
    }
  }

  public getMetrics(): MapPerformanceMetrics {
    return { ...this.metrics };
  }

  public getEvents(): MapPerformanceEvent[] {
    return [...this.events];
  }

  public getPerformanceReport(): string {
    const { metrics } = this;
    const report = [
      '=== Map Performance Report ===',
      `Overall Score: ${metrics.overallScore}/100`,
      `Session Duration: ${Math.round(metrics.sessionDuration / 1000)}s`,
      '',
      'Initialization:',
      `  Map Init: ${metrics.mapInitializationTime}ms (Score: ${metrics.initializationScore}/100)`,
      `  Map Load: ${metrics.mapLoadTime}ms`,
      `  API Load: ${metrics.apiLoadTime}ms`,
      '',
      'Rendering:',
      `  Markers Created: ${metrics.totalMarkersCreated}`,
      `  Marker Creation Time: ${metrics.markerCreationTime}ms`,
      `  Clustering Time: ${metrics.clusteringTime}ms (${metrics.clusteringAlgorithm})`,
      `  Clusters: ${metrics.clustersCreated}`,
      '',
      'Navigation:',
      `  Navigation Time: ${metrics.navigationTime}ms (Score: ${metrics.navigationScore}/100)`,
      `  Bounds Update: ${metrics.boundsUpdateTime}ms`,
      `  Zoom Change: ${metrics.zoomChangeTime}ms`,
      '',
      'Memory:',
      `  Current Usage: ${metrics.memoryUsage.toFixed(2)}MB`,
      `  Peak Usage: ${metrics.memoryPeak.toFixed(2)}MB (Score: ${metrics.memoryScore}/100)`,
      '',
      'Errors:',
      `  Total Errors: ${metrics.totalErrors}`,
      `  Error Types: ${JSON.stringify(metrics.errorTypes)}`,
    ];

    return report.join('\n');
  }

  public reset(): void {
    this.metrics = this.initializeMetrics();
    this.events = [];
    this.startTime = Date.now();
  }

  public updateConfig(newConfig: Partial<MapPerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export default MapPerformanceMonitoringService;
