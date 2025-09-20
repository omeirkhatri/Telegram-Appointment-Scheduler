import { Loader } from '@googlemaps/js-api-loader';

/**
 * Google Maps API Configuration Service
 *
 * This service handles Google Maps API initialization, error handling,
 * and provides a centralized configuration for the entire application.
 */

export interface GoogleMapsConfig {
  apiKey: string;
  libraries: string[];
  language?: string;
  region?: string;
  version?: string;
}

export interface GoogleMapsError {
  code: string;
  message: string;
  details?: any;
}

export class GoogleMapsService {
  private static instance: GoogleMapsService;
  private loader: Loader | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private config: GoogleMapsConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance of GoogleMapsService
   */
  public static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  /**
   * Initialize Google Maps API with configuration
   */
  public async initialize(config: GoogleMapsConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.config = config;
    this.initializationPromise = this._performInitialization();

    try {
      await this.initializationPromise;
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Get the Google Maps Loader instance
   */
  public getLoader(): Loader {
    if (!this.loader) {
      throw new Error('Google Maps API not initialized. Call initialize() first.');
    }
    return this.loader;
  }

  /**
   * Check if Google Maps API is initialized
   */
  public isApiInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  public getConfig(): GoogleMapsConfig | null {
    return this.config;
  }

  /**
   * Reset the service (useful for testing)
   */
  public reset(): void {
    this.loader = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.config = null;
  }

  /**
   * Validate API key format
   */
  public static validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Check for placeholder values
    const placeholderValues = [
      'your-google-maps-api-key-here',
      'your-actual-api-key-here',
      'your-api-key-here',
      'AIzaSy...', // Common placeholder pattern
      'REPLACE_WITH_YOUR_API_KEY',
      'INSERT_YOUR_API_KEY_HERE'
    ];

    if (placeholderValues.some(placeholder =>
      apiKey.toLowerCase().includes(placeholder.toLowerCase())
    )) {
      return false;
    }

    // Basic validation - Google Maps API keys are typically 35-45 characters
    // and contain alphanumeric characters and some special characters
    const apiKeyPattern = /^[A-Za-z0-9_-]{35,45}$/;

    // Additional check to ensure it's not just numbers
    if (/^\d+$/.test(apiKey)) {
      return false;
    }

    return apiKeyPattern.test(apiKey);
  }

  /**
   * Get default configuration for development
   */
  public static getDefaultConfig(): Partial<GoogleMapsConfig> {
    return {
      libraries: ['places', 'geometry'],
      language: 'en',
      region: 'AE', // United Arab Emirates
      version: 'weekly'
    };
  }

  /**
   * Perform the actual initialization
   */
  private async _performInitialization(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not provided');
    }

    // Validate API key
    if (!GoogleMapsService.validateApiKey(this.config.apiKey)) {
      const errorMessage = this._getApiKeyErrorMessage(this.config.apiKey);
      throw new Error(errorMessage);
    }

    try {
      this.loader = new Loader({
        apiKey: this.config.apiKey,
        version: this.config.version || 'weekly',
        libraries: this.config.libraries || ['places', 'geometry'],
        language: this.config.language || 'en',
        region: this.config.region || 'AE'
      });

      await this.loader.load();
      this.isInitialized = true;
    } catch (error) {
      const mapsError = this._handleInitializationError(error);
      throw mapsError;
    }
  }

  /**
   * Get descriptive error message for API key issues
   */
  private _getApiKeyErrorMessage(apiKey: string): string {
    if (!apiKey) {
      return 'Google Maps API key is not set. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.';
    }

    if (apiKey === 'your-google-maps-api-key-here' ||
        apiKey === 'your-actual-api-key-here' ||
        apiKey === 'your-api-key-here') {
      return 'Google Maps API key is set to placeholder value. Please replace with your actual API key from Google Cloud Console.';
    }

    if (apiKey.length < 35) {
      return 'Google Maps API key appears to be too short. Please check your API key from Google Cloud Console.';
    }

    if (apiKey.length > 45) {
      return 'Google Maps API key appears to be too long. Please check your API key from Google Cloud Console.';
    }

    return 'Invalid Google Maps API key format. Please check your API key from Google Cloud Console.';
  }

  /**
   * Handle initialization errors and convert them to standardized format
   */
  private _handleInitializationError(error: any): GoogleMapsError {
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'An unknown error occurred during Google Maps initialization';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific Google Maps API errors
      if (error.message.includes('InvalidKeyMapError')) {
        errorCode = 'INVALID_API_KEY';
        errorMessage = 'Invalid Google Maps API key. Please check your API key configuration.';
      } else if (error.message.includes('RefererNotAllowedMapError')) {
        errorCode = 'REFERER_NOT_ALLOWED';
        errorMessage = 'API key referrer restrictions do not allow this domain. Please update your API key restrictions.';
      } else if (error.message.includes('QuotaExceededError')) {
        errorCode = 'QUOTA_EXCEEDED';
        errorMessage = 'Google Maps API quota exceeded. Please check your billing and usage limits.';
      } else if (error.message.includes('RequestDeniedMapError')) {
        errorCode = 'REQUEST_DENIED';
        errorMessage = 'Google Maps API request was denied. Please check your API key permissions.';
      } else if (error.message.toLowerCase().includes('network')) {
        errorCode = 'NETWORK_ERROR';
        errorMessage = 'Network error occurred while loading Google Maps API. Please check your internet connection.';
      }
    }

    return {
      code: errorCode,
      message: errorMessage,
      details: error
    };
  }
}

/**
 * Convenience function to get the Google Maps service instance
 */
export const getGoogleMapsService = (): GoogleMapsService => {
  return GoogleMapsService.getInstance();
};

/**
 * Initialize Google Maps with environment configuration
 */
export const initializeGoogleMaps = async (): Promise<void> => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is not set');
  }

  const service = getGoogleMapsService();
  const config: GoogleMapsConfig = {
    apiKey,
    ...GoogleMapsService.getDefaultConfig()
  } as GoogleMapsConfig;

  await service.initialize(config);
};

export default GoogleMapsService;
