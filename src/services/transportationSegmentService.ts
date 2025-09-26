import { logCalendarOperation } from '@/lib/calendarOperations';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import type {
    CreateTransportationSegment,
    PickupLocationType,
    TransportationSegment,
    TransportationSegmentFilters,
    UpdateTransportationSegment,
} from '@/types/transportationSegment';
import { isValidPickupLocationType, requiresPickupLocationReference } from '@/types/transportationSegment';
import { appointmentStaffService } from './appointmentStaffService';
import { auditTrailService } from './auditTrailService';
import { getGoogleCalendarService } from './googleCalendarService';
import { telegramNotificationService } from './telegramNotificationService';

export class TransportationSegmentService {
  // Check if transportation segments feature is enabled
  private isFeatureEnabled(): boolean {
    return isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED');
  }

  // Get all transportation segments with optional filtering
  async getTransportationSegments(filters?: TransportationSegmentFilters): Promise<TransportationSegment[]> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return [];
    }

    let query = supabase
      .from('transportation_segments')
      .select(`
        *,
        driver:driver_id(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .order('planned_start', { ascending: true });

    // Apply filters
    if (filters?.appointment_id) {
      query = query.eq('appointment_id', filters.appointment_id);
    }

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.segment_type) {
      query = query.eq('segment_type', filters.segment_type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.requires_follow_up !== undefined) {
      query = query.eq('requires_follow_up', filters.requires_follow_up);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transportation segments: ${error.message}`);
    }

    return data || [];
  }

  // Get a single transportation segment by ID
  async getTransportationSegment(id: string): Promise<TransportationSegment | null> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return null;
    }

    const { data, error } = await supabase
      .from('transportation_segments')
      .select(`
        *,
        driver:driver_id(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Segment not found
      }
      throw new Error(`Failed to fetch transportation segment: ${error.message}`);
    }

    return data;
  }

  // Get segments for a specific appointment
  async getSegmentsForAppointment(appointmentId: string): Promise<TransportationSegment[]> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return [];
    }

    return this.getTransportationSegments({ appointment_id: appointmentId });
  }

  // Get segments for a specific driver
  async getSegmentsForDriver(driverId: string): Promise<TransportationSegment[]> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return [];
    }

    return this.getTransportationSegments({ driver_id: driverId });
  }

  // Create a new transportation segment
  async createTransportationSegment(segmentData: CreateTransportationSegment): Promise<TransportationSegment> {
    if (!this.isFeatureEnabled()) {
      throw new Error('Transportation segments feature is disabled');
    }

    // Validate segment data
    this.validateSegmentData(segmentData);

    // Check for conflicts if driver is assigned
    if (segmentData.driver_id && segmentData.planned_start && segmentData.planned_end) {
      await this.checkDriverConflicts(segmentData.driver_id, segmentData.planned_start, segmentData.planned_end, segmentData.id);
    }

    const { data, error } = await supabase
      .from('transportation_segments')
      .insert(segmentData)
      .select(`
        *,
        driver:driver_id(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create transportation segment: ${error.message}`);
    }

    // Sync all driver assignments for this appointment
    await this.syncAllDriverAssignmentsForAppointment(data.appointment_id);

    // Create calendar event if segment is scheduled and has a driver
    if (data.status === 'scheduled' && data.driver_id) {
      await this.createCalendarEventForSegment(data);
    }

    // Send notification to driver
    if (data.driver_id) {
      await telegramNotificationService.sendTransportationSegmentNotificationsToDrivers(data, 'created');
    }

    return data;
  }

  // Update an existing transportation segment
  async updateTransportationSegment(id: string, updates: Partial<UpdateTransportationSegment>): Promise<TransportationSegment> {
    if (!this.isFeatureEnabled()) {
      throw new Error('Transportation segments feature is disabled');
    }

    // Get current segment to check for changes
    const currentSegment = await this.getTransportationSegment(id);
    if (!currentSegment) {
      throw new Error('Transportation segment not found');
    }

    // Validate updates
    if (updates.planned_start || updates.planned_end || updates.driver_id) {
      this.validateSegmentData({ ...currentSegment, ...updates });
    }

    // Check for conflicts if driver or timing changed
    if (updates.driver_id || updates.planned_start || updates.planned_end) {
      const driverId = updates.driver_id ?? currentSegment.driver_id;
      const plannedStart = updates.planned_start ?? currentSegment.planned_start;
      const plannedEnd = updates.planned_end ?? currentSegment.planned_end;

      if (driverId && plannedStart && plannedEnd) {
        await this.checkDriverConflicts(driverId, plannedStart, plannedEnd, id);
      }
    }

    const { data, error } = await supabase
      .from('transportation_segments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        driver:driver_id(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update transportation segment: ${error.message}`);
    }

    // Sync all driver assignments for this appointment
    await this.syncAllDriverAssignmentsForAppointment(data.appointment_id);

    // Update calendar event if segment is scheduled and has a driver
    if (data.status === 'scheduled' && data.driver_id && data.google_event_id) {
      await this.updateCalendarEventForSegment(data);
    } else if (data.status === 'scheduled' && data.driver_id && !data.google_event_id) {
      // Create calendar event if it doesn't exist
      await this.createCalendarEventForSegment(data);
    } else if (data.status !== 'scheduled' && data.google_event_id) {
      // Delete calendar event if segment is no longer scheduled
      await this.deleteCalendarEventForSegment(data);
    }

    // Send notification to driver
    if (data.driver_id) {
      await telegramNotificationService.sendTransportationSegmentNotificationsToDrivers(data, 'updated');
    }

    return data;
  }

  // Delete a transportation segment
  async deleteTransportationSegment(id: string): Promise<void> {
    if (!this.isFeatureEnabled()) {
      throw new Error('Transportation segments feature is disabled');
    }

    // Get segment before deletion to clean up driver assignment
    const segment = await this.getTransportationSegment(id);
    if (!segment) {
      throw new Error('Transportation segment not found');
    }

    // Delete calendar event if it exists
    if (segment.google_event_id) {
      await this.deleteCalendarEventForSegment(segment);
    }

    // Send notification to driver before deletion
    if (segment.driver_id) {
      await telegramNotificationService.sendTransportationSegmentNotificationsToDrivers(segment, 'cancelled');
    }

    const { error } = await supabase
      .from('transportation_segments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete transportation segment: ${error.message}`);
    }

    // Sync all driver assignments for this appointment
    await this.syncAllDriverAssignmentsForAppointment(segment.appointment_id);
  }

  // Get segments by date range
  async getSegmentsByDateRange(startDate: string, endDate: string): Promise<TransportationSegment[]> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return [];
    }

    const { data, error } = await supabase
      .from('transportation_segments')
      .select(`
        *,
        driver:driver_id(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .gte('planned_start', startDate)
      .lte('planned_start', endDate)
      .order('planned_start', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch segments by date range: ${error.message}`);
    }

    return data || [];
  }

  // Get segments by status
  async getSegmentsByStatus(status: string): Promise<TransportationSegment[]> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return [];
    }

    return this.getTransportationSegments({ status: status as any });
  }

  // Check for driver conflicts
  async checkDriverConflicts(
    driverId: string,
    plannedStart: string,
    plannedEnd: string,
    excludeSegmentId?: string
  ): Promise<{ hasConflict: boolean; conflictingSegments: TransportationSegment[] }> {
    if (!this.isFeatureEnabled()) {
      return { hasConflict: false, conflictingSegments: [] };
    }

    let query = supabase
      .from('transportation_segments')
      .select('*')
      .eq('driver_id', driverId)
      .eq('status', 'scheduled')
      .or(`and(planned_start.lt.${plannedEnd},planned_end.gt.${plannedStart})`);

    if (excludeSegmentId) {
      query = query.neq('id', excludeSegmentId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check driver conflicts: ${error.message}`);
    }

    const conflictingSegments = data || [];
    return {
      hasConflict: conflictingSegments.length > 0,
      conflictingSegments
    };
  }

  // Get driver availability for a time range
  async getDriverAvailability(
    driverId: string,
    startTime: string,
    endTime: string
  ): Promise<{
    isAvailable: boolean;
    conflicts: TransportationSegment[];
    travelGaps: { before: number; after: number };
  }> {
    if (!this.isFeatureEnabled()) {
      return { isAvailable: true, conflicts: [], travelGaps: { before: 0, after: 0 } };
    }

    // Get all segments for this driver on the same day
    const startDate = startTime.split('T')[0];
    const endDate = endTime.split('T')[0];

    const segments = await this.getSegmentsByDateRange(startDate, endDate);
    const driverSegments = segments.filter(s => s.driver_id === driverId);

    // Check for direct conflicts
    const conflicts = driverSegments.filter(segment => {
      if (!segment.planned_start || !segment.planned_end) return false;
      return (
        (new Date(segment.planned_start) < new Date(endTime)) &&
        (new Date(segment.planned_end) > new Date(startTime))
      );
    });

    // Calculate travel gaps
    const beforeGap = this.calculateTravelGap(driverSegments, startTime, 'before');
    const afterGap = this.calculateTravelGap(driverSegments, endTime, 'after');

    return {
      isAvailable: conflicts.length === 0,
      conflicts,
      travelGaps: { before: beforeGap, after: afterGap }
    };
  }

  // Calculate travel gap between segments
  private calculateTravelGap(
    segments: TransportationSegment[],
    targetTime: string,
    direction: 'before' | 'after'
  ): number {
    const target = new Date(targetTime);
    const relevantSegments = segments.filter(segment => {
      if (!segment.planned_start || !segment.planned_end) return false;
      const start = new Date(segment.planned_start);
      const end = new Date(segment.planned_end);

      if (direction === 'before') {
        return end <= target;
      } else {
        return start >= target;
      }
    });

    if (relevantSegments.length === 0) return 0;

    const closestSegment = direction === 'before'
      ? relevantSegments.reduce((closest, current) => {
          const currentEnd = new Date(current.planned_end!);
          const closestEnd = new Date(closest.planned_end!);
          return currentEnd > closestEnd ? current : closest;
        })
      : relevantSegments.reduce((closest, current) => {
          const currentStart = new Date(current.planned_start!);
          const closestStart = new Date(closest.planned_start!);
          return currentStart < closestStart ? current : closest;
        });

    const segmentTime = direction === 'before'
      ? new Date(closestSegment.planned_end!)
      : new Date(closestSegment.planned_start!);

    return Math.abs(target.getTime() - segmentTime.getTime()) / (1000 * 60); // minutes
  }

  // Helper function to process pickup location based on type
  async processPickupLocation(
    pickupLocationType: PickupLocationType,
    pickupLocationReference?: string | null
  ): Promise<TransportationSegmentLocation | null> {
    switch (pickupLocationType) {
      case 'office':
        return this.getOfficeLocation();
      case 'previous_appointment':
        if (!pickupLocationReference) {
          throw new Error('Previous appointment reference is required');
        }
        return this.getPreviousAppointmentLocation(pickupLocationReference);
      case 'metro_station':
        if (!pickupLocationReference) {
          throw new Error('Metro station reference is required');
        }
        return this.getMetroStationLocation(pickupLocationReference);
      case 'custom':
        return null; // Will be set manually
      default:
        throw new Error('Invalid pickup location type');
    }
  }

  // Get office location (hardcoded or from config)
  private async getOfficeLocation(): Promise<TransportationSegmentLocation> {
    // This should be configurable, but for now return a default office location
    return {
      lat: 25.2048, // Dubai office coordinates
      lng: 55.2708,
      address: 'Dubai Healthcare City, Dubai, UAE',
      formatted_address: 'Dubai Healthcare City, Dubai, UAE',
      city: 'Dubai',
      area: 'Healthcare City',
      building_name: 'Office Building'
    };
  }

  // Get location from previous appointment
  private async getPreviousAppointmentLocation(appointmentId: string): Promise<TransportationSegmentLocation> {
    // This would fetch the patient location from the previous appointment
    // For now, return a placeholder - this should be implemented based on your appointment structure
    throw new Error('Previous appointment location lookup not yet implemented');
  }

  // Get metro station location
  private async getMetroStationLocation(stationId: string): Promise<TransportationSegmentLocation> {
    // This would fetch metro station coordinates from a metro stations table
    // For now, return a placeholder - this should be implemented based on your metro stations data
    throw new Error('Metro station location lookup not yet implemented');
  }

  // Validate pickup location type requirements
  validatePickupLocationRequirements(
    pickupLocationType: PickupLocationType,
    pickupLocationReference?: string | null
  ): { isValid: boolean; error?: string } {
    if (requiresPickupLocationReference(pickupLocationType) && !pickupLocationReference) {
      return {
        isValid: false,
        error: 'Pickup location reference is required for this pickup type'
      };
    }

    if (!requiresPickupLocationReference(pickupLocationType) && pickupLocationReference) {
      return {
        isValid: false,
        error: 'Pickup location reference should not be provided for this pickup type'
      };
    }

    return { isValid: true };
  }

  // Calculate pickup time based on appointment start time and travel time
  calculatePickupTime(
    appointmentStartTime: string,
    travelTimeMinutes: number,
    bufferMinutes: number = 20
  ): string {
    const appointmentStart = new Date(appointmentStartTime);
    const totalMinutes = travelTimeMinutes + bufferMinutes;
    const pickupTime = new Date(appointmentStart.getTime() - (totalMinutes * 60 * 1000));

    return pickupTime.toISOString();
  }

  // Calculate pickup time with validation and warnings
  calculatePickupTimeWithValidation(
    appointmentStartTime: string,
    travelTimeMinutes: number,
    bufferMinutes: number = 20
  ): {
    pickupTime: string;
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate inputs
    if (travelTimeMinutes <= 0) {
      warnings.push('Travel time must be greater than 0');
    }

    if (bufferMinutes < 10) {
      warnings.push('Buffer time is less than 10 minutes - consider increasing for safety');
      recommendations.push('Increase buffer time to at least 15-20 minutes');
    }

    if (bufferMinutes > 60) {
      warnings.push('Buffer time is more than 60 minutes - this may be excessive');
      recommendations.push('Consider reducing buffer time to 20-30 minutes');
    }

    // Calculate pickup time
    const appointmentStart = new Date(appointmentStartTime);
    const totalMinutes = travelTimeMinutes + bufferMinutes;
    const pickupTime = new Date(appointmentStart.getTime() - (totalMinutes * 60 * 1000));

    // Check if pickup time is in the past
    const now = new Date();
    if (pickupTime < now) {
      warnings.push('Calculated pickup time is in the past');
      recommendations.push('Check appointment start time and travel duration');
    }

    // Check if pickup time is too early (more than 2 hours before appointment)
    const twoHoursBefore = new Date(appointmentStart.getTime() - (2 * 60 * 60 * 1000));
    if (pickupTime < twoHoursBefore) {
      warnings.push('Pickup time is more than 2 hours before appointment');
      recommendations.push('Consider if this timing is appropriate for the patient');
    }

    return {
      pickupTime: pickupTime.toISOString(),
      isValid: warnings.length === 0,
      warnings,
      recommendations
    };
  }

  // Recalculate pickup time for an existing segment
  async recalculatePickupTime(segmentId: string): Promise<{
    success: boolean;
    pickupTime?: string;
    warnings?: string[];
    error?: string;
  }> {
    try {
      const segment = await this.getTransportationSegment(segmentId);
      if (!segment) {
        return { success: false, error: 'Segment not found' };
      }

      if (!segment.planned_start || !segment.estimated_travel_minutes) {
        return { success: false, error: 'Missing required data for calculation' };
      }

      const result = this.calculatePickupTimeWithValidation(
        segment.planned_start,
        segment.estimated_travel_minutes,
        segment.buffer_minutes || 20
      );

      if (result.isValid) {
        // Update the segment with new pickup time
        const pickupTime = this.calculatePickupTime(
          segment.planned_start,
          segment.estimated_travel_minutes,
          segment.buffer_minutes || 20
        );

        await this.updateTransportationSegment(segmentId, {
          planned_start: pickupTime
        });

        return {
          success: true,
          pickupTime,
          warnings: result.warnings
        };
      } else {
        return {
          success: false,
          error: 'Invalid calculation parameters',
          warnings: result.warnings
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Validate segment data
  private validateSegmentData(data: Partial<CreateTransportationSegment>): void {
    if (data.planned_start && data.planned_end) {
      const start = new Date(data.planned_start);
      const end = new Date(data.planned_end);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format for planned start or end');
      }

      if (end <= start) {
        throw new Error('Planned end must be after planned start');
      }
    }

    if (data.title && data.title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }

    if (data.travel_mode && data.travel_mode.trim().length === 0) {
      throw new Error('Travel mode cannot be empty');
    }

    // Validate pickup location type and reference
    if (data.pickup_location_type) {
      if (!isValidPickupLocationType(data.pickup_location_type)) {
        throw new Error('Invalid pickup location type');
      }

      // Validate that reference is provided when required
      if (requiresPickupLocationReference(data.pickup_location_type) && !data.pickup_location_reference) {
        throw new Error('Pickup location reference is required for previous appointment or metro station pickup types');
      }

      // Validate that reference is not provided when not needed
      if (!requiresPickupLocationReference(data.pickup_location_type) && data.pickup_location_reference) {
        throw new Error('Pickup location reference should not be provided for office or custom pickup types');
      }
    }
  }

  // Sync driver assignment with appointment staff
  private async syncDriverAssignment(appointmentId: string, driverId: string, role: string): Promise<void> {
    try {
      console.log(`🔄 Syncing driver assignment: ${driverId} for appointment ${appointmentId} as ${role}`);

      // Check if driver assignment already exists
      const existingAssignments = await appointmentStaffService.getStaffForAppointment(appointmentId);
      const existingDriver = existingAssignments?.find(a => a.staff_id === driverId && a.role === role);

      if (!existingDriver) {
        console.log(`➕ Creating new driver assignment for ${driverId}`);
        // Create new driver assignment
        await appointmentStaffService.createAppointmentStaff({
          appointment_id: appointmentId,
          staff_id: driverId,
          role: role,
          is_primary: false
        });
        console.log(`✅ Successfully created driver assignment for ${driverId}`);
      } else {
        console.log(`ℹ️ Driver assignment already exists for ${driverId}`);
      }
    } catch (error) {
      console.error('❌ Failed to sync driver assignment:', error);
      // Don't throw error as this is a secondary operation
    }
  }

  // Remove driver assignment from appointment staff
  private async removeDriverAssignment(appointmentId: string, driverId: string): Promise<void> {
    try {
      console.log(`🔄 Checking if driver ${driverId} should be removed from appointment ${appointmentId}`);

      // Check if this driver has other segments for this appointment
      const otherSegments = await this.getSegmentsForAppointment(appointmentId);
      const hasOtherSegments = otherSegments.some(s => s.driver_id === driverId);

      if (!hasOtherSegments) {
        console.log(`➖ No other segments found for driver ${driverId}, removing assignment`);
        // Remove driver assignment if no other segments
        const assignments = await appointmentStaffService.getStaffForAppointment(appointmentId);
        const driverAssignment = assignments?.find(a => a.staff_id === driverId && a.role === 'driver');

        if (driverAssignment) {
          await appointmentStaffService.deleteAppointmentStaff(driverAssignment.id);
          console.log(`✅ Successfully removed driver assignment for ${driverId}`);
        } else {
          console.log(`ℹ️ No driver assignment found to remove for ${driverId}`);
        }
      } else {
        console.log(`ℹ️ Driver ${driverId} has other segments, keeping assignment`);
      }
    } catch (error) {
      console.error('❌ Failed to remove driver assignment:', error);
      // Don't throw error as this is a secondary operation
    }
  }

  // Sync all driver assignments for an appointment based on current segments
  async syncAllDriverAssignmentsForAppointment(appointmentId: string): Promise<void> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return;
    }

    try {
      console.log(`🔄 Syncing all driver assignments for appointment ${appointmentId}`);

      // Get all segments for this appointment
      const segments = await this.getSegmentsForAppointment(appointmentId);
      const driversWithSegments = new Set(segments.map(s => s.driver_id).filter(Boolean));

      // Get current driver assignments
      const currentAssignments = await appointmentStaffService.getStaffForAppointment(appointmentId);
      const currentDrivers = new Set(
        currentAssignments
          .filter(a => a.role === 'driver')
          .map(a => a.staff_id)
      );

      // Add new driver assignments
      for (const driverId of driversWithSegments) {
        if (!currentDrivers.has(driverId)) {
          await this.syncDriverAssignment(appointmentId, driverId, 'driver');
        }
      }

      // Remove driver assignments that no longer have segments
      for (const driverId of currentDrivers) {
        if (!driversWithSegments.has(driverId)) {
          await this.removeDriverAssignment(appointmentId, driverId);
        }
      }

      console.log(`✅ Successfully synced driver assignments for appointment ${appointmentId}`);
    } catch (error) {
      console.error(`❌ Failed to sync driver assignments for appointment ${appointmentId}:`, error);
      // Don't throw error as this is a secondary operation
    }
  }

  // Get segment statistics
  async getSegmentStatistics(dateFrom?: string, dateTo?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byDriver: Record<string, number>;
  }> {
    if (!this.isFeatureEnabled()) {
      return { total: 0, byStatus: {}, byType: {}, byDriver: {} };
    }

    let query = supabase.from('transportation_segments').select('*');

    if (dateFrom) {
      query = query.gte('planned_start', dateFrom);
    }

    if (dateTo) {
      query = query.lte('planned_start', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch segment statistics: ${error.message}`);
    }

    const segments = data || [];
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byDriver: Record<string, number> = {};

    segments.forEach(segment => {
      byStatus[segment.status] = (byStatus[segment.status] || 0) + 1;
      byType[segment.segment_type] = (byType[segment.segment_type] || 0) + 1;

      if (segment.driver_id) {
        byDriver[segment.driver_id] = (byDriver[segment.driver_id] || 0) + 1;
      }
    });

    return {
      total: segments.length,
      byStatus,
      byType,
      byDriver,
    };
  }

  // =============================================================================
  // CALENDAR EVENT MANAGEMENT
  // =============================================================================

  /**
   * Create calendar event for a transportation segment
   */
  private async createCalendarEventForSegment(segment: TransportationSegment): Promise<void> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return;
    }

    if (!segment.driver_id || !segment.planned_start || !segment.planned_end) {
      console.log(`Skipping calendar event creation for segment ${segment.id} - missing driver or timing`);
      return;
    }

    try {
      console.log(`📅 Creating calendar event for segment ${segment.id}`);

      // Get driver information
      const { data: driver, error: driverError } = await supabase
        .from('staff')
        .select('id, first_name, last_name, google_calendar_id')
        .eq('id', segment.driver_id)
        .single();

      if (driverError || !driver) {
        console.error(`❌ Driver not found for segment ${segment.id}:`, driverError);
        return;
      }

      if (!driver.google_calendar_id) {
        console.log(`⚠️ Driver ${driver.first_name} ${driver.last_name} has no Google Calendar ID, skipping event creation`);
        return;
      }

      // Get appointment information for context
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          patient:patients(id, name, phone, flat_villa_no, building_street, area, city)
        `)
        .eq('id', segment.appointment_id)
        .single();

      if (appointmentError || !appointment) {
        console.error(`❌ Appointment not found for segment ${segment.id}:`, appointmentError);
        return;
      }

      // Create calendar event
      const googleCalendarService = getGoogleCalendarService();
      if (!googleCalendarService.isInitialized) {
        console.log('⚠️ Google Calendar service not initialized, skipping event creation');
        return;
      }

      const eventTitle = this.buildSegmentEventTitle(segment, appointment.patient);
      const eventDescription = this.buildSegmentEventDescription(segment, appointment.patient);
      const eventLocation = this.buildSegmentEventLocation(segment);

      const result = await googleCalendarService.createEvent({
        staff_id: segment.driver_id,
        google_calendar_id: driver.google_calendar_id,
        event_title: eventTitle,
        event_description: eventDescription,
        start_time: segment.planned_start,
        end_time: segment.planned_end,
        location: eventLocation
      });

      if (result.success && result.eventId) {
        // Store the Google event ID in the segment
        await supabase
          .from('transportation_segments')
          .update({ google_event_id: result.eventId })
          .eq('id', segment.id);

        console.log(`✅ Calendar event created for segment ${segment.id}: ${result.eventId}`);
        logCalendarOperation('create_segment_event', segment.driver_id, segment.id, 'success');
      } else {
        console.error(`❌ Failed to create calendar event for segment ${segment.id}:`, result.errorMessage);
        logCalendarOperation('create_segment_event', segment.driver_id, segment.id, 'failed', result.errorMessage);
      }
    } catch (error) {
      console.error(`❌ Error creating calendar event for segment ${segment.id}:`, error);
      logCalendarOperation('create_segment_event', segment.driver_id, segment.id, 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Update calendar event for a transportation segment
   */
  private async updateCalendarEventForSegment(segment: TransportationSegment): Promise<void> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return;
    }

    if (!segment.driver_id || !segment.planned_start || !segment.planned_end) {
      console.log(`Skipping calendar event update for segment ${segment.id} - missing driver or timing`);
      return;
    }

    try {
      console.log(`📅 Updating calendar event for segment ${segment.id}`);

      // Get driver information
      const { data: driver, error: driverError } = await supabase
        .from('staff')
        .select('id, first_name, last_name, google_calendar_id')
        .eq('id', segment.driver_id)
        .single();

      if (driverError || !driver) {
        console.error(`❌ Driver not found for segment ${segment.id}:`, driverError);
        return;
      }

      if (!driver.google_calendar_id) {
        console.log(`⚠️ Driver ${driver.first_name} ${driver.last_name} has no Google Calendar ID, skipping event update`);
        return;
      }

      // Get appointment information for context
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          patient:patients(id, name, phone, flat_villa_no, building_street, area, city)
        `)
        .eq('id', segment.appointment_id)
        .single();

      if (appointmentError || !appointment) {
        console.error(`❌ Appointment not found for segment ${segment.id}:`, appointmentError);
        return;
      }

      // Update calendar event
      const googleCalendarService = getGoogleCalendarService();
      if (!googleCalendarService.isInitialized) {
        console.log('⚠️ Google Calendar service not initialized, skipping event update');
        return;
      }

      const eventTitle = this.buildSegmentEventTitle(segment, appointment.patient);
      const eventDescription = this.buildSegmentEventDescription(segment, appointment.patient);
      const eventLocation = this.buildSegmentEventLocation(segment);

      const result = await googleCalendarService.updateEvent(
        driver.google_calendar_id,
        segment.google_event_id!,
        {
          staff_id: segment.driver_id,
          google_calendar_id: driver.google_calendar_id,
          event_title: eventTitle,
          event_description: eventDescription,
          start_time: segment.planned_start,
          end_time: segment.planned_end,
          location: eventLocation
        }
      );

      if (result.success) {
        console.log(`✅ Calendar event updated for segment ${segment.id}`);
        logCalendarOperation('update_segment_event', segment.driver_id, segment.id, 'success');
      } else {
        console.error(`❌ Failed to update calendar event for segment ${segment.id}:`, result.errorMessage);
        logCalendarOperation('update_segment_event', segment.driver_id, segment.id, 'failed', result.errorMessage);
      }
    } catch (error) {
      console.error(`❌ Error updating calendar event for segment ${segment.id}:`, error);
      logCalendarOperation('update_segment_event', segment.driver_id, segment.id, 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Delete calendar event for a transportation segment
   */
  private async deleteCalendarEventForSegment(segment: TransportationSegment): Promise<void> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return;
    }

    if (!segment.google_event_id) {
      console.log(`No Google event ID found for segment ${segment.id}, skipping deletion`);
      return;
    }

    try {
      console.log(`📅 Deleting calendar event for segment ${segment.id}`);

      // Get driver information
      const { data: driver, error: driverError } = await supabase
        .from('staff')
        .select('id, first_name, last_name, google_calendar_id')
        .eq('id', segment.driver_id)
        .single();

      if (driverError || !driver) {
        console.error(`❌ Driver not found for segment ${segment.id}:`, driverError);
        return;
      }

      if (!driver.google_calendar_id) {
        console.log(`⚠️ Driver ${driver.first_name} ${driver.last_name} has no Google Calendar ID, skipping event deletion`);
        return;
      }

      // Delete calendar event
      const googleCalendarService = getGoogleCalendarService();
      if (!googleCalendarService.isInitialized) {
        console.log('⚠️ Google Calendar service not initialized, skipping event deletion');
        return;
      }

      const result = await googleCalendarService.deleteEvent(
        driver.google_calendar_id,
        segment.google_event_id
      );

      if (result.success) {
        // Clear the Google event ID from the segment
        await supabase
          .from('transportation_segments')
          .update({ google_event_id: null })
          .eq('id', segment.id);

        console.log(`✅ Calendar event deleted for segment ${segment.id}`);
        logCalendarOperation('delete_segment_event', segment.driver_id, segment.id, 'success');
      } else {
        console.error(`❌ Failed to delete calendar event for segment ${segment.id}:`, result.errorMessage);
        logCalendarOperation('delete_segment_event', segment.driver_id, segment.id, 'failed', result.errorMessage);
      }
    } catch (error) {
      console.error(`❌ Error deleting calendar event for segment ${segment.id}:`, error);
      logCalendarOperation('delete_segment_event', segment.driver_id, segment.id, 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Build event title for a transportation segment
   */
  private buildSegmentEventTitle(segment: TransportationSegment, patient: any): string {
    const segmentTypeLabels = {
      pickup: 'Pickup',
      dropoff: 'Dropoff',
      stay_with_staff: 'Stay with Staff',
      metro_assist: 'Metro Assist',
      custom: 'Custom'
    };

    const segmentTypeLabel = segmentTypeLabels[segment.segment_type] || segment.segment_type;
    const patientName = patient?.name || 'Unknown Patient';

    return `[${segmentTypeLabel}] ${patientName}`;
  }

  /**
   * Build event description for a transportation segment
   */
  private buildSegmentEventDescription(segment: TransportationSegment, patient: any): string {
    let description = `Transportation Segment: ${segment.title || segment.segment_type}\n\n`;

    if (segment.instructions) {
      description += `Instructions: ${segment.instructions}\n\n`;
    }

    if (segment.origin?.address) {
      description += `From: ${segment.origin.address}\n`;
    }

    if (segment.destination?.address) {
      description += `To: ${segment.destination.address}\n`;
    }

    if (segment.travel_mode) {
      description += `Travel Mode: ${segment.travel_mode}\n`;
    }

    if (segment.estimated_travel_minutes) {
      description += `Estimated Travel Time: ${segment.estimated_travel_minutes} minutes\n`;
    }

    if (segment.estimated_distance_km) {
      description += `Distance: ${segment.estimated_distance_km} km\n`;
    }

    if (segment.requires_follow_up) {
      description += `\n⚠️ Requires follow-up confirmation\n`;
    }

    if (segment.manual_override) {
      description += `\n🔧 Manual override applied\n`;
    }

    return description;
  }

  /**
   * Build event location for a transportation segment
   */
  private buildSegmentEventLocation(segment: TransportationSegment): string {
    const locations = [];

    if (segment.origin?.address) {
      locations.push(`From: ${segment.origin.address}`);
    }

    if (segment.destination?.address) {
      locations.push(`To: ${segment.destination.address}`);
    }

    return locations.join(' | ');
  }

  /**
   * Record a manual override for a transportation segment
   */
  async recordManualOverride(
    segmentId: string,
    appointmentId: string,
    userId: string,
    userName: string,
    operationType: 'transportation_segment_override' | 'driver_reassignment_override' | 'timing_override',
    overrideReason: 'driver_conflict' | 'timing_conflict' | 'travel_buffer_insufficient' | 'manual_requirement' | 'emergency_override',
    originalDriverId?: string,
    newDriverId?: string,
    originalPlannedStart?: string,
    newPlannedStart?: string,
    originalPlannedEnd?: string,
    newPlannedEnd?: string,
    conflictDetails: {
      driver_conflicts?: string[];
      timing_conflicts?: string[];
      travel_buffer_issues?: string[];
      warnings_acknowledged: string[];
    },
    overrideJustification: string,
    requiresFollowUp: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isFeatureEnabled()) {
        console.log('Transportation segments feature is disabled');
        return { success: false, error: 'Transportation segments feature is disabled' };
      }

      const result = await auditTrailService.createTransportationSegmentOverride({
        segment_id: segmentId,
        appointment_id: appointmentId,
        operation_type: operationType,
        override_reason: overrideReason,
        user_id: userId,
        user_name: userName,
        original_driver_id: originalDriverId,
        new_driver_id: newDriverId,
        original_planned_start: originalPlannedStart,
        new_planned_start: newPlannedStart,
        original_planned_end: originalPlannedEnd,
        new_planned_end: newPlannedEnd,
        conflict_details: conflictDetails,
        override_justification: overrideJustification,
        requires_follow_up: requiresFollowUp,
        metadata: {
          timestamp: new Date().toISOString(),
          feature: 'transportation_segments',
        },
      });

      if (result.success) {
        console.log(`✅ Manual override recorded for segment ${segmentId}`);
        return { success: true };
      } else {
        console.error(`❌ Failed to record manual override for segment ${segmentId}:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`❌ Error recording manual override for segment ${segmentId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transportation segment overrides for an appointment
   */
  async getSegmentOverridesForAppointment(
    appointmentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      if (!this.isFeatureEnabled()) {
        console.log('Transportation segments feature is disabled');
        return { success: false, error: 'Transportation segments feature is disabled' };
      }

      const result = await auditTrailService.getTransportationSegmentOverrides({
        appointment_id: appointmentId,
        limit,
        offset,
      });

      return result;
    } catch (error) {
      console.error(`❌ Error getting segment overrides for appointment ${appointmentId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const transportationSegmentService = new TransportationSegmentService();
export default transportationSegmentService;
