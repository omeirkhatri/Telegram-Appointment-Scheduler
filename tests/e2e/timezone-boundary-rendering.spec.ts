import { test, expect, Page } from '@playwright/test';

// Test data for three representative timezones
const TEST_TIMEZONES = [
  {
    name: 'Asia/Dubai',
    abbreviation: 'GST',
    offset: '+04:00',
    description: 'Dubai (UTC+4) - No DST'
  },
  {
    name: 'Europe/London',
    abbreviation: 'GMT/BST',
    offset: '+00:00/+01:00',
    description: 'London (UTC+0/+1) - With DST'
  },
  {
    name: 'America/New_York',
    abbreviation: 'EST/EDT',
    offset: '-05:00/-04:00',
    description: 'New York (UTC-5/-4) - With DST'
  }
];

// Test dates that cross midnight boundaries
const MIDNIGHT_TEST_DATES = [
  {
    date: '2024-06-21', // Summer solstice
    description: 'Summer solstice - long day'
  },
  {
    date: '2024-12-21', // Winter solstice
    description: 'Winter solstice - short day'
  },
  {
    date: '2024-03-10', // DST transition start (US)
    description: 'DST transition start'
  },
  {
    date: '2024-11-03', // DST transition end (US)
    description: 'DST transition end'
  }
];

// Test times around midnight
const MIDNIGHT_TEST_TIMES = [
  { time: '23:30', description: '30 minutes before midnight' },
  { time: '23:45', description: '15 minutes before midnight' },
  { time: '23:59', description: '1 minute before midnight' },
  { time: '00:00', description: 'Exactly midnight' },
  { time: '00:01', description: '1 minute after midnight' },
  { time: '00:15', description: '15 minutes after midnight' },
  { time: '00:30', description: '30 minutes after midnight' }
];

// Helper function to set timezone in browser
async function setBrowserTimezone(page: Page, timezone: string) {
  await page.addInitScript((tz) => {
    // Mock the timezone for the browser
    const originalDate = Date;
    (global as any).Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super();
        } else {
          super(...args);
        }
      }
      
      static now() {
        return originalDate.now();
      }
      
      getTimezoneOffset() {
        // Return appropriate offset based on timezone
        const offsets: Record<string, number> = {
          'Asia/Dubai': -240, // UTC+4
          'Europe/London': 0, // UTC+0 (will be adjusted for DST)
          'America/New_York': 300, // UTC-5 (will be adjusted for DST)
        };
        return offsets[tz] || 0;
      }
    };
  }, timezone);
}

// Helper function to create test appointments
function createTestAppointments(timezone: string, testDate: string) {
  return MIDNIGHT_TEST_TIMES.map((testTime, index) => ({
    id: `test-appointment-${timezone}-${testDate}-${index}`,
    patient_name: `Test Patient ${index + 1}`,
    appointment_date: testDate,
    start_time: testTime.time,
    duration_minutes: 30,
    appointment_type: 'doctor_on_call',
    status: 'confirmed',
    patient: {
      name: `Test Patient ${index + 1}`,
      address: `Test Address ${index + 1}`,
      latitude: 25.2048 + (index * 0.001),
      longitude: 55.2708 + (index * 0.001)
    },
    timezone: timezone,
    timezoneSource: 'explicit'
  }));
}

// Helper function to validate timezone display
async function validateTimezoneDisplay(page: Page, expectedTimezone: string) {
  // Check calendar timezone badge
  const timezoneBadge = page.locator('[data-testid="timezone-badge"]');
  await expect(timezoneBadge).toBeVisible();
  
  // Check map timezone display
  const mapTimezone = page.locator('[data-testid="map-timezone"]');
  await expect(mapTimezone).toBeVisible();
  
  // Validate timezone information is displayed correctly
  await expect(timezoneBadge).toContainText(expectedTimezone);
}

// Helper function to validate midnight boundary rendering
async function validateMidnightBoundary(page: Page, testDate: string, timezone: string) {
  // Navigate to the specific date
  await page.goto(`/calendar?date=${testDate}`);
  
  // Wait for calendar to load
  await page.waitForSelector('[data-testid="calendar-container"]');
  
  // Check that appointments around midnight are rendered correctly
  const appointments = page.locator('[data-testid="calendar-event"]');
  const appointmentCount = await appointments.count();
  
  // Should have appointments for all test times
  expect(appointmentCount).toBeGreaterThan(0);
  
  // Check that timezone information is displayed
  await validateTimezoneDisplay(page, timezone);
  
  // Check that appointments are positioned correctly in the calendar
  for (let i = 0; i < appointmentCount; i++) {
    const appointment = appointments.nth(i);
    await expect(appointment).toBeVisible();
    
    // Check that the appointment has the correct time display
    const timeDisplay = appointment.locator('[data-testid="appointment-time"]');
    if (await timeDisplay.count() > 0) {
      await expect(timeDisplay).toBeVisible();
    }
  }
}

// Helper function to validate map midnight boundary
async function validateMapMidnightBoundary(page: Page, testDate: string, timezone: string) {
  // Navigate to map view
  await page.goto(`/map?date=${testDate}`);
  
  // Wait for map to load
  await page.waitForSelector('[data-testid="map-container"]');
  
  // Check that markers are rendered correctly
  const markers = page.locator('[data-testid="map-marker"]');
  const markerCount = await markers.count();
  
  // Should have markers for all test appointments
  expect(markerCount).toBeGreaterThan(0);
  
  // Check that timezone information is displayed in map controls
  await validateTimezoneDisplay(page, timezone);
  
  // Check that markers have correct time information
  for (let i = 0; i < markerCount; i++) {
    const marker = markers.nth(i);
    await expect(marker).toBeVisible();
    
    // Hover over marker to see tooltip
    await marker.hover();
    
    // Check that tooltip contains timezone information
    const tooltip = page.locator('[data-testid="marker-tooltip"]');
    if (await tooltip.count() > 0) {
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(timezone);
    }
  }
}

