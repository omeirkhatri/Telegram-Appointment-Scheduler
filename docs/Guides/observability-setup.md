# Observability Setup Guide

This guide explains how to set up and use the comprehensive observability system for the MediCare Scheduler application.

## Overview

The observability system provides:
- **Structured Logging**: Comprehensive logging with different levels and contexts
- **Error Tracking**: Automatic error detection, tracking, and reporting
- **Performance Monitoring**: Metrics collection and performance analysis
- **Health Checks**: System health monitoring and status reporting
- **Real-time Dashboard**: Web-based monitoring interface

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │  Observability   │    │   Database      │
│                 │    │     Services     │    │                 │
│ - Logging       │◄──►│ - LoggingService │◄──►│ - application_  │
│ - Error Tracking│    │ - ErrorTracking  │    │   logs          │
│ - Performance   │    │ - Performance    │    │ - error_        │
│ - Health Checks │    │ - HealthCheck    │    │   tracking      │
└─────────────────┘    └──────────────────┘    │ - performance_  │
                                               │   metrics       │
                                               │ - health_checks │
                                               └─────────────────┘
```

## Quick Start

### 1. Access the Dashboard

Navigate to the observability dashboard in your application to view real-time system status.

### 2. Check System Health

```bash
# Check overall system health
curl http://localhost:3000/api/health

# Get detailed observability status
curl http://localhost:3000/api/observability/status
```

### 3. View Logs

The system automatically logs all activities. Check the console or database for detailed logs.

## Configuration

### Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=info                    # Log level (debug/info/warn/error)
SENTRY_DSN=https://...            # Optional: Sentry integration

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_METRICS_RETENTION_DAYS=7

# Error Tracking
ENABLE_ERROR_TRACKING=true
ERROR_RETENTION_DAYS=30

# Health Checks
HEALTH_CHECK_INTERVAL=30000       # Health check interval (ms)
HEALTH_CHECK_TIMEOUT=5000         # Health check timeout (ms)
```

### Logging Levels

- **debug**: Detailed debugging information
- **info**: General information about application flow
- **warn**: Warning messages for potential issues
- **error**: Error messages for failed operations
- **fatal**: Critical errors that may cause application failure

## Services

### 1. Logging Service

The logging service provides structured logging with context and metadata.

```typescript
import { loggingService } from '@/services/loggingService';

// Basic logging
loggingService.info('User logged in', {
  userId: 'user-123',
  component: 'auth',
  action: 'login',
});

// Error logging
loggingService.error('Database connection failed', error, {
  component: 'database',
  action: 'connect',
  metadata: { host: 'localhost', port: 5432 },
});

// Performance logging
loggingService.performance('API request completed', 150, {
  component: 'api',
  action: 'request',
  metadata: { method: 'GET', path: '/api/users' },
});
```

### 2. Error Tracking Service

Automatic error detection and tracking with severity levels.

```typescript
import { errorTrackingService } from '@/services/errorTrackingService';

// Track API errors
await errorTrackingService.trackApiError(
  error,
  'GET',
  '/api/appointments',
  500,
  { userId: 'user-123' }
);

// Track database errors
await errorTrackingService.trackDatabaseError(
  error,
  'SELECT',
  'appointments',
  { query: 'SELECT * FROM appointments' }
);

// Track client-side errors
await errorTrackingService.trackClientError(
  error,
  'AppointmentForm',
  { userId: 'user-123', action: 'submit' }
);
```

### 3. Performance Monitoring Service

Metrics collection for performance analysis.

```typescript
import { performanceMonitoringService } from '@/services/performanceMonitoringService';

// Record API response time
performanceMonitoringService.recordApiResponseTime(
  'GET',
  '/api/appointments',
  200,
  150,
  { userId: 'user-123' }
);

// Record database operation time
performanceMonitoringService.recordDatabaseOperation(
  'SELECT',
  'appointments',
  45,
  { query: 'SELECT * FROM appointments' }
);

// Record memory usage
performanceMonitoringService.recordMemoryUsage({
  component: 'system',
  action: 'check',
});
```

### 4. Health Check Service

Comprehensive system health monitoring.

```typescript
import { healthCheckService } from '@/services/healthCheckService';

// Perform health check
const healthStatus = await healthCheckService.performHealthCheck();

// Get recent health checks
const recentChecks = await healthCheckService.getRecentHealthChecks(10);
```

## Database Tables

The observability system creates and manages these database tables:

### application_logs
Stores structured log entries with context and metadata.

```sql
CREATE TABLE application_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  error JSONB,
  performance JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### error_tracking
Tracks errors with severity levels and resolution status.

```sql
CREATE TABLE error_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id VARCHAR(255) NOT NULL UNIQUE,
  error_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  severity VARCHAR(20) NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### performance_metrics
Stores performance metrics with context and tags.

