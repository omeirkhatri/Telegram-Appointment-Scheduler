import { GoogleMapsService } from './googleMapsService';

/**
 * Google Maps API Monitoring Service
 *
 * This service handles API key validation, quota monitoring,
 * and usage tracking for Google Maps API calls.
 */

export interface QuotaInfo {
  requestsPerDay: number;
  requestsPerMinute: number;
  requestsPerSecond: number;
  requestsUsed: number;
  requestsRemaining: number;
  resetTime: Date;
}

export interface ApiKeyStatus {
  isValid: boolean;
  hasQuota: boolean;
  quotaInfo?: QuotaInfo;
  lastChecked: Date;
  error?: string;
}

export interface UsageMetrics {
  totalRequests: number;
  mapsRequests: number;
  placesRequests: number;
  errors: number;
  lastRequestTime: Date;
  dailyUsage: { [date: string]: number };
}

export class GoogleMapsMonitoringService {
  private static instance: GoogleMapsMonitoringService;
  private usageMetrics: UsageMetrics;
  private apiKeyStatus: ApiKeyStatus | null = null;
  private quotaCheckInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'google_maps_usage_metrics';
  private readonly QUOTA_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.usageMetrics = this.loadUsageMetrics();
  }

  /**
   * Get singleton instance of GoogleMapsMonitoringService
   */
  public static getInstance(): GoogleMapsMonitoringService {
    if (!GoogleMapsMonitoringService.instance) {
      GoogleMapsMonitoringService.instance = new GoogleMapsMonitoringService();
    }
    return GoogleMapsMonitoringService.instance;
  }

  /**
   * Initialize monitoring service
   */
  public async initialize(): Promise<void> {
    await this.validateApiKey();
    this.startQuotaMonitoring();
  }

  /**
   * Validate API key and check quota
   */
  public async validateApiKey(): Promise<ApiKeyStatus> {
    try {
      const googleMapsService = GoogleMapsService.getInstance();
      const config = googleMapsService.getConfig();

      if (!config) {
        throw new Error('Google Maps service not initialized');
      }

      // Test API key by attempting to load the API
      if (!googleMapsService.isApiInitialized()) {
        await googleMapsService.initialize(config);
      }

      // Simulate quota check (in real implementation, this would call Google's quota API)
      const quotaInfo = await this.checkQuotaInfo(config.apiKey);

      this.apiKeyStatus = {
        isValid: true,
        hasQuota: quotaInfo.requestsRemaining > 0,
        quotaInfo,
        lastChecked: new Date()
      };

      return this.apiKeyStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.apiKeyStatus = {
        isValid: false,
        hasQuota: false,
        lastChecked: new Date(),
        error: errorMessage
      };

      return this.apiKeyStatus;
    }
  }

  /**
   * Record API usage
   */
  public recordUsage(apiType: 'maps' | 'places'): void {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    this.usageMetrics.totalRequests++;
    this.usageMetrics.lastRequestTime = now;

    switch (apiType) {
      case 'maps':
        this.usageMetrics.mapsRequests++;
        break;
      case 'places':
        this.usageMetrics.placesRequests++;
        break;
    }

    // Update daily usage
    if (!this.usageMetrics.dailyUsage[today]) {
      this.usageMetrics.dailyUsage[today] = 0;
    }
    this.usageMetrics.dailyUsage[today]++;

    this.saveUsageMetrics();
  }

  /**
   * Record API error
   */
  public recordError(error: Error): void {
    this.usageMetrics.errors++;
    this.saveUsageMetrics();
  }

  /**
   * Get current usage metrics
   */
  public getUsageMetrics(): UsageMetrics {
    return { ...this.usageMetrics };
  }

  /**
   * Get API key status
   */
  public getApiKeyStatus(): ApiKeyStatus | null {
    return this.apiKeyStatus ? { ...this.apiKeyStatus } : null;
  }

  /**
   * Check if API key is valid and has quota
   */
  public isApiKeyValid(): boolean {
    return this.apiKeyStatus?.isValid === true && this.apiKeyStatus?.hasQuota === true;
  }

  /**
   * Get quota warning level
   */
  public getQuotaWarningLevel(): 'low' | 'medium' | 'high' | 'none' {
    if (!this.apiKeyStatus?.quotaInfo) {
      return 'none';
    }

    const { requestsRemaining, requestsPerDay } = this.apiKeyStatus.quotaInfo;
    const usagePercentage = (requestsPerDay - requestsRemaining) / requestsPerDay;

    if (usagePercentage >= 0.9) return 'high';
    if (usagePercentage >= 0.7) return 'medium';
    if (usagePercentage >= 0.5) return 'low';
    return 'none';
  }

  /**
   * Get usage statistics for the last N days
   */
  public getUsageStats(days: number = 7): { date: string; requests: number }[] {
    const stats: { date: string; requests: number }[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      stats.push({
        date: dateString,
        requests: this.usageMetrics.dailyUsage[dateString] || 0
      });
    }

    return stats.reverse();
  }

  /**
   * Reset usage metrics
   */
  public resetUsageMetrics(): void {
    this.usageMetrics = {
      totalRequests: 0,
      mapsRequests: 0,
      placesRequests: 0,
      errors: 0,
      lastRequestTime: new Date(),
      dailyUsage: {}
    };
    this.saveUsageMetrics();
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.quotaCheckInterval) {
      clearInterval(this.quotaCheckInterval);
      this.quotaCheckInterval = null;
    }
  }

  /**
   * Reset the service (useful for testing)
   */
  public reset(): void {
    this.stopMonitoring();
    this.usageMetrics = this.getDefaultUsageMetrics();
    this.apiKeyStatus = null;
  }

  /**
   * Start quota monitoring
   */
  private startQuotaMonitoring(): void {
    this.quotaCheckInterval = setInterval(async () => {
      try {
        await this.validateApiKey();
      } catch (error) {
        console.error('Error during quota monitoring:', error);
      }
    }, this.QUOTA_CHECK_INTERVAL);
  }

  /**
   * Check quota information (simulated - in real implementation, call Google's API)
   */
  private async checkQuotaInfo(apiKey: string): Promise<QuotaInfo> {
    // In a real implementation, this would call Google's quota API
    // For now, we'll simulate based on usage metrics
    const dailyUsage = this.usageMetrics.dailyUsage[new Date().toISOString().split('T')[0]] || 0;
    const requestsPerDay = 25000; // Typical free tier limit
    const requestsPerMinute = 50;
    const requestsPerSecond = 10;

    return {
      requestsPerDay,
      requestsPerMinute,
      requestsPerSecond,
      requestsUsed: dailyUsage,
      requestsRemaining: Math.max(0, requestsPerDay - dailyUsage),
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
    };
  }

  /**
   * Load usage metrics from localStorage
   */
  private loadUsageMetrics(): UsageMetrics {
    if (typeof window === 'undefined') {
      return this.getDefaultUsageMetrics();
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        parsed.lastRequestTime = new Date(parsed.lastRequestTime);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading usage metrics:', error);
    }

    return this.getDefaultUsageMetrics();
  }

  /**
   * Save usage metrics to localStorage
   */
  private saveUsageMetrics(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.usageMetrics));
    } catch (error) {
      console.error('Error saving usage metrics:', error);
    }
  }

  /**
   * Get default usage metrics
   */
  private getDefaultUsageMetrics(): UsageMetrics {
    return {
      totalRequests: 0,
      mapsRequests: 0,
      placesRequests: 0,
      errors: 0,
      lastRequestTime: new Date(),
      dailyUsage: {}
    };
  }
}

/**
 * Convenience function to get the monitoring service instance
 */
export const getGoogleMapsMonitoringService = (): GoogleMapsMonitoringService => {
  return GoogleMapsMonitoringService.getInstance();
};

export default GoogleMapsMonitoringService;
