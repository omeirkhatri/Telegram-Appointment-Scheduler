# Cron Worker Setup Guide

This guide explains how to set up and manage the cron worker service for automated daily email sending in the MediCare Scheduler application.

## Overview

The cron worker service is responsible for:
- **Automated Daily Emails**: Sending daily appointment agendas to staff members
- **Job Scheduling**: Managing cron-based job execution
- **Health Monitoring**: Continuous health checks and status monitoring
- **Persistence**: Storing job definitions and execution history
- **Recovery**: Automatic restart and error handling

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web App       │    │   Cron Worker    │    │   Database      │
│                 │    │                  │    │                 │
│ - UI Controls   │◄──►│ - Job Scheduler  │◄──►│ - Job Defs      │
│ - Status View   │    │ - Email Service  │    │ - Executions    │
│ - Manual Triggers│   │ - Health Checks  │    │ - Worker Status │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Start the Worker

```bash
# Start the worker service
npm run worker:start

# Check status
npm run worker:status

# View logs
npm run worker:logs
```

### 2. Monitor via Web UI

Navigate to the settings page to view the worker status card with real-time monitoring.

### 3. Control the Worker

```bash
# Stop the worker
npm run worker:stop

# Restart the worker
npm run worker:restart

# View recent logs
npm run worker:logs 100
```

## Configuration

### Environment Variables

```bash
# Worker Configuration
NODE_ENV=production                    # Environment (production/development)
LOG_LEVEL=info                        # Log level (debug/info/warn/error)
TZ=Asia/Dubai                         # Timezone for cron jobs

# Job Configuration
MAX_CONCURRENT_JOBS=5                 # Maximum concurrent jobs
HEALTH_CHECK_INTERVAL=30000           # Health check interval (ms)
PERSISTENCE_INTERVAL=60000            # Persistence interval (ms)

# File Paths
PID_FILE=./worker.pid                 # PID file location
LOG_FILE=./logs/worker.log            # Log file location
ERROR_FILE=./logs/worker-error.log    # Error log location

# Restart Configuration
MAX_RESTARTS=5                        # Maximum restart attempts
RESTART_DELAY=5000                    # Restart delay (ms)
```

### Default Job Schedule

The daily agenda job runs automatically at **06:00 Asia/Dubai time** every day:

```cron
0 6 * * *  # 06:00 daily in Asia/Dubai timezone
```

## Production Deployment

### 1. Systemd Service (Recommended)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/medicare-worker.service
```

```ini
[Unit]
Description=MediCare Scheduler Cron Worker
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/path/to/medicare-scheduler
ExecStart=/usr/bin/node scripts/start-worker.js start
ExecStop=/usr/bin/node scripts/start-worker.js stop
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=TZ=Asia/Dubai
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable medicare-worker
sudo systemctl start medicare-worker
sudo systemctl status medicare-worker
```

### 2. PM2 Process Manager

Install PM2:

```bash
npm install -g pm2
```

Create PM2 ecosystem file:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'medicare-worker',
    script: 'scripts/start-worker.js',
    args: 'start',
    cwd: '/path/to/medicare-scheduler',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      TZ: 'Asia/Dubai',
      LOG_LEVEL: 'info'
    }
  }]
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Docker Deployment

Add to your `docker-compose.yml`:

```yaml
services:
  worker:
    build: .
    command: node scripts/start-worker.js start
    environment:
      - NODE_ENV=production
      - TZ=Asia/Dubai
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
    depends_on:
      - supabase-db
    restart: unless-stopped
```

## Monitoring and Maintenance

### Health Checks

The worker performs continuous health checks:

- **Scheduler Status**: Verifies job scheduler is running
- **Database Connection**: Tests database connectivity
- **Job Status**: Checks if jobs are properly registered

### Log Management

Logs are automatically rotated and managed:

```bash
# View real-time logs
tail -f logs/worker.log

# View error logs
tail -f logs/worker-error.log