```sql
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL NOT NULL,
  metric_unit VARCHAR(20),
  context JSONB,
  tags TEXT[],
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### health_checks
Stores health check results and system status.

```sql
CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_status VARCHAR(20) NOT NULL,
  checks JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uptime BIGINT NOT NULL,
  version VARCHAR(50) NOT NULL
);
```

## API Endpoints

### Health Check Endpoint

```bash
GET /api/health
```

Returns overall system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400000,
  "version": "1.0.0",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "message": "Database is healthy",
      "duration": 45,
      "lastChecked": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Observability Status Endpoint

```bash
GET /api/observability/status
```

Returns comprehensive observability status including logs, errors, performance, and health.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "logging": {
    "status": "healthy",
    "data": {
      "totalLogs": 1250,
      "logsByLevel": {
        "info": 800,
        "warn": 200,
        "error": 50
      },
      "recentErrors": 5
    }
  },
  "errors": {
    "status": "healthy",
    "data": {
      "totalErrors": 25,
      "unresolvedErrors": 3,
      "recentErrors": 2
    }
  },
  "performance": {
    "status": "healthy",
    "data": {
      "totalMetrics": 500,
      "slowestOperations": [
        {
          "name": "api_response_time",
          "average": 150,
          "count": 100
        }
      ]
    }
  },
  "health": {
    "status": "healthy",
    "data": {
      "overall": "healthy",
      "checks": [...],
      "uptime": 86400000,
      "version": "1.0.0"
    }
  }
}
```

## Dashboard Usage

### 1. System Overview

The dashboard provides a high-level view of system status:
- Overall system health
- Uptime and version information
- Last update timestamp

### 2. Health Checks

Monitor individual service health:
- Database connectivity and performance
- API response times and error rates
- Email service configuration
- Calendar service status
- Storage accessibility
- Worker process status
- Memory and disk usage

### 3. Logging Statistics

View logging metrics:
- Total log entries
- Recent error count
- Log levels distribution
- Component activity

### 4. Error Statistics

Monitor error trends:
- Total error count
- Unresolved errors
- Recent errors (24h)
- Error severity distribution

### 5. Performance Statistics

Track performance metrics:
- Total metrics collected
- Recent metrics count
- Slowest operations
- Performance trends

## Monitoring and Alerting

### 1. Health Check Monitoring

Set up monitoring for health check endpoints:

```bash
# Monitor health endpoint
curl -f http://localhost:3000/api/health || echo "Health check failed"

# Monitor observability endpoint
curl -f http://localhost:3000/api/observability/status || echo "Observability check failed"
```

### 2. Log Monitoring

Monitor logs for critical issues:

```bash
# Check for recent errors
grep -i "error\|fatal" logs/application.log | tail -10

# Monitor specific components
grep "component:database" logs/application.log | tail -5
```

### 3. Performance Monitoring

Monitor performance metrics:

```bash
# Check slow operations
grep "slow" logs/performance.log | tail -5

# Monitor memory usage
grep "memory" logs/performance.log | tail -5
```

## Troubleshooting

### Common Issues

#### 1. High Error Rate

**Problem**: High number of errors in the system
**Solution**:
- Check error tracking dashboard
- Review error details and stack traces
- Identify patterns in error types
- Fix underlying issues

#### 2. Slow Performance

**Problem**: Slow system performance
**Solution**:
- Check performance metrics dashboard
- Identify slowest operations
- Review database query performance
- Optimize slow operations

#### 3. Health Check Failures

**Problem**: Health checks failing
**Solution**:
- Check individual service status
- Verify service configurations
- Review service logs
- Restart failed services

#### 4. Logging Issues

**Problem**: Logs not appearing or incomplete
**Solution**:
- Check log level configuration
- Verify database connectivity
- Review logging service status
- Check log retention settings

### Performance Optimization

#### 1. Log Retention

Configure appropriate log retention periods:

```typescript
// Configure log retention
const loggingService = new LoggingService({
  maxRetentionDays: 7, // Keep logs for 7 days
  batchSize: 100,      // Batch size for database writes
  flushInterval: 5000, // Flush interval in milliseconds
});
```

#### 2. Metrics Collection

Optimize metrics collection:

```typescript
// Configure performance monitoring
const performanceService = new PerformanceMonitoringService({
  enableMemoryMonitoring: true,
  enableCpuMonitoring: false, // Disable if not needed
  metricsRetentionDays: 7,
});
```

#### 3. Health Check Frequency

Adjust health check frequency based on needs:

```typescript
// Configure health checks
const healthService = new HealthCheckService({
  checkInterval: 30000,  // 30 seconds
  timeout: 5000,         // 5 seconds
  enableDetailedChecks: true,
});
```

## Security Considerations

### 1. Log Security

- Sanitize sensitive data in logs
- Use appropriate log levels
- Implement log access controls
- Regular log review and cleanup

### 2. Error Information

- Avoid exposing sensitive information in error messages
- Implement proper error handling
- Use structured error reporting
- Regular error review and resolution

### 3. Performance Data

- Protect performance metrics from unauthorized access
- Implement proper access controls
- Regular performance data review
- Optimize data collection

## Best Practices

### 1. Logging

- Use appropriate log levels
- Include relevant context
- Structure log messages consistently
- Avoid logging sensitive information

### 2. Error Tracking

- Track all errors with context
- Categorize errors by severity
- Implement error resolution workflow
- Regular error analysis

### 3. Performance Monitoring

- Monitor key performance indicators
- Set up performance alerts
- Regular performance analysis
- Optimize based on metrics

### 4. Health Checks

- Implement comprehensive health checks
- Monitor all critical services
- Set up health check alerts
- Regular health check review

## Support

For issues with the observability system:

1. Check the troubleshooting section above
2. Review system logs for error messages
3. Verify service configurations
4. Check database connectivity
5. Review health check results

---

**Important**: Always test the observability system in a staging environment before deploying to production.
