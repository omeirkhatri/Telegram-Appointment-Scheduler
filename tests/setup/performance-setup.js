/**
 * Performance Test Setup
 *
 * This file sets up the environment for performance testing of transportation segments.
 */

const { createClient } = require('@supabase/supabase-js');

// Performance test configuration
const PERFORMANCE_CONFIG = {
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

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  startTimer(label) {
    this.startTimes.set(label, Date.now());
  }

  endTimer(label) {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      throw new Error(`Timer '${label}' was not started`);
    }

    const duration = Date.now() - startTime;
    this.recordMetric(label, duration);
    this.startTimes.delete(label);
    return duration;
  }

  recordMetric(label, value) {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label).push(value);
  }

  getAverageTime(label) {
    const values = this.metrics.get(label) || [];
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getMaxTime(label) {
    const values = this.metrics.get(label) || [];
    return Math.max(...values, 0);
  }

  getMinTime(label) {
    const values = this.metrics.get(label) || [];
    return Math.min(...values, Infinity);
  }

  getSummary() {
    const summary = {};

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

  reset() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Global performance monitor instance
global.performanceMonitor = new PerformanceMonitor();

// Performance test setup
beforeAll(async () => {
  console.log('🚀 Setting up performance test environment...');

  try {
    // Initialize Supabase client
    const supabase = createClient(PERFORMANCE_CONFIG.SUPABASE_URL, PERFORMANCE_CONFIG.SUPABASE_ANON_KEY);

    // Test database connection
    const { data, error } = await supabase.from('staff').select('count').limit(1);
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    console.log('✅ Performance test database connection established');

    // Set up performance test environment variables
    process.env.NODE_ENV = 'test';
    process.env.TRANSPORTATION_SEGMENTS_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_UI_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_MAPS_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_REPORTING_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_OVERRIDES_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED = 'true';

    // Performance-specific configuration
    process.env.TRANSPORTATION_SEGMENTS_DEFAULT_BUFFER_MINUTES = '20';
    process.env.TRANSPORTATION_SEGMENTS_MIN_TRAVEL_GAP_MINUTES = '15';
    process.env.TRANSPORTATION_SEGMENTS_MAX_DAILY_SEGMENTS_PER_DRIVER = '20';
    process.env.TRANSPORTATION_SEGMENTS_OVERRIDE_REMINDER_HOURS = '2';

    console.log('✅ Performance test environment configured');

  } catch (error) {
    console.error('❌ Performance test setup failed:', error.message);
    throw error;
  }
});

// Performance test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up performance test environment...');

  try {
    // Generate performance report
    if (global.performanceMonitor) {
      const summary = global.performanceMonitor.getSummary();

      console.log('\n=== Performance Test Summary ===');
      for (const [test, metrics] of Object.entries(summary)) {
        console.log(`${test}:`);
        console.log(`  - Average: ${metrics.avg.toFixed(2)}ms`);
        console.log(`  - Maximum: ${metrics.max.toFixed(2)}ms`);
        console.log(`  - Minimum: ${metrics.min.toFixed(2)}ms`);
        console.log(`  - Count: ${metrics.count}`);
      }
    }

    console.log('✅ Performance test cleanup completed');

  } catch (error) {
    console.error('❌ Performance test cleanup failed:', error.message);
  }
});

// Performance test utilities
global.generateTestData = {
  appointment: (index) => ({
    patient_name: `Test Patient ${index}`,
    appointment_time: new Date(Date.now() + (index * 30 * 60 * 1000)).toISOString(),
    transportation_type: 'driver',
    status: 'scheduled'
  }),

  segment: (appointmentId, driverId, index) => ({
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
  }),

  driver: (index) => ({
    name: `Test Driver ${index}`,
    email: `driver${index}@test.com`,
    staff_type: 'driver',
    phone: `+97150123456${index.toString().padStart(3, '0')}`,
    status: 'active'
  })
};

// Performance thresholds
global.PERFORMANCE_THRESHOLDS = PERFORMANCE_CONFIG.PERFORMANCE_THRESHOLDS;
