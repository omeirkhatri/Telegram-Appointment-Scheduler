# Comprehensive Testing Suite for MediCare Scheduler

This directory contains a comprehensive testing suite that covers all aspects of the MediCare Scheduler application, including forms, buttons, API endpoints, and user interactions.

## Test Structure

```
tests/
├── e2e/                          # End-to-end tests
│   ├── forms/                    # Form submission tests
│   │   └── form-submission-tests.spec.ts
│   ├── api/                      # API endpoint tests
│   │   └── api-endpoint-tests.spec.ts
│   ├── interactions/             # Button and interaction tests
│   │   └── button-interaction-tests.spec.ts
│   ├── critical-flows/           # Critical user journey tests
│   ├── accessibility/            # Accessibility tests
│   └── performance/              # Performance tests
├── accessibility/                # Accessibility-specific tests
├── performance/                  # Performance-specific tests
└── README.md                     # This file
```

## Test Categories

### 1. Form Submission Tests (`tests/e2e/forms/`)

Tests all forms in the application to ensure they:
- Submit data correctly with valid input
- Show appropriate validation errors for invalid input
- Handle loading states during submission
- Cancel properly when requested
- Handle network errors gracefully
- Validate specific business rules (e.g., appointment dates, time constraints)

**Forms Tested:**
- Patient Form
- Staff Form
- Appointment Form
- Settings Forms
- Search and Filter Forms

### 2. API Endpoint Tests (`tests/e2e/api/`)

Tests all API endpoints to ensure they:
- Return correct responses for valid requests
- Handle invalid requests appropriately
- Return proper error codes and messages
- Validate input data correctly
- Handle authentication and authorization
- Perform CRUD operations correctly

**API Endpoints Tested:**
- `/api/patients` (GET, POST, PUT, DELETE)
- `/api/staff` (GET, POST, PUT, DELETE)
- `/api/appointments` (GET, POST, PUT, DELETE)
- `/api/reports/statistics`
- `/api/email/delivery`
- `/api/jobs`
- `/api/health`
- Search and filter endpoints

### 3. Button Interaction Tests (`tests/e2e/interactions/`)

Tests all interactive elements to ensure they:
- Navigate correctly between pages
- Open and close modals/dialogs properly
- Perform bulk actions correctly
- Handle pagination properly
- Support keyboard shortcuts
- Show appropriate loading states
- Have proper accessibility attributes

**Interactions Tested:**
- Navigation buttons
- Action buttons (Create, Edit, Delete)
- Filter and search buttons
- Bulk action buttons
- Pagination controls
- Modal/dialog controls
- Keyboard shortcuts
- Export/import buttons

### 4. Critical Flow Tests (`tests/e2e/critical-flows/`)

Tests complete user journeys:
- Patient management workflow
- Staff management workflow
- Appointment scheduling workflow
- Calendar integration
- Daily agenda generation
- Complete user journey from login to task completion

### 5. Accessibility Tests (`tests/accessibility/`)

Tests accessibility compliance:
- Screen reader compatibility
- Keyboard navigation
- Color contrast
- ARIA labels and roles
- Focus management
- Visual accessibility

### 6. Performance Tests (`tests/performance/`)

Tests application performance:
- Page load times
- Calendar rendering performance
- Google Calendar sync performance
- Lighthouse performance audits
- Performance monitoring

## Running Tests

### Quick Start

```bash
# Run all comprehensive tests
npm run test:comprehensive

# Run specific test categories
npm run test:comprehensive:forms
npm run test:comprehensive:api
npm run test:comprehensive:buttons

# Run individual test suites
npm run test:e2e:forms
npm run test:e2e:api
npm run test:e2e:buttons
```

### Using the Test Runner Script

The comprehensive test runner script (`scripts/run-comprehensive-tests.sh`) provides detailed control over which tests to run:

