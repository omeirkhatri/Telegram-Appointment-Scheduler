# Performance Testing for MediCare Scheduler

This directory contains comprehensive performance tests for the MediCare Scheduler application, ensuring it meets the performance requirements specified in the PRD.

## Performance Requirements (from PRD)

- **Initial page load**: < 2 seconds
- **Calendar render (month, 200 events)**: < 1 second
- **Google sync latency**: < 5 seconds
- **Uptime**: 99.5%

## Test Structure

### Core Performance Tests
- **Page Load Performance** (`page-load-performance.spec.ts`) - Tests initial page load times for all main pages
- **Calendar Render Performance** (`calendar-render-performance.spec.ts`) - Tests calendar rendering with various event counts
- **Google Sync Performance** (`google-sync-performance.spec.ts`) - Tests Google Calendar synchronization latency
- **Performance Monitoring** (`performance-monitoring.spec.ts`) - Comprehensive monitoring and reporting
- **Lighthouse Performance** (`lighthouse-performance.spec.ts`) - Lighthouse audits for all pages

### Test Utilities
- **Performance Helpers** (`utils/performance-helpers.ts`) - Reusable performance measurement utilities
- **Thresholds and Metrics** - Centralized performance thresholds and measurement functions

## Running Performance Tests

### Prerequisites
1. Install dependencies: `npm install`
2. Install Playwright browsers: `npm run test:e2e:install`
3. Start the application: `npm run dev`
4. Start Supabase: `npx supabase start`

### Commands
```bash
# Run all performance tests
npm run test:performance

# Run Lighthouse audits
npm run test:performance:lighthouse

# Run performance tests in CI mode
npm run test:performance:ci

# Run specific performance test file
npx playwright test tests/performance/page-load-performance.spec.ts --project=performance
```

## Performance Thresholds

### Default Thresholds (Page Load)
- Load Time: < 2000ms
- First Contentful Paint: < 1500ms
- Largest Contentful Paint: < 2500ms
- First Input Delay: < 100ms
- Cumulative Layout Shift: < 0.1
- Total Blocking Time: < 300ms
- Speed Index: < 2000ms

### Calendar-Specific Thresholds
- Load Time: < 1000ms
- First Contentful Paint: < 800ms
- Largest Contentful Paint: < 1200ms
- First Input Delay: < 50ms
- Cumulative Layout Shift: < 0.05
- Total Blocking Time: < 150ms
- Speed Index: < 1000ms

### Google Sync Thresholds
- Load Time: < 5000ms
- First Contentful Paint: < 3000ms
- Largest Contentful Paint: < 4000ms
- First Input Delay: < 200ms
- Cumulative Layout Shift: < 0.1
- Total Blocking Time: < 500ms
- Speed Index: < 3000ms

## Test Coverage

### Page Load Performance Tests
- Dashboard page load
- Patients page load
- Staff page load
- Appointments page load
- Settings page load
- Navigation between pages
- Cached vs non-cached performance
- Large dataset handling
- Concurrent page loads

### Calendar Render Performance Tests
- Calendar with 10 events
- Calendar with 50 events
- Calendar with 100 events
- Calendar with 200 events (PRD requirement)
- View switching (day/week/month/agenda)
- Filtering performance
- Scrolling performance
- Event interactions
- Multiple calendar instances
- Mixed appointment types

### Google Sync Performance Tests
- Appointment creation sync
- Concurrent sync operations
- Sync retry scenarios
- Bulk appointment sync
- Different appointment types
- Multiple staff members
- Sync failure and recovery
- Webhook processing

### Performance Monitoring Tests
- Comprehensive performance reporting
- Performance over time monitoring
- Performance regression detection
- Resource usage monitoring
- Memory usage monitoring
- Performance budget reporting

### Lighthouse Performance Tests
- Dashboard Lighthouse audit
- Appointments page Lighthouse audit
- Patients page Lighthouse audit
- Staff page Lighthouse audit
- Settings page Lighthouse audit
- Comprehensive Lighthouse reporting

## Performance Metrics

### Core Web Vitals
- **First Contentful Paint (FCP)**: Time when first content appears
- **Largest Contentful Paint (LCP)**: Time when largest content appears
- **First Input Delay (FID)**: Time from first user interaction to browser response
- **Cumulative Layout Shift (CLS)**: Visual stability measure
- **Total Blocking Time (TBT)**: Time when main thread is blocked
- **Speed Index (SI)**: How quickly content is visually displayed

### Custom Metrics
- **Load Time**: Total time from navigation start to load complete
- **Calendar Render Time**: Time to render calendar with specified event count
- **Google Sync Time**: Time for Google Calendar synchronization
- **Resource Usage**: Total resource size and count
- **Memory Usage**: JavaScript heap usage

## CI/CD Integration

### GitHub Actions
Performance tests run automatically on:
- Push to main branch (full performance suite)
- Pull requests (performance regression detection)
- Scheduled runs (performance monitoring)

### Performance Reports
- JSON reports uploaded as artifacts
- Lighthouse HTML reports
- Performance trend analysis
- Regression detection alerts
- PR comments with performance results

## Performance Budget

The application maintains a performance budget to ensure consistent performance:

- **Page Load**: 2 seconds maximum
- **Calendar Render**: 1 second maximum
- **Google Sync**: 5 seconds maximum
- **Resource Size**: 2MB maximum
- **Resource Count**: 100 resources maximum

## Debugging Performance Issues

### Local Debugging
```bash
# Run performance tests with debug output
npx playwright test tests/performance --project=performance --debug

# Run specific test with trace
npx playwright test tests/performance/page-load-performance.spec.ts --project=performance --trace on
```

### Performance Analysis
1. Check performance reports in `performance-reports/` directory
2. Review Lighthouse reports for detailed metrics
3. Analyze trace files for performance bottlenecks
4. Monitor resource usage and memory consumption

### Common Performance Issues
- **Slow page loads**: Check bundle size, optimize images, enable caching
- **Slow calendar rendering**: Implement virtualization, optimize event rendering
- **Slow Google sync**: Check API rate limits, implement retry logic
- **High memory usage**: Check for memory leaks, optimize data structures

## Best Practices

### Test Design
1. **Realistic Scenarios**: Test with realistic data volumes
2. **Multiple Browsers**: Test across different browsers
3. **Network Conditions**: Test with different network speeds
4. **Device Types**: Test on desktop and mobile devices

### Performance Optimization
1. **Code Splitting**: Implement lazy loading for routes
2. **Image Optimization**: Use optimized images and lazy loading
3. **Caching**: Implement proper caching strategies
4. **Bundle Optimization**: Minimize and compress JavaScript bundles

### Monitoring
1. **Continuous Monitoring**: Run performance tests regularly
2. **Regression Detection**: Alert on performance regressions
3. **Trend Analysis**: Track performance over time
4. **Budget Enforcement**: Enforce performance budgets in CI/CD

## Maintenance

### Adding New Performance Tests
1. Create test file in appropriate directory
2. Use existing performance helpers and thresholds
3. Add test to CI/CD pipeline if needed
4. Update this README with new test descriptions

### Updating Thresholds
1. Update thresholds in `performance-helpers.ts`
2. Ensure thresholds align with PRD requirements
3. Update CI/CD expectations
4. Document threshold changes

### Performance Monitoring
1. Review performance reports regularly
2. Investigate performance regressions
3. Update performance budgets as needed
4. Optimize based on test results
