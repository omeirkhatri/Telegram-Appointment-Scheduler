import { GoogleMapsService, type GoogleMapsConfig } from './googleMapsService';

/**
 * Google Maps Lazy Loader Service
 *
 * This service implements lazy loading for the Google Maps API to improve
 * initial page load performance. The API is only loaded when actually needed.
 */

export interface LazyLoadOptions {
  // Intersection Observer options for viewport-based loading
  rootMargin?: string;
  threshold?: number | number[];

  // Timeout options
  loadTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;

  // Performance options
  preloadOnHover?: boolean;
  preloadDelay?: number;

  // Debug options
  enableLogging?: boolean;
}

export interface LazyLoadState {
  isLoading: boolean;
  isLoaded: boolean;
  isError: boolean;
  error: Error | null;
  loadTime: number | null;
  retryCount: number;
}

export class GoogleMapsLazyLoader {
  private static instance: GoogleMapsLazyLoader;
  private loadPromise: Promise<void> | null = null;
  private state: LazyLoadState = {
    isLoading: false,
    isLoaded: false,
    isError: false,
    error: null,
    loadTime: null,
    retryCount: 0
  };

  private config: GoogleMapsConfig | null = null;
  private options: LazyLoadOptions;
  private observer: IntersectionObserver | null = null;
  private hoverTimeout: NodeJS.Timeout | null = null;
  private loadTimeout: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;

  private constructor(options: LazyLoadOptions = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      loadTimeout: 10000, // 10 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      preloadOnHover: true,
      preloadDelay: 500, // 500ms delay before preloading on hover
      enableLogging: process.env.NODE_ENV === 'development',
      ...options
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: LazyLoadOptions): GoogleMapsLazyLoader {
    if (!GoogleMapsLazyLoader.instance) {
      GoogleMapsLazyLoader.instance = new GoogleMapsLazyLoader(options);
    }
    return GoogleMapsLazyLoader.instance;
  }

  /**
   * Initialize lazy loading with configuration
   */
  public initialize(config: GoogleMapsConfig): void {
    this.config = config;
    this.log('Lazy loader initialized with config:', config);
  }

  /**
   * Set up lazy loading for a map container element
   */
  public setupLazyLoading(
    containerElement: HTMLElement,
    onLoad?: () => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!this.config) {
      throw new Error('Lazy loader not initialized. Call initialize() first.');
    }

    // If already loaded, call onLoad immediately
    if (this.state.isLoaded) {
      onLoad?.();
      return () => {};
    }

    // If currently loading, wait for it to complete
    if (this.state.isLoading && this.loadPromise) {
      this.loadPromise.then(() => {
        if (this.state.isLoaded) {
          onLoad?.();
        } else if (this.state.isError) {
          onError?.(this.state.error!);
        }
      });
      return () => {};
    }

    // Set up intersection observer for viewport-based loading
    this.setupIntersectionObserver(containerElement, onLoad, onError);

    // Set up hover-based preloading
    if (this.options.preloadOnHover) {
      this.setupHoverPreloading(containerElement, onLoad, onError);
    }