```bash
# Run all tests
./scripts/run-comprehensive-tests.sh --all

# Run specific test types
./scripts/run-comprehensive-tests.sh --forms
./scripts/run-comprehensive-tests.sh --api
./scripts/run-comprehensive-tests.sh --buttons
./scripts/run-comprehensive-tests.sh --accessibility
./scripts/run-comprehensive-tests.sh --performance
./scripts/run-comprehensive-tests.sh --e2e

# Run multiple test types
./scripts/run-comprehensive-tests.sh --forms --api --buttons
```

### Available NPM Scripts

```bash
# Unit Tests
npm run test:unit                    # Run unit tests
npm run test:watch                   # Run unit tests in watch mode
npm run test:coverage                # Run unit tests with coverage

# Integration Tests
npm run test:integration             # Run integration tests

# End-to-End Tests
npm run test:e2e                     # Run all e2e tests
npm run test:e2e:ui                  # Run e2e tests with UI
npm run test:e2e:headed              # Run e2e tests in headed mode
npm run test:e2e:debug               # Run e2e tests in debug mode
npm run test:e2e:forms               # Run form submission tests
npm run test:e2e:api                 # Run API endpoint tests
npm run test:e2e:buttons             # Run button interaction tests

# Accessibility Tests
npm run test:accessibility           # Run accessibility tests
npm run test:a11y                    # Alias for accessibility tests

# Performance Tests
npm run test:performance             # Run performance tests
npm run test:performance:lighthouse  # Run Lighthouse performance audit

# Comprehensive Tests
npm run test:comprehensive           # Run all comprehensive tests
npm run test:comprehensive:forms     # Run form tests only
npm run test:comprehensive:api       # Run API tests only
npm run test:comprehensive:buttons   # Run button tests only
```

## Test Data

Test data is centralized in `tests/e2e/utils/test-data.ts` and includes:
- Valid and invalid data for all forms
- Test selectors for consistent element targeting
- Mock data for API testing
- Sample users, patients, staff, and appointments

## Test Configuration

### Playwright Configuration
- Located in `playwright.config.ts`
- Configured for multiple browsers (Chrome, Firefox, Safari)
- Mobile testing support
- Performance and accessibility test projects
- Screenshot and video recording on failure

### Jest Configuration
- Located in `jest.config.js`
- Configured for Next.js
- TypeScript support
- Coverage reporting
- Test environment setup

## Writing New Tests

### Form Tests
When adding new forms, create tests that cover:
1. Valid form submission
2. Validation error handling
3. Loading states
4. Cancel functionality
5. Network error handling

### API Tests
When adding new API endpoints, create tests that cover:
1. Successful requests
2. Error handling
3. Input validation
4. Authentication/authorization
5. Response format validation

### Button Tests
When adding new interactive elements, create tests that cover:
1. Click functionality
2. Loading states
3. Accessibility attributes
4. Keyboard shortcuts
5. Error handling

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Test both happy path and error scenarios**
3. **Include accessibility testing** for all interactive elements
4. **Mock external dependencies** appropriately
5. **Use descriptive test names** that explain what is being tested
6. **Group related tests** using `describe` blocks
7. **Clean up after tests** to avoid test interference
8. **Use proper wait strategies** instead of fixed timeouts

## Continuous Integration

The test suite is designed to run in CI environments:
- All tests can run in headless mode
- Performance tests have appropriate timeouts
- Test reports are generated in multiple formats (HTML, JSON, JUnit)
- Coverage reports are generated for unit tests

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout values or improve wait strategies
2. **Element not found**: Ensure data-testid attributes are present
3. **Flaky tests**: Use proper wait strategies and avoid fixed delays
4. **API tests failing**: Check that the development server is running
5. **Accessibility tests failing**: Review ARIA attributes and keyboard navigation

### Debug Mode

Run tests in debug mode to step through them:
```bash
npm run test:e2e:debug
```

### Test Reports

Test reports are generated in the `test-results/` directory:
- HTML reports for visual review
- JSON reports for CI integration
- JUnit reports for build systems

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Add appropriate data-testid attributes to components
3. Update test data as needed
4. Ensure tests are deterministic and reliable
5. Add documentation for complex test scenarios

## Support

For questions about the test suite:
1. Check this README first
2. Review existing test examples
3. Check the test configuration files
4. Consult the Playwright and Jest documentation
