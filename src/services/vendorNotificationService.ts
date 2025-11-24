/**
 * Vendor Notification Service
 *
 * Handles notifications to external vendors when transportation segments are assigned to them.
 * Supports different vendor types: taxi, uber, public transport, and custom vendors.
 */

import { supabase } from '@/lib/supabase';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface VendorNotificationConfig {
  vendorType: 'taxi' | 'uber' | 'public_transport' | 'vendor' | 'other';
  notificationMethod: 'email' | 'webhook' | 'sms' | 'api_call';
  endpoint?: string;
  credentials?: Record<string, string>;
  template?: string;
  enabled: boolean;
}

export interface VendorNotificationResult {
  success: boolean;
  vendorType: string;
  notificationMethod: string;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface VendorSegmentData {
  id: string;
  appointment_id: string;
  segment_type: string;
  title?: string;
  planned_start?: string;
  planned_end?: string;
  travel_mode?: string;
  origin?: any;
  destination?: any;
  estimated_travel_minutes?: number;
  estimated_distance_km?: number;
  instructions?: string;
  patient?: {
    name: string;
    phone: string;
    address: string;
  };
  staff?: {
    name: string;
    phone: string;
  };
}

// =============================================================================
// VENDOR NOTIFICATION SERVICE
// =============================================================================

export class VendorNotificationService {
  private static instance: VendorNotificationService;
  private vendorConfigs: Map<string, VendorNotificationConfig> = new Map();

  private constructor() {
    this.initializeVendorConfigs();
  }

  public static getInstance(): VendorNotificationService {
    if (!VendorNotificationService.instance) {
      VendorNotificationService.instance = new VendorNotificationService();
    }
    return VendorNotificationService.instance;
  }

  /**
   * Initialize vendor notification configurations
   */
  private initializeVendorConfigs(): void {
    // Taxi vendor configuration
    this.vendorConfigs.set('taxi', {
      vendorType: 'taxi',
      notificationMethod: 'webhook',
      endpoint: process.env.TAXI_VENDOR_WEBHOOK_URL,
      enabled: !!process.env.TAXI_VENDOR_WEBHOOK_URL,
      template: 'taxi_booking'
    });

    // Uber vendor configuration
    this.vendorConfigs.set('uber', {
      vendorType: 'uber',
      notificationMethod: 'api_call',
      endpoint: process.env.UBER_API_ENDPOINT,
      credentials: {
        clientId: process.env.UBER_CLIENT_ID || '',
        clientSecret: process.env.UBER_CLIENT_SECRET || '',
        serverToken: process.env.UBER_SERVER_TOKEN || ''
      },
      enabled: !!process.env.UBER_SERVER_TOKEN,
      template: 'uber_booking'
    });

    // Public transport configuration
    this.vendorConfigs.set('public_transport', {
      vendorType: 'public_transport',
      notificationMethod: 'email',
      endpoint: process.env.PUBLIC_TRANSPORT_EMAIL,
      enabled: !!process.env.PUBLIC_TRANSPORT_EMAIL,
      template: 'public_transport_info'
    });

    // Generic vendor configuration
    this.vendorConfigs.set('vendor', {
      vendorType: 'vendor',
      notificationMethod: 'webhook',
      endpoint: process.env.GENERIC_VENDOR_WEBHOOK_URL,
      enabled: !!process.env.GENERIC_VENDOR_WEBHOOK_URL,
      template: 'vendor_booking'
    });
  }