    // Return cleanup function
    return () => {
      this.cleanup();
    };
  }

  /**
   * Force load the Google Maps API immediately
   */
  public async forceLoad(): Promise<void> {
    if (this.state.isLoaded) {
      return;
    }

    if (this.state.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    return this.performLoad();
  }

  /**
   * Get current loading state
   */
  public getState(): LazyLoadState {
    return { ...this.state };
  }

  /**
   * Check if Google Maps is loaded
   */
  public isLoaded(): boolean {
    return this.state.isLoaded;
  }

  /**
   * Reset the lazy loader state
   */
  public reset(): void {
    this.cleanup();
    this.state = {
      isLoading: false,
      isLoaded: false,
      isError: false,
      error: null,
      loadTime: null,
      retryCount: 0
    };
    this.loadPromise = null;
  }

  /**
   * Set up intersection observer for viewport-based loading
   */
  private setupIntersectionObserver(
    containerElement: HTMLElement,
    onLoad?: () => void,
    onError?: (error: Error) => void
  ): void {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      this.log('IntersectionObserver not supported, loading immediately');
      this.performLoad().then(() => onLoad?.()).catch(error => onError?.(error));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.log('Map container is in viewport, starting lazy load');
            this.performLoad().then(() => onLoad?.()).catch(error => onError?.(error));
            this.observer?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );

    this.observer.observe(containerElement);

    // Check if element is already in viewport
    const rect = containerElement.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (isVisible) {
      this.log('Map container is already visible, loading immediately');
      this.performLoad().then(() => onLoad?.()).catch(error => onError?.(error));
    }
  }

  /**
   * Set up hover-based preloading
   */
  private setupHoverPreloading(
    containerElement: HTMLElement,
    onLoad?: () => void,
    onError?: (error: Error) => void
  ): void {
    const handleMouseEnter = () => {
      if (this.state.isLoaded || this.state.isLoading) {
        return;
      }

      this.log('Mouse hover detected, scheduling preload');
      this.hoverTimeout = setTimeout(() => {
        this.log('Preload delay completed, starting load');
        this.performLoad().then(() => onLoad?.()).catch(error => onError?.(error));
      }, this.options.preloadDelay);
    };

    const handleMouseLeave = () => {
      if (this.hoverTimeout) {
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = null;
        this.log('Mouse left, cancelled preload');
      }
    };

    containerElement.addEventListener('mouseenter', handleMouseEnter);
    containerElement.addEventListener('mouseleave', handleMouseLeave);

    // Store cleanup function
    this.cleanupHover = () => {
      containerElement.removeEventListener('mouseenter', handleMouseEnter);
      containerElement.removeEventListener('mouseleave', handleMouseLeave);
      if (this.hoverTimeout) {
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = null;
      }
    };
  }

  /**
   * Perform the actual Google Maps API loading
   */
  private async performLoad(): Promise<void> {
    if (this.state.isLoaded) {
      return;
    }

    if (this.state.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.state.isLoading = true;
    this.state.isError = false;
    this.state.error = null;

    const startTime = performance.now();

    this.loadPromise = this.loadWithRetry();

    // Set up timeout
    this.loadTimeout = setTimeout(() => {
      if (this.state.isLoading) {
        this.handleLoadError(new Error('Google Maps API load timeout'));
      }
    }, this.options.loadTimeout);

    try {
      await this.loadPromise;
      const loadTime = performance.now() - startTime;
      this.state.loadTime = loadTime;
      this.state.isLoaded = true;
      this.state.isLoading = false;
      this.log(`Google Maps API loaded successfully in ${loadTime.toFixed(2)}ms`);
    } catch (error) {
      this.handleLoadError(error as Error);
    } finally {
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
        this.loadTimeout = null;
      }
    }
  }

  /**
   * Load with retry logic
   */
  private async loadWithRetry(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.retryAttempts!; attempt++) {
      try {
        this.log(`Loading attempt ${attempt + 1}/${this.options.retryAttempts! + 1}`);

        if (!this.config) {
          throw new Error('Configuration not provided');
        }

        // Get or create Google Maps service
        const service = GoogleMapsService.getInstance();

        // Initialize the service
        await service.initialize(this.config);

        this.log('Google Maps API loaded successfully');
        return;
      } catch (error) {
        lastError = error as Error;
        this.log(`Load attempt ${attempt + 1} failed:`, error);

        if (attempt < this.options.retryAttempts!) {
          this.state.retryCount = attempt + 1;
          this.log(`Retrying in ${this.options.retryDelay}ms...`);
          await this.delay(this.options.retryDelay!);
        }
      }
    }

    throw lastError || new Error('Failed to load Google Maps API after all retry attempts');
  }

  /**
   * Handle load error
   */
  private handleLoadError(error: Error): void {
    this.state.isError = true;
    this.state.error = error;
    this.state.isLoading = false;
    this.log('Google Maps API load failed:', error);
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.cleanupHover?.();
  }

  /**
   * Cleanup function for hover events
   */
  private cleanupHover?: () => void;

  /**
   * Utility function to create a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.retryTimeout = setTimeout(resolve, ms);
    });
  }

  /**
   * Logging utility
   */
  private log(message: string, ...args: any[]): void {
    if (this.options.enableLogging) {
      console.log(`[GoogleMapsLazyLoader] ${message}`, ...args);
    }
  }
}

/**
 * Convenience function to get the lazy loader instance
 */
export const getGoogleMapsLazyLoader = (options?: LazyLoadOptions): GoogleMapsLazyLoader => {
  return GoogleMapsLazyLoader.getInstance(options);
};

/**
 * Initialize lazy loader with environment configuration
 */
export const initializeLazyLoader = (): GoogleMapsLazyLoader => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is not set');
  }

  const config: GoogleMapsConfig = {
    apiKey,
    libraries: ['places', 'geometry'],
    language: 'en',
    region: 'AE',
    version: 'weekly'
  };

  const lazyLoader = getGoogleMapsLazyLoader();
  lazyLoader.initialize(config);

  return lazyLoader;
};

export default GoogleMapsLazyLoader;