# View last 100 lines
npm run worker:logs 100
```

### Database Tables

The worker creates and manages these database tables:

- `job_definitions`: Job configurations and schedules
- `job_executions`: Execution history and results
- `worker_status`: Current worker status
- `worker_health`: Health check history
- `worker_events`: Worker lifecycle events

### Manual Job Triggers

You can manually trigger jobs via API:

```bash
# Trigger daily agenda for all staff
curl -X POST http://localhost:3000/api/jobs/daily-agenda \
  -H "Content-Type: application/json" \
  -d '{"testMode": false}'

# Trigger for specific staff member
curl -X POST http://localhost:3000/api/jobs/daily-agenda \
  -H "Content-Type: application/json" \
  -d '{"staffId": "staff-uuid", "testMode": false}'

# Test mode (no actual emails sent)
curl -X POST http://localhost:3000/api/jobs/daily-agenda \
  -H "Content-Type: application/json" \
  -d '{"testMode": true}'
```

## Troubleshooting

### Common Issues

#### 1. Worker Won't Start

**Problem**: Worker fails to start
**Solution**:
```bash
# Check logs
npm run worker:logs

# Check environment variables
echo $NODE_ENV
echo $TZ

# Verify database connection
npm run validate-env
```

#### 2. Jobs Not Executing

**Problem**: Scheduled jobs not running
**Solution**:
```bash
# Check worker status
npm run worker:status

# Check job definitions
curl http://localhost:3000/api/jobs/daily-agenda

# Manually trigger job
curl -X POST http://localhost:3000/api/jobs/daily-agenda
```

#### 3. Email Delivery Issues

**Problem**: Emails not being sent
**Solution**:
```bash
# Test email configuration
curl -X POST http://localhost:3000/api/email/test

# Check SMTP settings
grep SMTP .env.local

# Test with test mode
curl -X POST http://localhost:3000/api/jobs/daily-agenda \
  -H "Content-Type: application/json" \
  -d '{"testMode": true}'
```

#### 4. High Memory Usage

**Problem**: Worker using too much memory
**Solution**:
```bash
# Check memory usage
ps aux | grep worker

# Restart worker
npm run worker:restart

# Adjust configuration
export MAX_CONCURRENT_JOBS=3
```

### Log Analysis

#### Error Patterns

```bash
# Check for common errors
grep -i "error\|failed\|exception" logs/worker-error.log

# Check email delivery issues
grep -i "email\|smtp" logs/worker.log

# Check database issues
grep -i "database\|connection" logs/worker.log
```

#### Performance Monitoring

```bash
# Check execution times
grep "completed successfully" logs/worker.log | tail -10

# Check job frequency
grep "Starting daily agenda job" logs/worker.log | wc -l

# Check success rates
grep "emailsSent" logs/worker.log | tail -10
```

## Security Considerations

### Process Security

- Run worker as non-root user
- Use proper file permissions
- Secure log files
- Monitor for suspicious activity

### Database Security

- Use connection pooling
- Implement proper RLS policies
- Regular security updates
- Monitor database access

### Email Security

- Use secure SMTP (TLS/SSL)
- Validate email addresses
- Implement rate limiting
- Monitor email delivery

## Backup and Recovery

### Job Configuration Backup

```bash
# Export job definitions
psql -d medicare_scheduler -c "SELECT * FROM job_definitions;" > job_backup.sql

# Export execution history
psql -d medicare_scheduler -c "SELECT * FROM job_executions;" > execution_backup.sql
```

### Worker State Recovery

```bash
# Restart worker after system reboot
sudo systemctl start medicare-worker

# Or with PM2
pm2 restart medicare-worker

# Or manually
npm run worker:start
```

## Performance Optimization

### Resource Tuning

```bash
# Adjust concurrent jobs
export MAX_CONCURRENT_JOBS=3

# Adjust health check frequency
export HEALTH_CHECK_INTERVAL=60000

# Adjust persistence frequency
export PERSISTENCE_INTERVAL=120000
```

### Database Optimization

- Regular VACUUM and ANALYZE
- Proper indexing on job tables
- Connection pooling
- Query optimization

## Support

For issues with the cron worker:

1. Check the troubleshooting section above
2. Review logs for error messages
3. Verify environment configuration
4. Test with manual job triggers
5. Check database connectivity

---

**Important**: Always test the worker in a staging environment before deploying to production.