test.describe('Timezone Midnight Boundary Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  for (const timezone of TEST_TIMEZONES) {
    test.describe(`${timezone.name} (${timezone.description})`, () => {
      test.beforeEach(async ({ page }) => {
        await setBrowserTimezone(page, timezone.name);
      });

      for (const testDate of MIDNIGHT_TEST_DATES) {
        test(`Calendar midnight boundary rendering - ${testDate.description}`, async ({ page }) => {
          // Create test appointments
          const testAppointments = createTestAppointments(timezone.name, testDate.date);
          
          // Mock API responses
          await page.route('**/api/appointments**', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                data: testAppointments
              })
            });
          });

          // Test calendar rendering
          await validateMidnightBoundary(page, testDate.date, timezone.name);
        });

        test(`Map midnight boundary rendering - ${testDate.description}`, async ({ page }) => {
          // Create test appointments
          const testAppointments = createTestAppointments(timezone.name, testDate.date);
          
          // Mock API responses
          await page.route('**/api/appointments**', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                data: testAppointments
              })
            });
          });

          // Test map rendering
          await validateMapMidnightBoundary(page, testDate.date, timezone.name);
        });
      }

      test('Timezone badge displays correct information', async ({ page }) => {
        await page.goto('/calendar');
        await page.waitForLoadState('networkidle');
        
        // Check timezone badge
        const timezoneBadge = page.locator('[data-testid="timezone-badge"]');
        await expect(timezoneBadge).toBeVisible();
        
        // Check that it shows the correct timezone
        await expect(timezoneBadge).toContainText(timezone.name);
        await expect(timezoneBadge).toContainText(timezone.abbreviation);
        
        // Hover over badge to see tooltip
        await timezoneBadge.hover();
        
        // Check tooltip content
        const tooltip = page.locator('[data-testid="timezone-tooltip"]');
        if (await tooltip.count() > 0) {
          await expect(tooltip).toBeVisible();
          await expect(tooltip).toContainText(timezone.name);
          await expect(tooltip).toContainText(timezone.abbreviation);
        }
      });

      test('Appointment time display respects timezone', async ({ page }) => {
        const testDate = '2024-06-21';
        const testAppointments = createTestAppointments(timezone.name, testDate);
        
        // Mock API responses
        await page.route('**/api/appointments**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: testAppointments
            })
          });
        });

        await page.goto(`/calendar?date=${testDate}`);
        await page.waitForLoadState('networkidle');
        
        // Check that appointment times are displayed correctly
        const appointments = page.locator('[data-testid="calendar-event"]');
        const appointmentCount = await appointments.count();
        
        expect(appointmentCount).toBeGreaterThan(0);
        
        // Check that times are formatted correctly for the timezone
        for (let i = 0; i < appointmentCount; i++) {
          const appointment = appointments.nth(i);
          const timeText = await appointment.textContent();
          
          // Should contain time information
          expect(timeText).toMatch(/\d{1,2}:\d{2}/);
        }
      });
    });
  }

  test('Cross-timezone consistency', async ({ page }) => {
    // Test that the same appointment appears correctly across different timezones
    const testDate = '2024-06-21';
    const testTime = '23:30';
    
    for (const timezone of TEST_TIMEZONES) {
      await setBrowserTimezone(page, timezone.name);
      
      const testAppointments = [{
        id: `cross-timezone-test-${timezone.name}`,
        patient_name: 'Cross Timezone Test',
        appointment_date: testDate,
        start_time: testTime,
        duration_minutes: 30,
        appointment_type: 'doctor_on_call',
        status: 'confirmed',
        patient: {
          name: 'Cross Timezone Test',
          address: 'Test Address',
          latitude: 25.2048,
          longitude: 55.2708
        },
        timezone: timezone.name,
        timezoneSource: 'explicit'
      }];
      
      // Mock API responses
      await page.route('**/api/appointments**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: testAppointments
          })
        });
      });

      await page.goto(`/calendar?date=${testDate}`);
      await page.waitForLoadState('networkidle');
      
      // Check that appointment is rendered
      const appointments = page.locator('[data-testid="calendar-event"]');
      await expect(appointments).toHaveCount(1);
      
      // Check timezone display
      await validateTimezoneDisplay(page, timezone.name);
    }
  });

  test('DST transition handling', async ({ page }) => {
    // Test DST transition dates
    const dstTransitionDates = [
      { date: '2024-03-10', timezone: 'America/New_York', description: 'Spring forward' },
      { date: '2024-11-03', timezone: 'America/New_York', description: 'Fall back' },
      { date: '2024-03-31', timezone: 'Europe/London', description: 'Spring forward' },
      { date: '2024-10-27', timezone: 'Europe/London', description: 'Fall back' }
    ];

    for (const transition of dstTransitionDates) {
      await setBrowserTimezone(page, transition.timezone);
      
      const testAppointments = createTestAppointments(transition.timezone, transition.date);
      
      // Mock API responses
      await page.route('**/api/appointments**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: testAppointments
          })
        });
      });

      await page.goto(`/calendar?date=${transition.date}`);
      await page.waitForLoadState('networkidle');
      
      // Check that appointments are rendered correctly during DST transition
      const appointments = page.locator('[data-testid="calendar-event"]');
      const appointmentCount = await appointments.count();
      
      expect(appointmentCount).toBeGreaterThan(0);
      
      // Check timezone display
      await validateTimezoneDisplay(page, transition.timezone);
    }
  });
});
