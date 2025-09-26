import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import type {
    CreateTransportationSegment,
    TransportationSegment,
    TransportationSegmentFilters,
    UpdateTransportationSegment,
} from '@/types/transportationSegment';
import { appointmentStaffService } from './appointmentStaffService';

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
}

// Export singleton instance
export const transportationSegmentService = new TransportationSegmentService();
export default transportationSegmentService;
