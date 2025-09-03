# E2E Tests for MediCare Scheduler

This directory contains end-to-end tests for the MediCare Scheduler application using Playwright.

## Test Structure

### Critical Flows
- **Patient Management** (`patient-management.spec.ts`) - Tests patient CRUD operations
- **Staff Management** (`staff-management.spec.ts`) - Tests staff CRUD operations  
- **Appointment Scheduling** (`appointment-scheduling.spec.ts`) - Tests appointment creation, editing, copying, and calendar interactions
- **Calendar Integration** (`calendar-integration.spec.ts`) - Tests Google Calendar sync and webhook handling
- **Daily Agenda** (`daily-agenda.spec.ts`) - Tests email agenda system
- **Complete User Journey** (`complete-user-journey.spec.ts`) - Full end-to-end workflow tests

### Test Utilities
- **Page Objects** (`utils/page-objects.ts`) - Reusable page object models
- **Test Data** (`utils/test-data.ts`) - Centralized test data and selectors
- **Global Setup/Teardown** - Application initialization and cleanup

## Running Tests

### Prerequisites
1. Install dependencies: `npm install`
2. Install Playwright browsers: `npm run test:e2e:install`
3. Start the application: `npm run dev`
4. Start Supabase: `npx supabase start`

### Commands
```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/critical-flows/patient-management.spec.ts

# Run tests on specific browser
npx playwright test --project=chromium
```

## Test Configuration

### Playwright Config (`playwright.config.ts`)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URL**: http://localhost:3000
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Parallel**: Full parallelization locally, single worker on CI

### Environment Variables
- `PLAYWRIGHT_BASE_URL`: Base URL for the application (default: http://localhost:3000)
- `CI`: Set to true in CI environment

## Test Data

Test data is centralized in `utils/test-data.ts` and includes:
- **Patients**: Valid and minimal patient data
- **Staff**: Doctor, nurse, and driver data
- **Appointments**: Different appointment types with custom fields
- **Selectors**: Data-testid selectors for reliable element targeting

## Page Object Model

The tests use a page object model pattern for maintainability:
- **BasePage**: Common functionality (navigation, loading, toasts)
- **PatientPage**: Patient management operations
- **StaffPage**: Staff management operations
- **AppointmentPage**: Appointment and calendar operations
- **DashboardPage**: Dashboard and statistics

## CI/CD Integration

### GitHub Actions
The E2E tests run automatically on:
- Push to main/develop branches
- Pull requests to main/develop branches

### Test Reports
- HTML reports uploaded as artifacts
- JSON results for integration with other tools
- Screenshots and videos on failure

## Best Practices

### Test Design
1. **Independent Tests**: Each test should be able to run independently
2. **Data Isolation**: Use unique test data to avoid conflicts
3. **Cleanup**: Tests clean up after themselves
4. **Reliable Selectors**: Use data-testid attributes for element selection

### Error Handling
1. **Graceful Failures**: Tests handle network errors and timeouts
2. **Retry Logic**: Built-in retry for flaky operations
3. **Clear Assertions**: Descriptive error messages

### Performance
1. **Parallel Execution**: Tests run in parallel for speed
2. **Efficient Waiting**: Use proper wait strategies
3. **Resource Management**: Clean up resources after tests

## Debugging

### Local Debugging
```bash
# Run with debug mode
npm run test:e2e:debug

# Run specific test with debug
npx playwright test tests/e2e/critical-flows/patient-management.spec.ts --debug
```

### CI Debugging
1. Check test artifacts in GitHub Actions
2. Review HTML reports for failure details
3. Check screenshots and videos for visual debugging

## Maintenance

### Adding New Tests
1. Create test file in appropriate directory
2. Use existing page objects or create new ones
3. Add test data to `test-data.ts` if needed
4. Update this README with new test descriptions

### Updating Selectors
1. Update selectors in `test-data.ts`
2. Ensure all tests use centralized selectors
3. Update page objects if needed

### Test Data Management
1. Keep test data realistic but unique
2. Use consistent naming conventions
3. Document any special test data requirements
