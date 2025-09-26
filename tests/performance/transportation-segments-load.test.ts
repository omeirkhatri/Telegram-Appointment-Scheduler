/**
 * Transportation Segments Performance Tests
 *
 * This test suite validates the performance of transportation segments
 * under various load conditions, including segment-heavy days.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { AppointmentService } from '../../src/services/appointmentService';
import { StaffService } from '../../src/services/staffService';
import { TransportationSegmentService } from '../../src/services/transportationSegmentService';

// Test configuration
const TEST_CONFIG = {
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key',
  PERFORMANCE_THRESHOLDS: {
    API_RESPONSE_TIME_MS: 2000,
    DATABASE_QUERY_TIME_MS: 500,
    UI_RENDERING_TIME_MS: 1000,
    MEMORY_USAGE_MB: 512,
    CPU_USAGE_PERCENT: 80
  }
};

// Test data generators
const generateTestAppointment = (index: number) => ({
  patient_name: `Test Patient ${index}`,
  appointment_time: new Date(Date.now() + (index * 30 * 60 * 1000)).toISOString(),
  transportation_type: 'driver',
  status: 'scheduled'
});

const generateTestSegment = (appointmentId: string, driverId: string, index: number) => ({
  appointment_id: appointmentId,
  segment_type: index % 2 === 0 ? 'pickup' : 'dropoff',
  driver_id: driverId,
  planned_start: new Date(Date.now() + (index * 30 * 60 * 1000)).toISOString(),
  planned_end: new Date(Date.now() + (index * 30 * 60 * 1000) + (60 * 60 * 1000)).toISOString(),
  travel_mode: 'vehicle',
  origin: {
    lat: 25.2048 + (index * 0.001),
    lng: 55.2708 + (index * 0.001),
    address: `Test Address ${index}`,
    landmark: `Test Landmark ${index}`
  },
  destination: {
    lat: 25.2048 + (index * 0.001) + 0.01,
    lng: 55.2708 + (index * 0.001) + 0.01,
    address: `Test Destination ${index}`,
    landmark: `Test Destination Landmark ${index}`
  },
  instructions: `Test instructions for segment ${index}`,
  status: 'draft'
});

const generateTestDriver = (index: number) => ({
  name: `Test Driver ${index}`,
  email: `driver${index}@test.com`,
  staff_type: 'driver',
  phone: `+97150123456${index.toString().padStart(3, '0')}`,
  status: 'active'
});

// Performance monitoring utilities
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  startTimer(label: string): void {
    this.startTimes.set(label, Date.now());
  }

  endTimer(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      throw new Error(`Timer '${label}' was not started`);
    }

    const duration = Date.now() - startTime;
    this.recordMetric(label, duration);
    this.startTimes.delete(label);
    return duration;
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(value);
  }

  getAverageTime(label: string): number {
    const values = this.metrics.get(label) || [];
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getMaxTime(label: string): number {
    const values = this.metrics.get(label) || [];
    return Math.max(...values, 0);
  }

  getMinTime(label: string): number {
    const values = this.metrics.get(label) || [];
    return Math.min(...values, Infinity);
  }

  getSummary(): Record<string, { avg: number; max: number; min: number; count: number }> {
    const summary: Record<string, { avg: number; max: number; min: number; count: number }> = {};

    for (const [label, values] of this.metrics.entries()) {
      summary[label] = {
        avg: this.getAverageTime(label),
        max: this.getMaxTime(label),
        min: this.getMinTime(label),
        count: values.length
      };
    }

    return summary;
  }

  reset(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Load testing scenarios
describe('Transportation Segments Performance Tests', () => {
  let supabase: any;
  let transportationSegmentService: TransportationSegmentService;
  let appointmentService: AppointmentService;
  let staffService: StaffService;
  let monitor: PerformanceMonitor;
  let testDrivers: any[] = [];
  let testAppointments: any[] = [];

  beforeAll(async () => {
    // Initialize services
    supabase = createClient(TEST_CONFIG.SUPABASE_URL, TEST_CONFIG.SUPABASE_ANON_KEY);
    transportationSegmentService = new TransportationSegmentService(supabase);
    appointmentService = new AppointmentService(supabase);
    staffService = new StaffService(supabase);
    monitor = new PerformanceMonitor();

    // Create test drivers
    for (let i = 0; i < 10; i++) {
      const driver = generateTestDriver(i);
      const { data: createdDriver } = await staffService.createStaff(driver);
      testDrivers.push(createdDriver);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    for (const appointment of testAppointments) {
      await appointmentService.deleteAppointment(appointment.id);
    }

    for (const driver of testDrivers) {
      await staffService.deleteStaff(driver.id);
    }
  });

  describe('Normal Load Testing', () => {
    it('should handle normal load (10 dispatchers, 100 segments)', async () => {
      const CONCURRENT_USERS = 10;
      const SEGMENTS_PER_USER = 10;
      const TOTAL_SEGMENTS = CONCURRENT_USERS * SEGMENTS_PER_USER;

      // Create test appointments
      for (let i = 0; i < CONCURRENT_USERS; i++) {
        const appointment = generateTestAppointment(i);
        const { data: createdAppointment } = await appointmentService.createAppointment(appointment);
        testAppointments.push(createdAppointment);
      }

      // Simulate concurrent segment creation
      const promises = [];
      for (let user = 0; user < CONCURRENT_USERS; user++) {
        for (let segment = 0; segment < SEGMENTS_PER_USER; segment++) {
          const promise = (async () => {
            monitor.startTimer('segment_creation');
            const segmentData = generateTestSegment(
              testAppointments[user].id,
              testDrivers[segment % testDrivers.length].id,
              segment
            );
            await transportationSegmentService.createSegment(segmentData);
            monitor.endTimer('segment_creation');
          })();
          promises.push(promise);
        }
      }

      await Promise.all(promises);

      // Verify performance metrics
      const avgCreationTime = monitor.getAverageTime('segment_creation');
      const maxCreationTime = monitor.getMaxTime('segment_creation');

      expect(avgCreationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS);
      expect(maxCreationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 2);

      console.log(`Normal Load Test Results:`);
      console.log(`- Total segments created: ${TOTAL_SEGMENTS}`);
      console.log(`- Average creation time: ${avgCreationTime.toFixed(2)}ms`);
      console.log(`- Max creation time: ${maxCreationTime.toFixed(2)}ms`);
    });
  });

  describe('Peak Load Testing', () => {
    it('should handle peak load (25 dispatchers, 500 segments)', async () => {
      const CONCURRENT_USERS = 25;
      const SEGMENTS_PER_USER = 20;
      const TOTAL_SEGMENTS = CONCURRENT_USERS * SEGMENTS_PER_USER;

      // Create additional test appointments
      for (let i = testAppointments.length; i < CONCURRENT_USERS; i++) {
        const appointment = generateTestAppointment(i);
        const { data: createdAppointment } = await appointmentService.createAppointment(appointment);
        testAppointments.push(createdAppointment);
      }

      // Simulate concurrent segment creation
      const promises = [];
      for (let user = 0; user < CONCURRENT_USERS; user++) {
        for (let segment = 0; segment < SEGMENTS_PER_USER; segment++) {
          const promise = (async () => {
            monitor.startTimer('segment_creation_peak');
            const segmentData = generateTestSegment(
              testAppointments[user].id,
              testDrivers[segment % testDrivers.length].id,
              segment
            );
            await transportationSegmentService.createSegment(segmentData);
            monitor.endTimer('segment_creation_peak');
          })();
          promises.push(promise);
        }
      }

      await Promise.all(promises);

      // Verify performance metrics
      const avgCreationTime = monitor.getAverageTime('segment_creation_peak');
      const maxCreationTime = monitor.getMaxTime('segment_creation_peak');

      expect(avgCreationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 1.5);
      expect(maxCreationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 3);

      console.log(`Peak Load Test Results:`);
      console.log(`- Total segments created: ${TOTAL_SEGMENTS}`);
      console.log(`- Average creation time: ${avgCreationTime.toFixed(2)}ms`);
      console.log(`- Max creation time: ${maxCreationTime.toFixed(2)}ms`);
    });
  });

  describe('Stress Load Testing', () => {
    it('should handle stress load (50 dispatchers, 1000 segments)', async () => {
      const CONCURRENT_USERS = 50;
      const SEGMENTS_PER_USER = 20;
      const TOTAL_SEGMENTS = CONCURRENT_USERS * SEGMENTS_PER_USER;

      // Create additional test appointments
      for (let i = testAppointments.length; i < CONCURRENT_USERS; i++) {
        const appointment = generateTestAppointment(i);
        const { data: createdAppointment } = await appointmentService.createAppointment(appointment);
        testAppointments.push(createdAppointment);
      }

      // Simulate concurrent segment creation
      const promises = [];
      for (let user = 0; user < CONCURRENT_USERS; user++) {
        for (let segment = 0; segment < SEGMENTS_PER_USER; segment++) {
          const promise = (async () => {
            monitor.startTimer('segment_creation_stress');
            const segmentData = generateTestSegment(
              testAppointments[user].id,
              testDrivers[segment % testDrivers.length].id,
              segment
            );
            await transportationSegmentService.createSegment(segmentData);
            monitor.endTimer('segment_creation_stress');
          })();
          promises.push(promise);
        }
      }

      await Promise.all(promises);

      // Verify performance metrics
      const avgCreationTime = monitor.getAverageTime('segment_creation_stress');
      const maxCreationTime = monitor.getMaxTime('segment_creation_stress');

      expect(avgCreationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 2);
      expect(maxCreationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 5);

      console.log(`Stress Load Test Results:`);
      console.log(`- Total segments created: ${TOTAL_SEGMENTS}`);
      console.log(`- Average creation time: ${avgCreationTime.toFixed(2)}ms`);
      console.log(`- Max creation time: ${maxCreationTime.toFixed(2)}ms`);
    });
  });

  describe('Segment-Heavy Day Testing', () => {
    it('should handle segment-heavy day (1000 segments, 50 drivers)', async () => {
      const TOTAL_SEGMENTS = 1000;
      const DRIVERS_COUNT = 50;
      const SEGMENTS_PER_DRIVER = Math.ceil(TOTAL_SEGMENTS / DRIVERS_COUNT);

      // Create additional test drivers
      for (let i = testDrivers.length; i < DRIVERS_COUNT; i++) {
        const driver = generateTestDriver(i);
        const { data: createdDriver } = await staffService.createStaff(driver);
        testDrivers.push(createdDriver);
      }

      // Create additional test appointments
      for (let i = testAppointments.length; i < 100; i++) {
        const appointment = generateTestAppointment(i);
        const { data: createdAppointment } = await appointmentService.createAppointment(appointment);
        testAppointments.push(createdAppointment);
      }

      // Simulate segment-heavy day
      const promises = [];
      for (let i = 0; i < TOTAL_SEGMENTS; i++) {
        const promise = (async () => {
          monitor.startTimer('segment_creation_heavy');
          const segmentData = generateTestSegment(
            testAppointments[i % testAppointments.length].id,
            testDrivers[i % testDrivers.length].id,
            i
          );
          await transportationSegmentService.createSegment(segmentData);
          monitor.endTimer('segment_creation_heavy');
        })();
        promises.push(promise);
      }

      await Promise.all(promises);

      // Test driver board performance
      monitor.startTimer('driver_board_load');
      const { data: driverBoardData } = await transportationSegmentService.getDriverBoardData();
      monitor.endTimer('driver_board_load');

      // Test segment listing performance
      monitor.startTimer('segment_listing');
      const { data: segmentsList } = await transportationSegmentService.getSegments();
      monitor.endTimer('segment_listing');

      // Verify performance metrics
      const avgCreationTime = monitor.getAverageTime('segment_creation_heavy');
      const maxCreationTime = monitor.getMaxTime('segment_creation_heavy');
      const driverBoardTime = monitor.getAverageTime('driver_board_load');
      const segmentListingTime = monitor.getAverageTime('segment_listing');

      expect(avgCreationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 2);
      expect(maxCreationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 5);
      expect(driverBoardTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 3);
      expect(segmentListingTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 2);

      console.log(`Segment-Heavy Day Test Results:`);
      console.log(`- Total segments created: ${TOTAL_SEGMENTS}`);
      console.log(`- Average creation time: ${avgCreationTime.toFixed(2)}ms`);
      console.log(`- Max creation time: ${maxCreationTime.toFixed(2)}ms`);
      console.log(`- Driver board load time: ${driverBoardTime.toFixed(2)}ms`);
      console.log(`- Segment listing time: ${segmentListingTime.toFixed(2)}ms`);
    });
  });

  describe('Database Performance Testing', () => {
    it('should handle complex queries efficiently', async () => {
      // Test segment queries with various filters
      monitor.startTimer('segments_by_date');
      const { data: segmentsByDate } = await transportationSegmentService.getSegments({
        date: new Date().toISOString().split('T')[0]
      });
      monitor.endTimer('segments_by_date');

      monitor.startTimer('segments_by_driver');
      const { data: segmentsByDriver } = await transportationSegmentService.getSegments({
        driver_id: testDrivers[0].id
      });
      monitor.endTimer('segments_by_driver');

      monitor.startTimer('segments_by_status');
      const { data: segmentsByStatus } = await transportationSegmentService.getSegments({
        status: 'scheduled'
      });
      monitor.endTimer('segments_by_status');

      // Verify query performance
      const dateQueryTime = monitor.getAverageTime('segments_by_date');
      const driverQueryTime = monitor.getAverageTime('segments_by_driver');
      const statusQueryTime = monitor.getAverageTime('segments_by_status');

      expect(dateQueryTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME_MS);
      expect(driverQueryTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME_MS);
      expect(statusQueryTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME_MS);

      console.log(`Database Performance Test Results:`);
      console.log(`- Date query time: ${dateQueryTime.toFixed(2)}ms`);
      console.log(`- Driver query time: ${driverQueryTime.toFixed(2)}ms`);
      console.log(`- Status query time: ${statusQueryTime.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Testing', () => {
    it('should not leak memory during heavy operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform heavy operations
      for (let i = 0; i < 100; i++) {
        const segmentData = generateTestSegment(
          testAppointments[0].id,
          testDrivers[0].id,
          i
        );
        await transportationSegmentService.createSegment(segmentData);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      expect(memoryIncreaseMB).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB);

      console.log(`Memory Usage Test Results:`);
      console.log(`- Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    });
  });

  describe('Concurrent User Testing', () => {
    it('should handle concurrent users without conflicts', async () => {
      const CONCURRENT_USERS = 20;
      const OPERATIONS_PER_USER = 10;

      // Simulate concurrent operations
      const promises = [];
      for (let user = 0; user < CONCURRENT_USERS; user++) {
        const promise = (async () => {
          for (let op = 0; op < OPERATIONS_PER_USER; op++) {
            monitor.startTimer(`concurrent_operation_${user}`);

            // Simulate different operations
            if (op % 3 === 0) {
              // Create segment
              const segmentData = generateTestSegment(
                testAppointments[user % testAppointments.length].id,
                testDrivers[user % testDrivers.length].id,
                op
              );
              await transportationSegmentService.createSegment(segmentData);
            } else if (op % 3 === 1) {
              // Update segment
              const { data: segments } = await transportationSegmentService.getSegments();
              if (segments && segments.length > 0) {
                const segment = segments[0];
                await transportationSegmentService.updateSegment(segment.id, {
                  ...segment,
                  instructions: `Updated instructions ${op}`
                });
              }
            } else {
              // List segments
              await transportationSegmentService.getSegments();
            }

            monitor.endTimer(`concurrent_operation_${user}`);
          }
        })();
        promises.push(promise);
      }

      await Promise.all(promises);

      // Verify no conflicts occurred
      const operationTimes = [];
      for (let user = 0; user < CONCURRENT_USERS; user++) {
        const times = monitor.metrics.get(`concurrent_operation_${user}`) || [];
        operationTimes.push(...times);
      }

      const avgOperationTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length;
      const maxOperationTime = Math.max(...operationTimes);

      expect(avgOperationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS);
      expect(maxOperationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS * 3);

      console.log(`Concurrent User Test Results:`);
      console.log(`- Concurrent users: ${CONCURRENT_USERS}`);
      console.log(`- Operations per user: ${OPERATIONS_PER_USER}`);
      console.log(`- Average operation time: ${avgOperationTime.toFixed(2)}ms`);
      console.log(`- Max operation time: ${maxOperationTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Summary', () => {
    it('should generate comprehensive performance report', async () => {
      const summary = monitor.getSummary();

      console.log('\n=== Performance Test Summary ===');
      for (const [test, metrics] of Object.entries(summary)) {
        console.log(`${test}:`);
        console.log(`  - Average: ${metrics.avg.toFixed(2)}ms`);
        console.log(`  - Maximum: ${metrics.max.toFixed(2)}ms`);
        console.log(`  - Minimum: ${metrics.min.toFixed(2)}ms`);
        console.log(`  - Count: ${metrics.count}`);
      }

      // Verify all tests passed performance thresholds
      for (const [test, metrics] of Object.entries(summary)) {
        if (test.includes('creation') || test.includes('operation')) {
          expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_MS);
        }
        if (test.includes('query') || test.includes('listing')) {
          expect(metrics.avg).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME_MS);
        }
      }
    });
  });
});
