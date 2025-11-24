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
// Load server-only calendar service dynamically in server paths
import { telegramNotificationService } from './telegramNotificationService';
import { vendorNotificationService } from './vendorNotificationService';

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
      `);

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

    if (filters?.assignment_mode) {
      query = query.eq('assignment_mode', filters.assignment_mode);
    }

    if (filters?.unassigned_only) {
      query = query.is('driver_id', null);
    }

    if (filters?.start_after) {
      query = query.gte('planned_start', filters.start_after);
    }

    if (filters?.start_before) {
      query = query.lte('planned_start', filters.start_before);
    }

    // Order by priority and planned start time for queue management
    query = query.order('priority', { ascending: false, nullsLast: true })
                 .order('planned_start', { ascending: true });

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

    // Set default assignment mode if not provided
    if (!segmentData.assignment_mode) {
      segmentData.assignment_mode = segmentData.driver_id ? 'assign_now' : 'assign_later';
    }

    // Set default priority if not provided
    if (segmentData.priority === undefined || segmentData.priority === null) {
      segmentData.priority = this.calculateDefaultPriority(segmentData);
    }

    // Set default status based on assignment mode
    if (!segmentData.status) {
      segmentData.status = segmentData.assignment_mode === 'assign_now' ? 'scheduled' : 'draft';
    }

    // Check for conflicts if driver is assigned
    if (segmentData.driver_id && segmentData.planned_start && segmentData.planned_end) {
      await this.checkDriverConflicts(segmentData.driver_id, segmentData.planned_start, segmentData.planned_end, segmentData.id);
    }

    // Set escalation deadline for assign_later segments
    if (segmentData.assignment_mode === 'assign_later' && segmentData.planned_start) {
      segmentData.escalation_deadline = this.calculateEscalationDeadline(segmentData.planned_start);
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

    // Handle assignment mode changes
    if (updates.assignment_mode && updates.assignment_mode !== currentSegment.assignment_mode) {
      if (updates.assignment_mode === 'assign_now' && !updates.driver_id && !currentSegment.driver_id) {
        throw new Error('Driver ID is required when changing to assign_now mode');
      }

      // Update status based on assignment mode
      if (!updates.status) {
        updates.status = updates.assignment_mode === 'assign_now' ? 'scheduled' : 'draft';
      }
    }

    // Update escalation deadline if assignment mode or timing changed
    if (updates.assignment_mode === 'assign_later' ||
        (updates.planned_start && currentSegment.assignment_mode === 'assign_later')) {
      const plannedStart = updates.planned_start ?? currentSegment.planned_start;
      if (plannedStart) {
        updates.escalation_deadline = this.calculateEscalationDeadline(plannedStart);
      }
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

    // Send notification to driver based on the type of change
    if (data.driver_id) {
      // Determine notification type based on what changed
      let notificationType: 'created' | 'updated' | 'cancelled' = 'updated';

      // If driver was just assigned (was null, now has value)
      if (!currentSegment.driver_id && data.driver_id) {
        notificationType = 'created';
      }
      // If driver was reassigned (had different driver before)
      else if (currentSegment.driver_id && data.driver_id && currentSegment.driver_id !== data.driver_id) {
        notificationType = 'updated'; // Reassignment
      }

      await telegramNotificationService.sendTransportationSegmentNotificationsToDrivers(data, notificationType);
    }

    // Send cancellation notification to previous driver if driver was reassigned
    if (currentSegment.driver_id && data.driver_id && currentSegment.driver_id !== data.driver_id) {
      const previousDriverSegment = { ...currentSegment, driver_id: currentSegment.driver_id };
      await telegramNotificationService.sendTransportationSegmentNotificationsToDrivers(previousDriverSegment, 'cancelled');
    }

    // Send vendor notifications for segment updates
    await this.sendVendorNotificationsForSegment(data, 'updated');

    return data;
  }

  /**
   * Send vendor notifications for a transportation segment
   */
  private async sendVendorNotificationsForSegment(
    segment: TransportationSegment,
    changeType: 'created' | 'updated' | 'cancelled'
  ): Promise<void> {
    try {
      // Check if this is a vendor segment (no driver_id and has vendor transport mode)
      if (!segment.driver_id && segment.travel_mode &&
          ['vendor', 'public_transport', 'taxi', 'uber'].includes(segment.travel_mode)) {

        console.log(`🚗 Sending vendor notification for segment ${segment.id} (${segment.travel_mode})`);

        // Convert segment to vendor segment data format
        const vendorSegmentData = {
          id: segment.id,
          appointment_id: segment.appointment_id,
          segment_type: segment.segment_type,
          title: segment.title,
          planned_start: segment.planned_start,
          planned_end: segment.planned_end,
          travel_mode: segment.travel_mode,
          origin: segment.origin,
          destination: segment.destination,
          estimated_travel_minutes: segment.estimated_travel_minutes,
          estimated_distance_km: segment.estimated_distance_km,
          instructions: segment.instructions
        };

        // Send vendor notification
        const result = await vendorNotificationService.sendVendorNotificationsForSegment(
          vendorSegmentData,
          changeType
        );

        if (result.success) {
          console.log(`✅ Vendor notification sent successfully for segment ${segment.id}`);
        } else {
          console.warn(`⚠️ Vendor notification failed for segment ${segment.id}:`, result.results);
        }
      }
    } catch (error) {
      console.error(`❌ Error sending vendor notification for segment ${segment.id}:`, error);
      // Don't throw error to prevent breaking the main operation
    }
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
      .in('status', ['scheduled', 'in_progress'])
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

  // Check for potential conflicts with unassigned segments (for queue management)
  async checkUnassignedSegmentConflicts(
    plannedStart: string,
    plannedEnd: string,
    excludeSegmentId?: string
  ): Promise<{ hasPotentialConflicts: boolean; conflictingSegments: TransportationSegment[] }> {
    if (!this.isFeatureEnabled()) {
      return { hasPotentialConflicts: false, conflictingSegments: [] };
    }

    let query = supabase
      .from('transportation_segments')
      .select('*')
      .is('driver_id', null)
      .eq('assignment_mode', 'assign_later')
      .in('status', ['draft', 'scheduled'])
      .or(`and(planned_start.lt.${plannedEnd},planned_end.gt.${plannedStart})`);

    if (excludeSegmentId) {
      query = query.neq('id', excludeSegmentId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check unassigned segment conflicts: ${error.message}`);
    }

    const conflictingSegments = data || [];
    return {
      hasPotentialConflicts: conflictingSegments.length > 0,
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

    // Validate assignment mode and driver requirements
    if (data.assignment_mode === 'assign_now' && !data.driver_id) {
      throw new Error('Driver ID is required when assignment mode is assign_now');
    }

    // Validate priority range
    if (data.priority !== undefined && data.priority !== null) {
      if (data.priority < 1 || data.priority > 100) {
        throw new Error('Priority must be between 1 and 100');
      }
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
  // QUEUE MANAGEMENT & ESCALATION
  // =============================================================================

  /**
   * Get unassigned segments for the queue
   */
  async getUnassignedSegments(filters?: {
    start_after?: string;
    start_before?: string;
    priority_min?: number;
    escalation_state?: TransportationQueueEscalationState;
  }): Promise<TransportationSegment[]> {
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
      .is('driver_id', null)
      .eq('assignment_mode', 'assign_later')
      .in('status', ['draft', 'scheduled']);

    if (filters?.start_after) {
      query = query.gte('planned_start', filters.start_after);
    }

    if (filters?.start_before) {
      query = query.lte('planned_start', filters.start_before);
    }

    if (filters?.priority_min !== undefined) {
      query = query.gte('priority', filters.priority_min);
    }

    if (filters?.escalation_state) {
      query = query.eq('escalation_state', filters.escalation_state);
    }

    // Order by priority (descending) then by planned start time (ascending)
    query = query.order('priority', { ascending: false, nullsLast: true })
                 .order('planned_start', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch unassigned segments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get segments that need escalation (past their deadline)
   */
  async getEscalatedSegments(): Promise<TransportationSegment[]> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return [];
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('transportation_segments')
      .select(`
        *,
        driver:driver_id(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .is('driver_id', null)
      .eq('assignment_mode', 'assign_later')
      .in('status', ['draft', 'scheduled'])
      .lt('escalation_deadline', now)
      .order('escalation_deadline', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch escalated segments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update escalation state for segments
   */
  async updateEscalationStates(): Promise<{ updated: number; escalated: number }> {
    if (!this.isFeatureEnabled()) {
      console.log('Transportation segments feature is disabled');
      return { updated: 0, escalated: 0 };
    }

    const now = new Date().toISOString();
    let updated = 0;
    let escalated = 0;

    try {
      // Get segments that need escalation
      const segmentsToEscalate = await this.getEscalatedSegments();

      for (const segment of segmentsToEscalate) {
        if (segment.escalation_state !== 'escalated') {
          await this.updateTransportationSegment(segment.id, {
            escalation_state: 'escalated'
          });
          escalated++;
        }
        updated++;
      }

      console.log(`✅ Updated escalation states: ${updated} segments processed, ${escalated} escalated`);
      return { updated, escalated };
    } catch (error) {
      console.error('❌ Failed to update escalation states:', error);
      throw error;
    }
  }

  /**
   * Calculate default priority for a segment
   */
  private calculateDefaultPriority(segmentData: CreateTransportationSegment): number {
    let priority = 50; // Base priority

    // Increase priority for urgent segments
    if (segmentData.requires_follow_up) {
      priority += 20;
    }

    // Increase priority based on segment type
    switch (segmentData.segment_type) {
      case 'pickup':
        priority += 10;
        break;
      case 'dropoff':
        priority += 5;
        break;
      case 'metro_assist':
        priority += 15;
        break;
      case 'stay_with_staff':
        priority += 5;
        break;
      case 'custom':
        priority += 0;
        break;
    }

    // Increase priority for segments starting soon
    if (segmentData.planned_start) {
      const startTime = new Date(segmentData.planned_start);
      const now = new Date();
      const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilStart < 24) {
        priority += 20;
      } else if (hoursUntilStart < 48) {
        priority += 10;
      } else if (hoursUntilStart < 72) {
        priority += 5;
      }
    }

    // Ensure priority is within bounds
    return Math.max(1, Math.min(100, priority));
  }

  /**
   * Calculate escalation deadline (6 hours before planned start)
   */
  private calculateEscalationDeadline(plannedStart: string): string {
    const startTime = new Date(plannedStart);
    const escalationTime = new Date(startTime.getTime() - (6 * 60 * 60 * 1000)); // 6 hours before
    return escalationTime.toISOString();
  }

  /**
   * Assign a driver to a segment and update queue
   */
  async assignDriverToSegment(
    segmentId: string,
    driverId: string,
    userId: string,
    userName: string,
    overrideReason?: string
  ): Promise<TransportationSegment> {
    if (!this.isFeatureEnabled()) {
      throw new Error('Transportation segments feature is disabled');
    }

    const segment = await this.getTransportationSegment(segmentId);
    if (!segment) {
      throw new Error('Transportation segment not found');
    }

    if (segment.driver_id) {
      throw new Error('Segment already has a driver assigned');
    }

    // Check for conflicts
    if (segment.planned_start && segment.planned_end) {
      const conflicts = await this.checkDriverConflicts(driverId, segment.planned_start, segment.planned_end);
      if (conflicts.hasConflict) {
        throw new Error(`Driver has conflicts: ${conflicts.conflictingSegments.map(s => s.id).join(', ')}`);
      }
    }

    // Update segment with driver assignment
    const updatedSegment = await this.updateTransportationSegment(segmentId, {
      driver_id: driverId,
      assignment_mode: 'assign_now',
      status: 'scheduled',
      escalation_state: 'normal',
      escalation_deadline: null
    });

    // Send assignment notification to the new driver
    if (updatedSegment.driver_id) {
      await telegramNotificationService.sendTransportationSegmentNotificationsToDrivers(updatedSegment, 'created');
    }

    // Send vendor notifications if this is a vendor segment
    await this.sendVendorNotificationsForSegment(updatedSegment, 'created');

    // Record manual override if provided
    if (overrideReason) {
      await this.recordManualOverride(
        segmentId,
        segment.appointment_id,
        userId,
        userName,
        'driver_reassignment_override',
        'manual_requirement',
        undefined,
        driverId,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          warnings_acknowledged: ['Driver assigned manually']
        },
        overrideReason,
        false
      );
    }

    return updatedSegment;
  }

  /**
   * Unassign driver from segment and return to queue
   */
  async unassignDriverFromSegment(
    segmentId: string,
    userId: string,
    userName: string,
    reason: string
  ): Promise<TransportationSegment> {
    if (!this.isFeatureEnabled()) {
      throw new Error('Transportation segments feature is disabled');
    }

    const segment = await this.getTransportationSegment(segmentId);
    if (!segment) {
      throw new Error('Transportation segment not found');
    }

    if (!segment.driver_id) {
      throw new Error('Segment has no driver assigned');
    }

    const previousDriverId = segment.driver_id;

    // Send cancellation notification to the driver before unassigning
    if (segment.driver_id) {
      await telegramNotificationService.sendTransportationSegmentNotificationsToDrivers(segment, 'cancelled');
    }

    // Send vendor notifications for cancellation
    await this.sendVendorNotificationsForSegment(segment, 'cancelled');

    // Update segment to remove driver assignment
    const updatedSegment = await this.updateTransportationSegment(segmentId, {
      driver_id: null,
      assignment_mode: 'assign_later',
      status: 'draft',
      escalation_deadline: segment.planned_start ? this.calculateEscalationDeadline(segment.planned_start) : null
    });

    // Record manual override
    await this.recordManualOverride(
      segmentId,
      segment.appointment_id,
      userId,
      userName,
      'driver_reassignment_override',
      'manual_requirement',
      previousDriverId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        warnings_acknowledged: ['Driver unassigned manually']
      },
      reason,
      false
    );

    return updatedSegment;
  }

  /**
   * Get queue statistics
   */
  async getQueueStatistics(): Promise<{
    total_unassigned: number;
    escalated: number;
    by_priority: Record<string, number>;
    by_segment_type: Record<string, number>;
    next_escalation: string | null;
  }> {
    if (!this.isFeatureEnabled()) {
      return {
        total_unassigned: 0,
        escalated: 0,
        by_priority: {},
        by_segment_type: {},
        next_escalation: null
      };
    }

    const unassignedSegments = await this.getUnassignedSegments();
    const escalatedSegments = await this.getEscalatedSegments();

    const byPriority: Record<string, number> = {};
    const bySegmentType: Record<string, number> = {};

    unassignedSegments.forEach(segment => {
      const priorityKey = segment.priority ? segment.priority.toString() : 'null';
      byPriority[priorityKey] = (byPriority[priorityKey] || 0) + 1;
      bySegmentType[segment.segment_type] = (bySegmentType[segment.segment_type] || 0) + 1;
    });

    // Find next escalation deadline
    const nextEscalation = unassignedSegments
      .filter(s => s.escalation_deadline && s.escalation_state !== 'escalated')
      .sort((a, b) => new Date(a.escalation_deadline!).getTime() - new Date(b.escalation_deadline!).getTime())[0];

    return {
      total_unassigned: unassignedSegments.length,
      escalated: escalatedSegments.length,
      by_priority: byPriority,
      by_segment_type: bySegmentType,
      next_escalation: nextEscalation?.escalation_deadline || null
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
      const { getGoogleCalendarService } = await import('./googleCalendarService');
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

  /**
   * Get aggregated driver capacity and availability metrics for capacity planning
   */
  async getDriverCapacityMetrics(options: {
    startDate: string;
    endDate: string;
    windowHours: number;
    includeUnassigned?: boolean;
    serviceLine?: string;
  }): Promise<{
    driverCapacity: Array<{
      driverId: string;
      driverName: string;
      totalHours: number;
      bookedHours: number;
      availableHours: number;
      utilizationPercentage: number;
      segments: Array<{
        id: string;
        title: string;
        plannedStart: string;
        plannedEnd: string;
        segmentType: string;
        status: string;
        priority: number | null;
      }>;
      travelGaps: Array<{
        startTime: string;
        endTime: string;
        durationMinutes: number;
      }>;
    }>;
    unassignedSegments: Array<{
      id: string;
      title: string;
      plannedStart: string;
      plannedEnd: string;
      segmentType: string;
      priority: number | null;
      escalationState: string;
      appointmentId: string;
    }>;
    summary: {
      totalDrivers: number;
      totalSegments: number;
      unassignedSegments: number;
      averageUtilization: number;
      escalationCount: number;
      modeDistribution: Record<string, number>;
    };
  }> {
    try {
      if (!this.isFeatureEnabled()) {
        console.log('Transportation segments feature is disabled');
        return {
          driverCapacity: [],
          unassignedSegments: [],
          summary: {
            totalDrivers: 0,
            totalSegments: 0,
            unassignedSegments: 0,
            averageUtilization: 0,
            escalationCount: 0,
            modeDistribution: {},
          },
        };
      }

      // Get all segments in the time window
      const segments = await this.getTransportationSegments({
        start_after: options.startDate,
        start_before: options.endDate,
      });

      // Get unassigned segments
      const unassignedSegments = await this.getUnassignedSegments({
        start_after: options.startDate,
        start_before: options.endDate,
      });

      // Get escalated segments
      const escalatedSegments = await this.getEscalatedSegments();

      // Group segments by driver
      const segmentsByDriver = new Map<string, any[]>();
      const driverInfo = new Map<string, { name: string; totalHours: number }>();

      segments.forEach(segment => {
        if (segment.driver_id) {
          if (!segmentsByDriver.has(segment.driver_id)) {
            segmentsByDriver.set(segment.driver_id, []);
            driverInfo.set(segment.driver_id, {
              name: segment.driver ? `${segment.driver.first_name} ${segment.driver.last_name}` : 'Unknown Driver',
              totalHours: 0,
            });
          }
          segmentsByDriver.get(segment.driver_id)!.push(segment);
        }
      });

      // Calculate capacity metrics for each driver
      const driverCapacity = Array.from(segmentsByDriver.entries()).map(([driverId, driverSegments]) => {
        const info = driverInfo.get(driverId)!;

        // Calculate total booked hours
        const bookedHours = driverSegments.reduce((total, segment) => {
          if (segment.planned_start && segment.planned_end) {
            const start = new Date(segment.planned_start);
            const end = new Date(segment.planned_end);
            const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return total + durationHours;
          }
          return total;
        }, 0);

        // Calculate travel gaps
        const travelGaps = this.calculateTravelGaps(driverSegments, options.startDate, options.endDate);

        // Calculate utilization (assuming 8-hour work day)
        const totalHours = options.windowHours;
        const availableHours = Math.max(0, totalHours - bookedHours);
        const utilizationPercentage = totalHours > 0 ? (bookedHours / totalHours) * 100 : 0;

        return {
          driverId,
          driverName: info.name,
          totalHours,
          bookedHours: Math.round(bookedHours * 100) / 100,
          availableHours: Math.round(availableHours * 100) / 100,
          utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
          segments: driverSegments.map(segment => ({
            id: segment.id,
            title: segment.title,
            plannedStart: segment.planned_start || '',
            plannedEnd: segment.planned_end || '',
            segmentType: segment.segment_type,
            status: segment.status,
            priority: segment.priority,
          })),
          travelGaps,
        };
      });

      // Calculate mode distribution
      const modeDistribution: Record<string, number> = {};
      segments.forEach(segment => {
        const mode = segment.travel_mode || 'unknown';
        modeDistribution[mode] = (modeDistribution[mode] || 0) + 1;
      });

      // Calculate summary metrics
      const totalDrivers = driverCapacity.length;
      const totalSegments = segments.length;
      const unassignedCount = unassignedSegments.length;
      const averageUtilization = totalDrivers > 0
        ? driverCapacity.reduce((sum, driver) => sum + driver.utilizationPercentage, 0) / totalDrivers
        : 0;
      const escalationCount = escalatedSegments.length;

      return {
        driverCapacity,
        unassignedSegments: unassignedSegments.map(segment => ({
          id: segment.id,
          title: segment.title,
          plannedStart: segment.planned_start || '',
          plannedEnd: segment.planned_end || '',
          segmentType: segment.segment_type,
          priority: segment.priority,
          escalationState: segment.escalation_state || 'normal',
          appointmentId: segment.appointment_id,
        })),
        summary: {
          totalDrivers,
          totalSegments,
          unassignedSegments: unassignedCount,
          averageUtilization: Math.round(averageUtilization * 100) / 100,
          escalationCount,
          modeDistribution,
        },
      };
    } catch (error) {
      console.error('Error getting driver capacity metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate travel gaps between segments for a driver
   */
  private calculateTravelGaps(
    segments: any[],
    startDate: string,
    endDate: string
  ): Array<{ startTime: string; endTime: string; durationMinutes: number }> {
    const gaps: Array<{ startTime: string; endTime: string; durationMinutes: number }> = [];

    // Sort segments by planned start time
    const sortedSegments = segments
      .filter(segment => segment.planned_start && segment.planned_end)
      .sort((a, b) => new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime());

    // Find gaps between consecutive segments
    for (let i = 0; i < sortedSegments.length - 1; i++) {
      const currentSegment = sortedSegments[i];
      const nextSegment = sortedSegments[i + 1];

      const currentEnd = new Date(currentSegment.planned_end);
      const nextStart = new Date(nextSegment.planned_start);

      // If there's a gap of more than 15 minutes, record it
      const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
      if (gapMinutes > 15) {
        gaps.push({
          startTime: currentEnd.toISOString(),
          endTime: nextStart.toISOString(),
          durationMinutes: Math.round(gapMinutes),
        });
      }
    }

    return gaps;
  }
}

// Export singleton instance
export const transportationSegmentService = new TransportationSegmentService();
export default transportationSegmentService;