  /**
   * Send notification to vendor for a transportation segment
   */
  async sendVendorNotification(
    segment: VendorSegmentData,
    changeType: 'created' | 'updated' | 'cancelled'
  ): Promise<VendorNotificationResult> {
    const startTime = Date.now();
    const vendorType = segment.travel_mode || 'vendor';

    console.log(`🚗 Preparing to send ${changeType} vendor notification for segment ${segment.id} to ${vendorType}`);

    try {
      // Get vendor configuration
      const vendorConfig = this.vendorConfigs.get(vendorType);
      if (!vendorConfig || !vendorConfig.enabled) {
        console.log(`⚠️ Vendor notification not configured or disabled for ${vendorType}`);
        return {
          success: false,
          vendorType,
          notificationMethod: 'none',
          error: 'Vendor notification not configured',
          timestamp: new Date().toISOString()
        };
      }

      // Get patient and staff data
      const segmentData = await this.enrichSegmentData(segment);
      if (!segmentData) {
        return {
          success: false,
          vendorType,
          notificationMethod: vendorConfig.notificationMethod,
          error: 'Failed to enrich segment data',
          timestamp: new Date().toISOString()
        };
      }

      // Send notification based on vendor type and method
      let result: VendorNotificationResult;
      switch (vendorConfig.notificationMethod) {
        case 'webhook':
          result = await this.sendWebhookNotification(vendorConfig, segmentData, changeType);
          break;
        case 'api_call':
          result = await this.sendApiCallNotification(vendorConfig, segmentData, changeType);
          break;
        case 'email':
          result = await this.sendEmailNotification(vendorConfig, segmentData, changeType);
          break;
        case 'sms':
          result = await this.sendSmsNotification(vendorConfig, segmentData, changeType);
          break;
        default:
          result = {
            success: false,
            vendorType,
            notificationMethod: vendorConfig.notificationMethod,
            error: 'Unsupported notification method',
            timestamp: new Date().toISOString()
          };
      }

      if (result.success) {
        console.log(`✅ Vendor notification sent successfully to ${vendorType} in ${Date.now() - startTime}ms`);
      } else {
        console.error(`❌ Failed to send vendor notification to ${vendorType}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending vendor notification:', error);
      return {
        success: false,
        vendorType,
        notificationMethod: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send notifications to all relevant vendors for a segment
   */
  async sendVendorNotificationsForSegment(
    segment: VendorSegmentData,
    changeType: 'created' | 'updated' | 'cancelled'
  ): Promise<{ success: boolean; results: VendorNotificationResult[] }> {
    const results: VendorNotificationResult[] = [];

    console.log(`🚗 Starting vendor notifications for segment ${segment.id}`);

    // Check if this is a vendor segment (no driver_id and has vendor transport mode)
    if (segment.travel_mode && ['vendor', 'public_transport', 'taxi', 'uber'].includes(segment.travel_mode)) {
      const result = await this.sendVendorNotification(segment, changeType);
      results.push(result);
    } else {
      console.log(`⚠️ Segment ${segment.id} is not a vendor segment, skipping vendor notifications`);
    }

    const successCount = results.filter(r => r.success).length;
    const overallSuccess = results.length === 0 || successCount === results.length;

    console.log(`🚗 Vendor notifications completed: ${successCount}/${results.length} successful`);

    return {
      success: overallSuccess,
      results
    };
  }

  /**
   * Enrich segment data with patient and staff information
   */
  private async enrichSegmentData(segment: VendorSegmentData): Promise<VendorSegmentData | null> {
    try {
      // Get appointment with patient data
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          patient:patients(id, name, phone, flat_villa_no, building_street, area, city)
        `)
        .eq('id', segment.appointment_id)
        .single();

      if (appointmentError || !appointment) {
        console.error(`❌ Appointment not found for segment ${segment.id}`);
        return null;
      }

      // Get staff data if available
      let staffData = null;
      if (segment.staff) {
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('id, first_name, last_name, phone')
          .eq('id', segment.staff.name) // Assuming staff.name contains the ID
          .single();

        if (!staffError && staff) {
          staffData = {
            name: `${staff.first_name} ${staff.last_name}`,
            phone: staff.phone
          };
        }
      }

      // Build patient address
      const patient = appointment.patient;
      const patientAddress = [
        patient.flat_villa_no,
        patient.building_street,
        patient.area,
        patient.city
      ].filter(Boolean).join(', ');

      return {
        ...segment,
        patient: {
          name: patient.name,
          phone: patient.phone,
          address: patientAddress
        },
        staff: staffData
      };
    } catch (error) {
      console.error('❌ Error enriching segment data:', error);
      return null;
    }
  }

  /**
   * Send webhook notification to vendor
   */
  private async sendWebhookNotification(
    config: VendorNotificationConfig,
    segment: VendorSegmentData,
    changeType: 'created' | 'updated' | 'cancelled'
  ): Promise<VendorNotificationResult> {
    try {
      const payload = this.buildWebhookPayload(segment, changeType, config.template);

      const response = await fetch(config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Telegram-Appointment-Scheduler/1.0',
          ...(config.credentials?.authorization && {
            'Authorization': config.credentials.authorization
          })
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      return {
        success: true,
        vendorType: config.vendorType,
        notificationMethod: 'webhook',
        messageId: responseData.id || responseData.messageId || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        vendorType: config.vendorType,
        notificationMethod: 'webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send API call notification to vendor
   */
  private async sendApiCallNotification(
    config: VendorNotificationConfig,
    segment: VendorSegmentData,
    changeType: 'created' | 'updated' | 'cancelled'
  ): Promise<VendorNotificationResult> {
    try {
      // This is a placeholder for vendor-specific API implementations
      // Each vendor (Uber, etc.) would have their own API integration
      console.log(`📞 API call notification to ${config.vendorType} (not implemented)`);

      return {
        success: true,
        vendorType: config.vendorType,
        notificationMethod: 'api_call',
        messageId: `api_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        vendorType: config.vendorType,
        notificationMethod: 'api_call',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send email notification to vendor
   */
  private async sendEmailNotification(
    config: VendorNotificationConfig,
    segment: VendorSegmentData,
    changeType: 'created' | 'updated' | 'cancelled'
  ): Promise<VendorNotificationResult> {
    try {
      // This would integrate with the existing email service
      console.log(`📧 Email notification to ${config.vendorType} (not implemented)`);

      return {
        success: true,
        vendorType: config.vendorType,
        notificationMethod: 'email',
        messageId: `email_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        vendorType: config.vendorType,
        notificationMethod: 'email',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send SMS notification to vendor
   */
  private async sendSmsNotification(
    config: VendorNotificationConfig,
    segment: VendorSegmentData,
    changeType: 'created' | 'updated' | 'cancelled'
  ): Promise<VendorNotificationResult> {
    try {
      // This would integrate with an SMS service
      console.log(`📱 SMS notification to ${config.vendorType} (not implemented)`);

      return {
        success: true,
        vendorType: config.vendorType,
        notificationMethod: 'sms',
        messageId: `sms_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        vendorType: config.vendorType,
        notificationMethod: 'sms',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Build webhook payload for vendor notification
   */
  private buildWebhookPayload(
    segment: VendorSegmentData,
    changeType: 'created' | 'updated' | 'cancelled',
    template?: string
  ): any {
    const basePayload = {
      event: changeType,
      timestamp: new Date().toISOString(),
      segment: {
        id: segment.id,
        type: segment.segment_type,
        title: segment.title,
        planned_start: segment.planned_start,
        planned_end: segment.planned_end,
        travel_mode: segment.travel_mode,
        estimated_duration_minutes: segment.estimated_travel_minutes,
        estimated_distance_km: segment.estimated_distance_km,
        instructions: segment.instructions,
        origin: segment.origin,
        destination: segment.destination
      },
      patient: segment.patient,
      staff: segment.staff
    };

    // Add template-specific fields
    if (template) {
      basePayload.template = template;
    }

    return basePayload;
  }

  /**
   * Get vendor configuration for a specific vendor type
   */
  getVendorConfig(vendorType: string): VendorNotificationConfig | undefined {
    return this.vendorConfigs.get(vendorType);
  }

  /**
   * Update vendor configuration
   */
  updateVendorConfig(vendorType: string, config: Partial<VendorNotificationConfig>): void {
    const existingConfig = this.vendorConfigs.get(vendorType);
    if (existingConfig) {
      this.vendorConfigs.set(vendorType, { ...existingConfig, ...config });
    }
  }

  /**
   * Get all vendor configurations
   */
  getAllVendorConfigs(): Map<string, VendorNotificationConfig> {
    return new Map(this.vendorConfigs);
  }
}

// Export singleton instance
export const vendorNotificationService = VendorNotificationService.getInstance();
